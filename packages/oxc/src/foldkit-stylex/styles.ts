import type { ESTree } from "@oxlint/plugins";

import { defineRule } from "@oxlint/plugins";

import { exportOf, type Imports, importsOf, keyOf, resolve } from "../rules/imports.ts";

const stylex = "@stylexjs/stylex";

const tokens = "@kutur-kit/foldkit-stylex-theme/tokens.stylex";

const isThemeOverrides = (type: ESTree.TSType, imports: Imports) =>
  type.type === "TSTypeReference" && exportOf(type.typeName, imports, tokens) === "ThemeOverrides";

const setsThemeTokens = (object: ESTree.Node) =>
  object.type === "ObjectExpression" &&
  object.properties.some(
    (property) => property.type === "Property" && keyOf(property)?.startsWith("--fks-"),
  );

export const styles = defineRule({
  meta: {
    type: "problem",
    docs: {
      description:
        "Require theme overrides that a type checks, and styles objects that keep their narrow type.",
    },
    schema: [],
    messages: {
      createTheme:
        "createTheme re-declares every token of its group on the element, so tokens you leave out reset to their defaults, and it never reaches the panels @foldkit/ui portals to <body>. Set single tokens as keys of a style, stylex.create({ x: { [color.accent]: '…' } }), in a part's styles or with sx(...); set app-wide values in a .stylex.ts file with defineVars and --fks-* keys.",
      overrides:
        "Write defineVars({ ... } satisfies ThemeOverrides), with ThemeOverrides from @kutur-kit/foldkit-stylex-theme/tokens.stylex. A misspelt --fks-* name otherwise compiles to a variable no token reads.",
      annotation:
        "Write {{name}} = { ... } satisfies {{type}} instead of annotating it. The annotation widens each part to PartStyle, so XStyle.view can no longer see which properties it sets and stops rejecting the ones @foldkit/ui sets inline.",
    },
  },
  createOnce(context) {
    let imports: Imports = new Map();

    return {
      Program(program) {
        imports = importsOf(program);
      },
      CallExpression(node) {
        const name = exportOf(node.callee, imports, stylex);

        if (name === "createTheme") context.report({ node, messageId: "createTheme" });

        const [vars] = node.arguments;

        if (name !== "defineVars" || vars === undefined) return;

        const checked =
          vars.type === "TSSatisfiesExpression" && isThemeOverrides(vars.typeAnnotation, imports);

        const object = vars.type === "TSSatisfiesExpression" ? vars.expression : vars;

        if (!checked && setsThemeTokens(object)) {
          context.report({ node: vars, messageId: "overrides" });
        }
      },
      VariableDeclarator({ id }) {
        if (id.type !== "Identifier") return;

        const type = id.typeAnnotation?.typeAnnotation;

        if (type?.type !== "TSTypeReference") return;

        const resolved = resolve(type.typeName, imports);

        // `PopoverStyle.Styles` or `ListboxStyle.Multi.Styles`.
        if (
          resolved?.source !== "@kutur-kit/foldkit-stylex" ||
          !/^\w+Style(\.\w+)*\.Styles$/.test(resolved.path)
        ) {
          return;
        }

        context.report({
          node: id,
          messageId: "annotation",
          data: { name: id.name, type: context.sourceCode.getText(type.typeName) },
        });
      },
    };
  },
});
