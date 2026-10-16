import { Context, Effect, Schema } from "effect";

export const Actor = Schema.Struct({
  id: Schema.String,
  kind: Schema.String,
  onBehalfOf: Schema.optionalKey(Schema.String),
});

export type Actor = typeof Actor.Type;

export class CurrentActor extends Context.Reference<Actor | undefined>(
  "@kutur-kit/audit/Audit/CurrentActor",
  { defaultValue: () => undefined },
) {}

export const withActor = (actor: Actor) => Effect.provideService(CurrentActor, actor);

export class Entry extends Schema.Class<Entry>("@kutur-kit/audit/Audit/Entry")({
  /** A UUIDv7, so ids sort by time and a retried write carries the same id. */
  id: Schema.String,
  action: Schema.String,
  outcome: Schema.String,
  reason: Schema.optionalKey(Schema.String),
  target: Schema.optionalKey(Schema.Json),
  details: Schema.optionalKey(Schema.Json),
  actor: Schema.optionalKey(Actor),
  at: Schema.DateTimeUtc,
  traceId: Schema.optionalKey(Schema.String),
  spanId: Schema.optionalKey(Schema.String),
}) {}

export interface RecordOptions {
  /**
   * Write outside the caller's transaction, so the entry survives a rollback.
   * Refusals need this: they fail the request whose transaction stored them.
   */
  readonly isolated: boolean;
}

/**
 * Append-only storage for entries. Implementations must store an entry once
 * per id, return entries by `at`, honour `isolated` and die rather than
 * fail: an action whose entry is not stored must not complete.
 */
export class AuditLog extends Context.Service<
  AuditLog,
  { readonly record: (entry: Entry, options: RecordOptions) => Effect.Effect<void> }
>()("@kutur-kit/audit/Audit/AuditLog") {}
