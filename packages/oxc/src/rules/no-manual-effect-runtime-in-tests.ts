import type { ESTree } from "@oxlint/plugins";

import { defineRule } from "@oxlint/plugins";

import {
  effectMemberOf,
  type Imported,
  type Imports,
  importsOf,
  keyOf,
  resolve,
} from "./imports.ts";
import { variableOf } from "./scope.ts";

// The runners of Effect and of a ManagedRuntime. Effect's `<runner>With` forms take a Context.
const runners = new Set([
  "runCallback",
  "runFork",
  "runPromise",
  "runPromiseExit",
  "runSync",
  "runSyncExit",
]);

const isEffectRunner = (imported: Imported | undefined) =>
  runners.has(effectMemberOf(imported, "Effect")?.replace(/With$/, "") ?? "");

const makesRuntime = (node: ESTree.Node | null, imports: Imports) =>
  node?.type === "CallExpression" &&
  effectMemberOf(resolve(node.callee, imports), "ManagedRuntime") === "make";

export const noManualEffectRuntimeInTests = defineRule({
  meta: {
    type: "problem",
    docs: { description: "Disallow running effects by hand in tests." },
    schema: [],
    messages: {
      manualRuntime:
        "Manual Effect runner `{{runner}}` in a test. It runs the effect on the real clock and outside the test's Layers and scope, so time-based code waits for real time and each test wires its services by hand. Fix: write the test with `it.effect` from `@effect/vitest`, provide services with Layers and control time with `TestClock` from `effect/testing`.",
    },
  },
  createOnce(context) {
    let imports: Imports = new Map();

    // `ManagedRuntime.make(...)`, or a variable it is assigned to, where it is declared or later, as
    // in `beforeAll(() => { runtime = ManagedRuntime.make(layer); })`.
    const isRuntime = (node: ESTree.Expression | null): boolean => {
      if (node?.type !== "Identifier") return makesRuntime(node, imports);

      const references = variableOf(context.sourceCode, node)?.references ?? [];

      return references.some(({ writeExpr }) => makesRuntime(writeExpr, imports));
    };

    const report = (node: ESTree.Node) =>
      context.report({
        node,
        messageId: "manualRuntime",
        data: { runner: context.sourceCode.getText(node) },
      });

    return {
      Program(program) {
        imports = importsOf(program);
      },
      ImportSpecifier(node) {
        if (isEffectRunner(imports.get(node.local.name))) report(node.imported);
      },
      // `const { runPromise } = runtime`.
      VariableDeclarator({ id, init }) {
        if (id.type !== "ObjectPattern" || !isRuntime(init)) return;

        for (const property of id.properties) {
          if (property.type === "Property" && runners.has(keyOf(property) ?? "")) {
            report(property.key);
          }
        }
      },
      MemberExpression(node) {
        if (isEffectRunner(resolve(node, imports))) {
          report(node);

          return;
        }

        const { object, property } = node;

        if (
          !node.computed &&
          property.type === "Identifier" &&
          runners.has(property.name) &&
          isRuntime(object)
        ) {
          report(node);
        }
      },
    };
  },
});
