import type { ESTree } from "@oxlint/plugins";

import { defineRule } from "@oxlint/plugins";

import { type Imported, type Imports, importsOf, resolve } from "./imports.ts";

// The runners of Effect and of a ManagedRuntime. Effect's `<runner>With` forms take a Context.
const runners = new Set([
  "runCallback",
  "runFork",
  "runPromise",
  "runPromiseExit",
  "runSync",
  "runSyncExit",
]);

// The export `imported` names in an Effect module, read from the barrel (`Effect.runSync` from
// "effect") or the module's own path (`runSync` from "effect/Effect").
const memberOf = (imported: Imported | undefined, module: string) => {
  if (imported?.source === `effect/${module}`) return imported.path;

  return imported?.source === "effect" && imported.path.startsWith(`${module}.`)
    ? imported.path.slice(module.length + 1)
    : undefined;
};

const isEffectRunner = (imported: Imported | undefined) =>
  runners.has(memberOf(imported, "Effect")?.replace(/With$/, "") ?? "");

const makesRuntime = (node: ESTree.Node | null, imports: Imports) =>
  node?.type === "CallExpression" &&
  memberOf(resolve(node.callee, imports), "ManagedRuntime") === "make";

export const noManualEffectRuntimeInTests = defineRule({
  meta: {
    type: "problem",
    docs: { description: "Disallow running effects by hand in tests." },
    schema: [],
    messages: {
      manualRuntime:
        "Manual Effect runner `{{runner}}` in a test. It runs the effect on the real clock and outside the test's Layers and scope, so time-based code waits for real time and each test wires its services by hand. Fix: write the test with `it.effect` from `@effect/vitest`, provide services with Layers and control time with `TestClock`.",
    },
  },
  createOnce(context) {
    let imports: Imports = new Map();
    // Names bound to a `ManagedRuntime.make(...)` result in this file.
    let runtimes = new Set<string>();

    const report = (node: ESTree.Node) =>
      context.report({
        node,
        messageId: "manualRuntime",
        data: { runner: context.sourceCode.getText(node) },
      });

    return {
      Program(program) {
        imports = importsOf(program);
        runtimes = new Set();
      },
      ImportSpecifier(node) {
        if (isEffectRunner(imports.get(node.local.name))) report(node.imported);
      },
      VariableDeclarator({ id, init }) {
        if (id.type === "Identifier" && makesRuntime(init, imports)) runtimes.add(id.name);
      },
      MemberExpression(node) {
        if (isEffectRunner(resolve(node, imports))) {
          report(node);

          return;
        }

        const { object, property } = node;

        const isRuntime =
          (object.type === "Identifier" && runtimes.has(object.name)) ||
          makesRuntime(object, imports);

        if (
          isRuntime &&
          property.type === "Identifier" &&
          !node.computed &&
          runners.has(property.name)
        ) {
          report(node);
        }
      },
    };
  },
});
