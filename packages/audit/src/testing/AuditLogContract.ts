import { DateTime, Effect, Predicate, Schema } from "effect";

import * as Audit from "../Audit.ts";
import * as TestAuditLog from "./TestAuditLog.ts";

/**
 * Checks an AuditLog implementation against the guarantees AuditEvent relies
 * on. Provide the implementation with a TestAuditLog reading its storage,
 * and run each case with any test runner.
 */
export interface Case {
  readonly name: string;
  readonly run: Effect.Effect<void, never, Audit.AuditLog | TestAuditLog.TestAuditLog>;
}

const encode = Schema.encodeSync(Schema.Array(Schema.toCodecJson(Audit.Entry)));

// Storage may reorder object keys, as PostgreSQL jsonb does, so keys are compared sorted.
const sorted = (_: string, value: Schema.Json) =>
  Predicate.isObject(value) && !Array.isArray(value)
    ? Object.fromEntries(Object.entries(value).sort(([a], [b]) => (a < b ? -1 : 1)))
    : value;

const expectEntries = (expected: ReadonlyArray<Audit.Entry>) =>
  Effect.flatMap(TestAuditLog.entries, (actual) => {
    const [want, got] = [encode(expected), encode(actual)].map((entries) =>
      JSON.stringify(entries, sorted),
    );

    return want === got
      ? Effect.void
      : Effect.die(new Error(`AuditLog contract violated\nexpected: ${want}\nreceived: ${got}`));
  });

const entry = (id: string, at: string, fields: Partial<Audit.Entry> = {}) =>
  new Audit.Entry({
    id,
    action: "contract.test",
    outcome: "success",
    at: DateTime.makeUnsafe(at),
    ...fields,
  });

// Alternates isolated and joined writes, so every case exercises both.
const record = (...entries: ReadonlyArray<Audit.Entry>) =>
  Effect.flatMap(Audit.AuditLog, (log) =>
    Effect.forEach(entries, (entry, index) => log.record(entry, { isolated: index % 2 === 0 }), {
      discard: true,
    }),
  );

const minimal = entry("0190a5e2-0000-7000-8000-000000000001", "2026-01-01T00:00:00Z");

const complete = entry("0190a5e2-0000-7000-8000-000000000002", "2026-01-01T00:00:01Z", {
  outcome: "Deny",
  reason: "Owners only",
  target: { id: "doc-1", tags: ["a", "b"], size: 3, archived: false, parent: null },
  details: { via: "require", deniedBy: "policy" },
  actor: { id: "token-1", kind: "agent", onBehalfOf: "ada" },
  traceId: "4bf92f3577b34da6a3ce929d0e0e4736",
  spanId: "00f067aa0ba902b7",
});

const other = entry("0190a5e2-0000-7000-8000-000000000003", "2026-01-01T00:00:00Z");

// A JSON null is a value, apart from no target or details.
const nulls = entry("0190a5e2-0000-7000-8000-000000000004", "2026-01-01T00:00:02Z", {
  target: null,
  details: null,
});

export const cases: ReadonlyArray<Case> = [
  {
    name: "returns entries by time with every field as recorded",
    run: Effect.andThen(
      record(complete, nulls, minimal),
      expectEntries([minimal, complete, nulls]),
    ),
  },
  {
    name: "stores an entry once when its write is retried",
    run: Effect.andThen(record(minimal, minimal, other), expectEntries([minimal, other])),
  },
];
