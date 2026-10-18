# @kutur-kit/audit

Typed audit events for Effect. Each kind of event is defined once with schemas for what it is about and what it records. Logging fills in the time, the actor and the trace, keeps secrets out of entries and fails the action when its entry cannot be stored. Storage is a service: PostgreSQL through Drizzle is included.

Tested with Effect 4.0.5.

```sh
pnpm add @kutur-kit/audit@alpha effect
```

## Events

Define an event with an action name and the schemas it records:

```ts
import { AuditEvent } from "@kutur-kit/audit";
import { Schema } from "effect";

import { Invoice, InvoiceId, OrgId } from "./domain.js";

export const InvoiceApproved = AuditEvent.make("invoice.approved", {
  target: Invoice,
  view: Schema.Struct({ id: InvoiceId, orgId: OrgId, amount: Schema.Int }),
});
```

Log it where the action happens. `log` requires an `AuditLog`:

```ts
const approve = (invoice: Invoice) =>
  Effect.gen(function* () {
    // ...
    yield* InvoiceApproved.log({ target: invoice });
  });
```

| Option     | Meaning                                                                                       |
| ---------- | --------------------------------------------------------------------------------------------- |
| `target`   | The schema of the value the event is about.                                                   |
| `view`     | What to record of the target: a schema or `false` for nothing. By default, its marked fields. |
| `details`  | A schema for further data, encoded as JSON. `undefined` details are not recorded.             |
| `outcomes` | The outcomes `log` accepts, such as `["Allow", "Deny"]`. Without them every event succeeds.   |
| `isolated` | Write outside the caller's transaction. See [Storage](#storage).                              |

`log` takes exactly what the definition declares: the target, the details and an outcome, plus an optional `reason`.

Each entry records:

| Field               | Source                                                                   |
| ------------------- | ------------------------------------------------------------------------ |
| `id`                | A UUIDv7, from the `Crypto` service if one is provided, else Web Crypto. |
| `action`, `outcome` | The definition and `log`.                                                |
| `reason`            | `log`.                                                                   |
| `target`, `details` | The target through its view, and the details, as JSON.                   |
| `actor`             | The actor set with `Audit.withActor`, if any.                            |
| `at`                | Effect's `Clock`.                                                        |
| `traceId`, `spanId` | The current span, if any.                                                |

Set the actor once per request, where the caller is known:

```ts
handler.pipe(Audit.withActor({ id: token.id, kind: "agent", onBehalfOf: user.id }));
```

## What is recorded

Mark the fields that identify a value, such as ids, with `AuditKey.key`:

```ts
import { AuditKey } from "@kutur-kit/audit";

export const InvoiceId = Schema.String.pipe(Schema.brand("InvoiceId"), AuditKey.key);
```

Without a `view`, an event records only the marked fields of its target, found through structs, classes, arrays, unions and optional fields. A target with no marked fields records nothing. `AuditKey` is a separate module without the rest of the package, so shared domain schemas can import it.

`Redacted` values are never recorded:

- Marked `Redacted` fields are left out of the default view.
- `AuditEvent.make` rejects explicit views and details schemas that contain `Redacted`, including in `Record` values.
- Before encoding, `log` dies if a `Redacted` value would still be recorded, for shapes the definition check does not inspect such as `Schema.suspend` or `Schema.Unknown` fields.

## Storage

`Audit.AuditLog` stores entries. An implementation must:

- store an entry once per `id`, so retried writes do not duplicate it;
- return entries ordered by `at`, with every field as recorded;
- write `isolated` entries outside the caller's transaction, so they survive its rollback, and other entries inside it, so they commit with the action;
- die rather than fail, so an action whose entry is not stored does not complete.

### PostgreSQL with Drizzle

`@kutur-kit/audit/drizzle/postgres` stores entries in a table you include in your Drizzle schema, so your migrations create it:

```ts
import * as AuditPostgres from "@kutur-kit/audit/drizzle/postgres";

export const auditEntries = AuditPostgres.auditEntries("audit_entries");

export const AuditLogLive = AuditPostgres.layer(database, auditEntries);
```

`database` is a Drizzle Effect PostgreSQL database such as one from `drizzle-orm/effect-postgres`. Entries without `isolated` join the caller's `withTransaction`. Isolated entries run on their own pooled connection, so the client needs more than one connection.

The table has a column for each field, with `jsonb` for the target and details. It is indexed by time, by action and by actor.

### Testing

`@kutur-kit/audit/testing` provides `TestAuditLog.layer`, an in-memory `AuditLog` whose `TestAuditLog.entries` returns what was recorded. `AuditLogContract.cases` checks any `AuditLog` implementation against the requirements above. Provide the implementation together with a `TestAuditLog` service that reads entries back from its storage:

```ts
const reader = TestAuditLog.TestAuditLog.of({ entries: readEntriesFromStorage });

for (const { name, run } of AuditLogContract.cases)
  it.effect(name, () =>
    run.pipe(
      Effect.provide(Layer.merge(AuditLogLive, Layer.succeed(TestAuditLog.TestAuditLog, reader))),
    ),
  );
```

The isolation and failure requirements depend on the database, so test them against it directly.

## Requirements

- `effect` 4.0.5 or later 4.x.
- `@kutur-kit/audit/drizzle/postgres` needs `drizzle-orm` 1.0.0-rc.4, patched for Effect 4. Copy [`drizzle-orm@1.0.0-rc.4.patch`](https://github.com/kutur-labs/kit/blob/main/patches/drizzle-orm@1.0.0-rc.4.patch) into your project and register it in `pnpm-workspace.yaml`:

  ```yaml
  patchedDependencies:
    drizzle-orm@1.0.0-rc.4: patches/drizzle-orm@1.0.0-rc.4.patch
  ```

  Drizzle's own declarations do not type-check with `skipLibCheck: false`.

## Limitations

- The storage adapter supports PostgreSQL only.
- Isolated writes need a client with a connection pool. Single-connection clients, such as PGlite, wait for the open transaction and deadlock.
- The definition check does not follow `Schema.suspend`. Recursive views are only stopped when a `Redacted` value is logged.
- Entries are written one at a time while the action waits. There is no batching or outbox.
