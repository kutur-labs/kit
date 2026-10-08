# Kutur Kit

Composable, Effect-native building blocks for modern applications.

**Kutur Kit** is an open-source collection of general-purpose TypeScript libraries developed by Kutur Labs.

Built around Effect, with an emphasis on type safety, composability, extensibility, infrastructure independence, and excellent developer experience.

- **GitHub:** `kutur-labs/kit`
- **npm:** `@kutur-kit/*`
- **Documentation:** `kit.kuturlabs.com`
- **License:** MIT

## Philosophy

- **Effect-native** — Built using Effect services, Layers, Schema, and typed errors.
- **Composable** — Every component works independently or alongside others.
- **Infrastructure-agnostic** — No mandatory database, hosting provider, or runtime.
- **Swappable persistence** — Memory, SQLite, PostgreSQL, and specialized adapters.
- **Minimal abstractions** — Extend Effect rather than reinvent its primitives.
- **Application-scoped** — No global identity, tenancy, or application registry.
- **Infrastructure as code** — Optional composable Alchemy integrations.
- **Developer-first** — Strong inference, minimal boilerplate, and predictable APIs.
- **Open-source first** — Libraries should be useful independently of Kutur Labs.

## Packages

### `@kutur-kit/auth`

Authentication and authorization built around [Yielded Auth](https://github.com/yielded-dev/auth).

- Native Yielded Auth integration.
- Application-defined identities, permissions, and policies.
- Type-safe, resource-level authorization.
- Support for users, services, and AI agents.
- Human approval and permission escalation workflows.
- Durable approval requests and resumable authorization.
- HTTP and workflow integrations.
- Pluggable approval persistence.
- No mandatory shared account or user model.

#### Authorization model

Authorization decisions should support three outcomes:

- **Allow** — Execute the requested operation.
- **Deny** — Reject the operation.
- **Require approval** — Create a durable authorization request.

Approval requests authorize specific operations rather than granting permanent permissions.

For HTTP requests, pending authorization should return immediately with an operation reference.

For durable workflows, execution should suspend until authorization is resolved.

Authorization must be revalidated before execution.

### `@kutur-kit/actions`

Type-safe actions with authorization and durable execution.

- Application-scoped action definitions and registries.
- Schema-validated inputs and outputs.
- Idempotent execution, retries, and recovery.
- Integration with `@kutur-kit/auth`.
- Immediate HTTP responses for pending operations.
- Durable workflow execution and approval waiting.
- Pluggable persistence and workflow engines.
- No global action registry or application identifiers in payloads.

#### Execution model

Actions should support both immediate and durable execution.

```text
Action Request
      │
      ▼
Authorization
      │
      ├── Allowed ──────────────► Execute
      │
      ├── Denied ───────────────► Reject
      │
      └── Approval Required
                  │
                  ├── HTTP → Return pending operation
                  │
                  └── Workflow → Suspend durably
                                      │
                                      ▼
                                Approval Resolved
                                      │
                                      ▼
                              Revalidate & Execute
```

Approvals, execution state, and operation inputs must be persisted independently.

Workflow integrations should support durable waiting without holding open HTTP requests or database transactions.

### `@kutur-kit/audit`

Effect-native auditing, change tracking, and event history.

- Typed, application-defined audit events.
- Field-level before/after change tracking.
- User, service, and AI-agent attribution.
- Initiator, executor, and approver tracking.
- Action and approval correlation.
- Transactional database mutation auditing.
- Append-only event history.
- Querying by resource, actor, event type, and time.
- Optional database-level change capture.
- Memory, SQLite, PostgreSQL, and custom storage adapters.
- Integration with `@kutur-kit/auth` and `@kutur-kit/actions`.

#### Audit events

Audit events should capture:

- What happened.
- Which resource changed.
- Previous and new values.
- Who initiated and performed the change.
- Who approved the operation, when applicable.
- When the change occurred.
- Related action, approval, and correlation identifiers.

Audit context should be supplied through Effect services and populated from trusted authentication or execution contexts.

#### Transactional auditing

Audit events should be recorded atomically with business mutations.

```text
BEGIN TRANSACTION
  UPDATE business_record
  INSERT audit_event
COMMIT
```

The audit event must represent the actual committed mutation.

Avoid recording sensitive fields, credentials, or unnecessary database snapshots.

#### Transactional outbox

Support optional asynchronous event delivery through the transactional outbox pattern.

```text
Application
    │
    ▼
Database Transaction
    ├── Business Mutation
    └── Audit Event
    │
    ▼
  COMMIT
    │
    ▼
Outbox Publisher
    │
    ▼
Message Queue
    │
    ▼
Background Consumers
    ├── Activity Feeds
    ├── Notifications
    ├── Analytics
    └── External Integrations
```

Principles:

- The audit event is the authoritative, durable record.
- Audit events can serve as the source for asynchronous publishing.
- Event data remains immutable; delivery state is managed separately.
- Queue publishing happens after transaction commit.
- Delivery must support retries and duplicate handling.
- Consumers must be idempotent.
- Queue infrastructure is optional.
- Direct transactional auditing works without additional services.
- Alchemy may provision Cloudflare Queues and associated Workers.

Do not introduce a standalone outbox package prematurely.

Extract `@kutur-kit/outbox` only when multiple libraries need the same abstraction.

### `@kutur-kit/cdn`

Composable resource storage and delivery.

- Multiple public and private buckets.
- Typed resource definitions and references.
- Multiple MIME types, formats, and extensions.
- Upload, download, and delivery abstractions.
- Optional transformation integrations.
- Authorization for protected resources.
- Immutable resource versioning and configurable caching policies.
- Swappable object storage implementations.
- Composable Alchemy infrastructure.

#### Storage adapters

- **Memory** — Testing, mocking, and rapid prototyping.
- **SQLite** — Local development and persistent object storage.
- **Cloudflare R2** — Production object storage and CDN delivery.
- **Custom** — User-provided implementations through Effect Layers.

SQLite should support storing object metadata and binary contents using Drizzle and SQLite BLOB columns.

Object storage and public delivery must remain separate abstractions.

Memory and SQLite adapters should support local HTTP delivery without requiring Cloudflare.

R2 integrations should support composable Cloudflare infrastructure through Alchemy.

#### Package exports

```text
@kutur-kit/cdn
@kutur-kit/cdn/memory
@kutur-kit/cdn/drizzle/sqlite
@kutur-kit/cdn/r2
@kutur-kit/cdn/alchemy
@kutur-kit/cdn/testing
```

### `@kutur-kit/oxc`

Shared Oxlint and Oxfmt configurations.

- Strict TypeScript linting.
- Effect-specific conventions and rules.
- React and React Hooks integration.
- TanStack Query, Router, and Start integration.
- Composable lint presets.
- Type-aware linting where supported.
- Consistent formatting and import sorting.
- Minimal reliance on ESLint or Prettier.

Presets should be independently composable.

The package should remain usable without Effect or React dependencies when their respective presets are not enabled.

### `@kutur-kit/tsconfig`

Reusable, strict TypeScript configurations.

#### Presets

- `base.json` — Strict TypeScript defaults.
- `effect.json` — Effect-specific TypeScript configuration.
- `library.json` — Published TypeScript libraries.
- `node.json` — Node.js applications.
- `bun.json` — Bun applications.
- `cloudflare.json` — Cloudflare Workers.
- `react.json` — React applications.
- `tanstack-start.json` — TanStack Start applications.

#### Effect configuration

- Strict TypeScript settings.
- `exactOptionalPropertyTypes`.
- `noUncheckedIndexedAccess`.
- Compatible module resolution.
- Effect Language Service integration.
- Sensible defaults for Effect type inference.

Presets should be composable and Effect-first.

## Architecture

Every runtime library should follow consistent conventions:

- **Core** — Contracts, services, schemas, errors, and reusable logic.
- **Adapters** — Swappable implementations provided through Effect Layers.
- **Integrations** — Optional Drizzle, Alchemy, HTTP, and other integrations.
- **Testing** — In-memory implementations and adapter conformance tests.

Example package exports:

```text
@kutur-kit/actions
@kutur-kit/actions/memory
@kutur-kit/actions/drizzle/sqlite
@kutur-kit/actions/drizzle/postgres
@kutur-kit/actions/alchemy
@kutur-kit/actions/testing
```

Not every package requires every integration.

Avoid unnecessary wrappers around native Effect functionality.

## Persistence

- Libraries define their own storage contracts.
- Applications provide implementations through Effect Layers.
- Memory adapters enable tests, examples, and rapid prototyping.
- SQLite supports lightweight local development.
- PostgreSQL supports production workloads where appropriate.
- Cloudflare R2 supports production object storage.
- Custom storage adapters are supported.
- Drizzle integrations expose schema and table factories.
- Applications own migration generation and execution.
- No hidden migrations or automatic database creation.
- Adapters must preserve their documented consistency guarantees.

Follow the persistence patterns established by Yielded Auth and effect-mq.

Prefer zero-infrastructure development experiences.

Storage interfaces should be domain-specific rather than generic CRUD abstractions.

## Authentication & Authorization

- Authentication is application-owned and powered by Yielded Auth.
- Each application defines its own identities, accounts, and sessions.
- Permissions and policies are independently defined per application.
- Authorization supports humans, services, and AI agents.
- Actions may be allowed, denied, or require approval.
- Approval requests authorize specific operations, not permanent permissions.
- HTTP requests return immediately when authorization is pending.
- Durable workflows suspend and resume when authorization is resolved.
- Approval and execution states are persisted independently.
- Execution remains idempotent and revalidates authorization.
- No organization-wide identity platform is required.

## Infrastructure

Alchemy integrations should:

- Expose reusable, composable infrastructure components.
- Support existing infrastructure resources.
- Provide Effect Layers and runtime bindings.
- Keep deployment configuration separate from application logic.
- Work with application-provided persistence.
- Support independent deployments and environments.
- Never be required for core library functionality.

Infrastructure permissions and application-level authorization must remain separate.

## Monorepo

```text
kit/
├── packages/
│   ├── auth/
│   ├── actions/
│   ├── audit/
│   ├── cdn/
│   ├── oxc/
│   └── tsconfig/
├── examples/
│   ├── auth/
│   ├── actions/
│   ├── approvals/
│   ├── audit/
│   └── cdn/
├── apps/
│   └── docs/
├── tooling/
├── .changeset/
├── .github/
│   └── workflows/
├── package.json
├── pnpm-workspace.yaml
├── turbo.json
└── pnpm-lock.yaml
```

## Tooling

- **pnpm** — Package management and workspaces.
- **Turborepo** — Task orchestration, caching, and monorepo builds.
- **TypeScript** — Strict typing and compiler checks.
- **Effect** — Application primitives and dependency management.
- **Effect Language Service** — Effect-specific diagnostics and editor tooling.
- **Drizzle** — Database schemas and persistence integration.
- **Alchemy** — Optional infrastructure provisioning.
- **Oxlint** — Linting and static analysis.
- **Oxfmt** — Formatting and import organization.
- **Vitest** — Unit and integration testing.
- **Changesets** — Independent package versioning.
- **GitHub Actions** — CI/CD.
- **npm** — Public package registry.
- **npm Trusted Publishing** — OIDC-based publishing and provenance.

## Publishing

- Publish public packages under `@kutur-kit/*`.
- Use independent package versioning.
- Use Changesets for releases and changelogs.
- Automate publishing through GitHub Actions.
- Prefer npm Trusted Publishing over long-lived tokens.
- Publish TypeScript declarations and documented subpath exports.
- Keep dependencies minimal.
- Use peer dependencies for shared ecosystem packages where appropriate.
- Maintain examples and compatibility tests.

## Repository & Namespace Conventions

- `kutur-labs/kit` — Public, general-purpose Effect libraries.
- `kutur-labs/kutur-labs` — Private organization monorepo.
- `@kutur-kit/*` — Public Kutur Kit packages.
- `@kutur/*` — Kutur-specific technology.
- `@kutur-labs/*` — Internal organization packages.

## Boundaries

Kutur Kit contains general-purpose libraries only.

Domain-specific systems such as commerce, KTR, pattern generation, manufacturing, and clothing infrastructure belong in separate repositories.

Applications own their accounts, business policies, domain schemas, deployment configurations, and workflows.

Libraries must not assume applications are related or share infrastructure.

## Initial Roadmap

1. Initialize the pnpm + Turborepo monorepo.
2. Configure strict TypeScript and Effect Language Service.
3. Create `@kutur-kit/tsconfig` with Effect-first presets.
4. Create `@kutur-kit/oxc` with Oxlint and Oxfmt presets.
5. Configure Vitest, Changesets, and GitHub Actions.
6. Establish package architecture, exports, and adapter conventions.
7. Implement `@kutur-kit/auth` with Yielded Auth integration.
8. Implement `@kutur-kit/actions` with in-memory persistence.
9. Add Drizzle SQLite and PostgreSQL adapters.
10. Implement durable approvals and Alchemy workflow integration.
11. Implement `@kutur-kit/audit` with transactional change tracking.
12. Add optional outbox publishing and asynchronous audit consumers.
13. Implement `@kutur-kit/cdn` with memory and SQLite adapters.
14. Add Cloudflare R2 and Alchemy integrations for CDN.
15. Add examples, integration tests, and documentation.
16. Publish initial packages to npm using trusted publishing.

## Guiding Principle

Build small, independent, composable libraries that feel like natural extensions of Effect.

**Everything should work independently, and everything should compose.**
