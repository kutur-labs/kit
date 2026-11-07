import * as Arr from "effect/Array";
import * as Context from "effect/Context";
import * as DateTime from "effect/DateTime";
import * as Effect from "effect/Effect";
import * as Layer from "effect/Layer";

import * as Audit from "../Audit.ts";

/** Reads stored entries back, by `at`; AuditLogContract runs against it. */
export class TestAuditLog extends Context.Service<
  TestAuditLog,
  { readonly entries: Effect.Effect<ReadonlyArray<Audit.Entry>> }
>()("@kutur-kit/audit/testing/TestAuditLog") {}

export const layer: Layer.Layer<Audit.AuditLog | TestAuditLog> = Layer.effectContext(
  Effect.sync(() => {
    const recorded = new Map<string, Audit.Entry>();

    return Context.make(
      Audit.AuditLog,
      Audit.AuditLog.of({
        record: (entry) =>
          Effect.sync(() => {
            if (!recorded.has(entry.id)) recorded.set(entry.id, entry);
          }),
      }),
    ).pipe(
      Context.add(
        TestAuditLog,
        TestAuditLog.of({
          entries: Effect.sync(() =>
            Arr.sortWith([...recorded.values()], (e) => e.at, DateTime.Order),
          ),
        }),
      ),
    );
  }),
);

export const entries: Effect.Effect<
  ReadonlyArray<Audit.Entry>,
  never,
  TestAuditLog
> = Effect.flatMap(TestAuditLog, (log) => log.entries);
