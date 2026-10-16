# @kutur-kit/access

Permissions for Effect, defined as services. Each permission declares what it decides about, and its policy is a Layer. Checks are typed and traced, can be restricted per caller (for example to an agent token's scopes) and can be audited. A permission can also describe the targets it allows as a condition for list queries.

Tested with Effect 4.0.2.

```sh
pnpm add @kutur-kit/access effect
```

## Permissions

Define a permission with a key, an optional public `id` and the schema of its `target`. Declare the services its policy may read with `requires`:

```ts
import { Permission } from "@kutur-kit/access";
import { Schema } from "effect";

import { CurrentUser, Invoice, MembershipUnavailable } from "./domain.js";

export class ViewInvoice extends Permission.Service<ViewInvoice, { requires: CurrentUser }>()(
  "billing/ViewInvoice",
  { id: "invoices.view", target: Invoice, error: MembershipUnavailable },
) {}
```

The definition holds only schemas, so it can be shared with clients. Implement the policy with `toLayer`, usually in server-only code. A policy returns a `Decision`, directly or as an Effect, and may read the services declared in `requires`:

```ts
import { Decision } from "@kutur-kit/access";
import { Effect, Option } from "effect";

export const ViewInvoiceLayer = ViewInvoice.toLayer(
  Effect.gen(function* () {
    const memberships = yield* Memberships;

    return Effect.fn(function* (invoice) {
      const user = yield* CurrentUser;
      const role = yield* memberships.roleIn(user.id, invoice.orgId);

      return Option.isSome(role) ? Decision.allow() : Decision.deny();
    });
  }),
);
```

Services the Layer reads while it is built, such as `Memberships`, are requirements of the Layer. Services read inside the policy, such as `CurrentUser`, are requirements of every check.

| Method                        | Result                                                         |
| ----------------------------- | -------------------------------------------------------------- |
| `ViewInvoice.check(target)`   | The `Decision`. Fails only with the policy's own errors.       |
| `ViewInvoice.require(target)` | Succeeds when allowed; otherwise fails with `Decision.Denied`. |

Both are also available on the service itself (`const view = yield* ViewInvoice`), which is how other services and policies capture a permission when their Layer is built. A permission without a `target` takes no arguments.

`Decision.Denied` carries the refusing permission's `id` and encodes with HTTP status 403. Each permission's `Denied` schema matches only its own refusals, so a caller can treat one refusal differently:

```ts
yield *
  approvePayout
    .require(invoice)
    .pipe(Effect.catchIf(Schema.is(ViewInvoice.Denied), () => Effect.fail(new InvoiceNotFound())));
```

### Decisions

| Constructor                  | Meaning                                                     |
| ---------------------------- | ----------------------------------------------------------- |
| `Decision.allow()`           | Allowed.                                                    |
| `Decision.deny(reason?)`     | Refused by the policy.                                      |
| `Decision.restricted()`      | Refused by the caller's restriction, before the policy ran. |
| `Decision.unmet(permission)` | Refused because a permission the policy required refused.   |

`Deny.by` tells these apart: `"policy"`, `"restriction"` or `"requirement"`.

### Permissions that require others

A policy can require another permission. Declare that permission's refusals in `error`:

```ts
export class ApprovePayout extends Permission.Service<ApprovePayout, { requires: CurrentUser }>()(
  "billing/ApprovePayout",
  {
    id: "payouts.approve",
    target: Invoice,
    error: Schema.Union([ViewInvoice.Denied, MembershipUnavailable]),
  },
) {}

export const ApprovePayoutLayer = ApprovePayout.toLayer(
  Effect.gen(function* () {
    const view = yield* ViewInvoice;

    return Effect.fn(function* (invoice) {
      yield* view.require(invoice);
      // ...
    });
  }),
).pipe(Layer.provide(ViewInvoiceLayer));
```

When the required permission refuses, `check` answers `Decision.unmet("invoices.view")` and `require` fails with the required permission's refusal, so callers can still tell which one refused. Refusals never appear in a check's error type.

## Restrictions

Restrict the permissions a caller may use, for example to the scopes of an agent token. Every other permission refuses with `Decision.restricted()`, and restrictions only narrow when nested:

```ts
program.pipe(Permission.restrictTo([ViewInvoice, ApprovePayout]));
```

To store scopes, define the set of permissions a token may hold. Its schema decodes stored ids and drops ids of permissions that no longer exist:

```ts
export const AgentScopes = Permission.set([ViewInvoice, ApprovePayout]);

const scopes = yield * Schema.decodeEffect(AgentScopes.schema)(token.scopes);
yield * program.pipe(AgentScopes.restrictTo(scopes));
```

Ids name permissions outside the code, so `Permission.set` rejects duplicates. Restrictions hold service keys, so two permissions that share an id still restrict separately.

## Lists

Checking every row of a list one by one runs the policy, and its lookups, once per row. A `PermissionFilter` instead states the permission's rule as a `Condition` that a query applies, so a list is one query and pages stay complete:

```ts
import { PermissionFilter } from "@kutur-kit/access";

export class ViewInvoiceFilter extends PermissionFilter.Service<ViewInvoiceFilter>()(ViewInvoice) {}

export const ViewInvoiceFilterLayer = ViewInvoiceFilter.toLayer(
  Effect.gen(function* () {
    const memberships = yield* Memberships;

    return Effect.fn(function* (where) {
      const user = yield* CurrentUser;

      return where.oneOf("orgId", yield* memberships.orgsOf(user.id));
    });
  }),
);
```

The filter takes its target, errors and requirements from the permission, which must have a target. Name it after the permission: its key is the permission's key with `/Filter`. Outside the caller's restriction its condition matches nothing.

`where` builds conditions over the target's fields: `eq`, `oneOf`, `and`, `or`, `not`, `all` and `none`. Fields and values are checked against the target's type. `Condition.matches(condition, target)` evaluates a condition in memory.

### PostgreSQL with Drizzle

`@kutur-kit/access/drizzle/postgres` translates a condition into a `where` clause:

```ts
import * as Drizzle from "@kutur-kit/access/drizzle/postgres";

const viewInvoiceFilter = yield * ViewInvoiceFilter;

const page =
  yield *
  database
    .select()
    .from(invoices)
    .where(
      and(Drizzle.where(invoices, yield * viewInvoiceFilter.condition), gt(invoices.id, cursor)),
    )
    .orderBy(invoices.id)
    .limit(100);
```

The query selects exactly the rows `Condition.matches` accepts, including rows with `NULL` values. To keep that true, only columns whose SQL equality matches JavaScript's are accepted: `text`, `varchar`, enums, `uuid`, `smallint`, `integer`, `bigint`, `boolean`, `real` and `double precision`. `numeric`, `char`, `citext` and other custom types are rejected, and `uuid` values must be lowercase and canonical. `oneOf` sends its values as one array parameter, however many there are.

Pagination is the query's own: the condition combines with a cursor as above, or with `LIMIT` and `OFFSET`.

### Keeping filters and policies in agreement

A filter and its policy state the same rule twice. `PermissionTesting.assertFilterAgrees` from `@kutur-kit/access/testing` dies on the first target where they disagree:

```ts
yield * PermissionTesting.assertFilterAgrees(ViewInvoice, ViewInvoiceFilter, invoices);
```

Run it in tests for each kind of user over representative targets.

## Audit

`@kutur-kit/access/audit` records a permission's decisions with [`@kutur-kit/audit`](https://github.com/kutur-labs/kit/tree/main/packages/audit):

```ts
import * as PermissionAudit from "@kutur-kit/access/audit";

export const ApprovePayoutLayer = ApprovePayout.toLayer(policy).pipe(
  PermissionAudit.record(ApprovePayout, {
    view: Schema.Struct({ id: InvoiceId, orgId: OrgId, amount: Schema.Int }),
  }),
);
```

Every `require` records an audit event named by the permission's id, with outcome `Allow` or `Deny`, the policy's reason and details of what refused. Checks only answer questions and are not recorded, nor are the requires their policies make. Writes are isolated from the caller's transaction, so refusals stay recorded when the request rolls back. The recorded Layer requires an `AuditLog`.

`view` chooses what is recorded of the target, as for any audit event. Without it, the fields marked with `AuditKey.key` are recorded.

## Tracing

Checks run in spans named `<key>.check` and `<key>.require`, and conditions in `<key>/Filter.condition`. Spans carry `access.permission`, `access.decision`, `access.denied_by`, `access.reason` and `access.requirement`.

`Permission.tap(f)` returns a permission service that also runs `f` after each decision, for other kinds of recording.

## Requirements

- `effect` 4.0.2 or later 4.x.
- `@kutur-kit/access/audit` needs `@kutur-kit/audit`.
- `@kutur-kit/access/drizzle/postgres` needs `drizzle-orm` 1.0.0-rc.4 with the Effect 4 patch described in the [`@kutur-kit/audit` README](https://github.com/kutur-labs/kit/tree/main/packages/audit#requirements).

## Limitations

- Conditions compare fields with values. They have no ranges, patterns, date fields, optional or nested fields and no conditions over other tables, so lists such as shared ids are passed as values.
- `Drizzle.where` needs a comparable column for every field of the target a condition could compare, even unused ones. Map columns with an object when the table's names differ.
- The SQL translation supports PostgreSQL only.
- Each `eq` and `oneOf` is one statement parameter, and the PostgreSQL driver sends at most 32,767. Prefer `oneOf` over many `eq`s.
- Translation and evaluation recurse once per level of nesting. SQL translation overflows the stack below 2,000 levels.
- Nothing enforces that a filter agrees with its policy except `assertFilterAgrees` in tests.
