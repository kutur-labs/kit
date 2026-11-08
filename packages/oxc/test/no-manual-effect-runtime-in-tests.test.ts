import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import { test } from "node:test";
import { fileURLToPath } from "node:url";

const cases = [
  {
    file: "test/effect.ts",
    code: `import { Effect } from "effect";

const program = Effect.succeed(1);

export const runs = [
  Effect.runPromise(program),
  Effect.runPromiseExit(program),
  Effect.runSync(program),
  Effect.runSyncExit(program),
  Effect.runFork(program),
  Effect.runCallback(program),
];
`,
    errors: 6,
  },
  {
    file: "src/with-context.test.ts",
    code: `import { Context } from "effect";
import * as Effect from "effect/Effect";
import { runSync as run } from "effect/Effect";

export const promise = Effect.runPromiseWith(Context.empty())(Effect.succeed(1));
export const value = run(Effect.succeed(1));
`,
    errors: 2,
  },
  {
    file: "src/barrel.spec.ts",
    code: `import * as Effect from "effect";

export const value = Effect.Effect.runSync(Effect.Effect.succeed(1));
`,
    errors: 1,
  },
  {
    file: "tests/managed-runtime.ts",
    code: `import { Effect, Layer, ManagedRuntime } from "effect";

const runtime = ManagedRuntime.make(Layer.empty);

export const runs = [
  runtime.runPromise(Effect.succeed(1)),
  runtime.runSync(Effect.succeed(1)),
  ManagedRuntime.make(Layer.empty).runFork(Effect.succeed(1)),
];
export const disposed = runtime.dispose();
`,
    errors: 3,
  },
  {
    file: "src/effect-test.test.ts",
    code: `import { it } from "@effect/vitest";
import { Effect, TestClock } from "effect";

// A runner on something other than Effect or a ManagedRuntime is not this rule's business.
const pool = { runPromise: (task: string) => Promise.resolve(task) };

it.effect("advances time", () => TestClock.adjust("1 second").pipe(Effect.andThen(Effect.void)));

export const task = pool.runPromise("task");
`,
    errors: 0,
  },
  {
    file: "src/main.ts",
    code: `import { Effect } from "effect";

export const result = Effect.runPromise(Effect.succeed(1));
`,
    errors: 0,
  },
];

await test("effect rejects manual Effect runners in test files only", (context) => {
  const directory = mkdtempSync(join(tmpdir(), "kit-effect-runner-"));
  context.after(() => rmSync(directory, { recursive: true, force: true }));

  const config = join(directory, "oxlint.config.ts");
  const modulePath = fileURLToPath(new URL("../src/effect.ts", import.meta.url));

  writeFileSync(
    config,
    `import preset from ${JSON.stringify(modulePath)};\nexport default preset;\n`,
  );

  const files = cases.map(({ file, code }) => {
    const path = join(directory, file);

    mkdirSync(dirname(path), { recursive: true });
    writeFileSync(path, code);

    return path;
  });

  const result = spawnSync(
    "pnpm",
    [
      "exec",
      "effect-tsgo",
      "--tsrs-lint",
      "oxlint",
      "--config",
      config,
      "--format",
      "unix",
      ...files,
    ],
    { encoding: "utf8" },
  );

  const output = result.stdout + result.stderr;

  for (const { file, errors } of cases) {
    const diagnostics = output
      .split("\n")
      .filter(
        (line) =>
          line.startsWith(join(directory, file)) &&
          line.includes("kit(no-manual-effect-runtime-in-tests)"),
      );

    assert.equal(diagnostics.length, errors, `${file}: ${output}`);
  }

  assert.match(output, /Manual Effect runner `Effect\.runPromise` in a test\./);
  assert.match(output, /Manual Effect runner `runtime\.runSync` in a test\./);
});
