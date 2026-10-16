import { it } from "@effect/vitest";
import { Context, Effect, Exit, Layer } from "effect";
import { expect } from "vitest";

import * as Audit from "../src/Audit.ts";
import { AuditLogContract, TestAuditLog } from "../src/testing/index.ts";

for (const { name, run } of AuditLogContract.cases)
  it.effect(`TestAuditLog ${name}`, () => run.pipe(Effect.provide(TestAuditLog.layer)));

it.effect("fails logs that store retried entries twice or ignore time order", () =>
  Effect.gen(function* () {
    const appending = Layer.effectContext(
      Effect.sync(() => {
        const recorded: Array<Audit.Entry> = [];

        return Context.make(Audit.AuditLog, {
          record: (entry) =>
            Effect.sync(() => {
              recorded.push(entry);
            }),
        }).pipe(
          Context.add(TestAuditLog.TestAuditLog, { entries: Effect.sync(() => [...recorded]) }),
        );
      }),
    );

    for (const { run } of AuditLogContract.cases)
      expect(Exit.isFailure(yield* run.pipe(Effect.provide(appending), Effect.exit))).toBe(true);
  }),
);
