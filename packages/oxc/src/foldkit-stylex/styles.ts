import type { ESTree } from "@oxlint/plugins";

import { defineRule } from "@oxlint/plugins";

import { exportOf, type Imports, importsOf, isMethodCall, keyOf } from "../rules/imports.ts";

const stylex = "@stylexjs/stylex";

const tokens = "@kutur-kit/foldkit-stylex-theme/tokens.stylex";

// The prefix of the custom properties the theme's tokens read at :root.
const tokenProperty = "--fks-";

const isThemeOverrides = (type: ESTree.TSType, imports: Imports) =>
  type.type === "TSTypeReference" && exportOf(type.typeName, imports, tokens) === "ThemeOverrides";

// A styles type, such as `PopoverStyle.Styles`.
const isStyles = (type: ESTree.TSType, imports: Imports): type is ESTree.TSTypeReference =>
  type.type === "TSTypeReference" &&
  /^\w+Style\.Styles$/.test(exportOf(type.typeName, imports, "@kutur-kit/foldkit-stylex") ?? "");

// The element type of an array type: `X[]`, `readonly X[]`, `Array<X>` or `ReadonlyArray<X>`.
const elementOf = (type: ESTree.TSType): ESTree.TSType | undefined => {
  if (type.type === "TSArrayType") return type.elementType;

  if (type.type === "TSTypeOperator") {
    return type.operator === "readonly" ? elementOf(type.typeAnnotation) : undefined;
  }

  return type.type === "TSTypeReference" &&
    type.typeName.type === "Identifier" &&
    (type.typeName.name === "Array" || type.typeName.name === "ReadonlyArray")
    ? type.typeArguments?.params[0]
    : undefined;
};

// The expression under the `as`, `satisfies` and `<T>` assertions around it.
const asserted = (node: ESTree.Expression): ESTree.Expression =>
  node.type === "TSAsExpression" ||
  node.type === "TSSatisfiesExpression" ||
  node.type === "TSTypeAssertion"
    ? asserted(node.expression)
    : node;

const setsThemeTokens = (object: ESTree.Node) =>
  object.type === "ObjectExpression" &&
  object.properties.some(
    (property) => property.type === "Property" && keyOf(property)?.startsWith(tokenProperty),
  );

export const styles = defineRule({
  meta: {
    type: "problem",
    docs: {
      description:
        "Require theme overrides that a type checks and that reach the tokens, and styles objects that keep their narrow type.",
    },
    schema: [],
    messages: {
      createTheme:
        "createTheme re-declares every token of its group on the element, so tokens you leave out reset to their defaults, and it never reaches the panels @foldkit/ui portals to <body>. Set single tokens as keys of a style, stylex.create({ x: { [color.accent]: '…' } }), in a part's styles or with sx(...); set app-wide values in a .stylex.ts file with defineVars and --fks-* keys.",
      overrides:
        "Write defineVars({ ... } satisfies ThemeOverrides), with ThemeOverrides from @kutur-kit/foldkit-stylex-theme/tokens.stylex. A misspelt --fks-* name otherwise compiles to a variable no token reads; `as ThemeOverrides` does not check names.",
      elementToken:
        "'{{key}}' changes nothing on an element: the tokens read it once, at :root. Set the token itself as a key of a static style, { [color.accent]: '…' } with color from @kutur-kit/foldkit-stylex-theme/tokens.stylex; for a runtime value, write { [color.accent]: 'var(--accent)' } and set --accent with h.Style. Set app-wide values in a .stylex.ts file with defineVars({ ... } satisfies ThemeOverrides).",
      annotation:
        "Check these styles with satisfies {{type}} instead. An annotation or `as` widens each part to any style, so XStyle.view can no longer see which properties it sets, and rejects it.",
      arrayAnnotation:
        "Check these styles with satisfies {{type}} instead, and pass them to the view where they are written. An array annotated with a styles type hides the properties each part sets, so XStyle.view skips every check on the styles spread from it.",
    },
  },
  createOnce(context) {
    let imports: Imports = new Map();

    // An annotation or assertion with an array of a styles type, such as `PopoverStyle.Styles[]`.
    const checkArray = (type: ESTree.TSType) => {
      const element = elementOf(type);

      if (element !== undefined && isStyles(element, imports)) {
        context.report({
          node: type,
          messageId: "arrayAnnotation",
          data: { type: context.sourceCode.getText(type) },
        });
      }
    };

    // An annotation or assertion with a styles type, such as `PopoverStyle.Styles`, or an array
    // of one.
    const checkType = (type: ESTree.TSType | undefined) => {
      if (type === undefined) return;

      if (isStyles(type, imports)) {
        context.report({
          node: type,
          messageId: "annotation",
          data: { type: context.sourceCode.getText(type.typeName) },
        });
      } else {
        checkArray(type);
      }
    };

    const checkAssertion = ({ typeAnnotation }: ESTree.TSAsExpression | ESTree.TSTypeAssertion) =>
      checkType(typeAnnotation);

    // A parameter typed with a styles type fails XStyle.view's own check, but one typed with an
    // array of them, such as `...extras: PopoverStyle.Styles[]`, passes it.
    const checkParameters = ({ params }: ESTree.Function | ESTree.ArrowFunctionExpression) => {
      for (const param of params) {
        const type =
          param.type === "Identifier" || param.type === "RestElement"
            ? param.typeAnnotation?.typeAnnotation
            : undefined;

        if (type !== undefined) checkArray(type);
      }
    };

    return {
      Program(program) {
        imports = importsOf(program);
      },
      CallExpression(node) {
        const name = exportOf(node.callee, imports, stylex);

        if (name === "createTheme") context.report({ node, messageId: "createTheme" });

        const [vars] = node.arguments;

        if (name !== "defineVars" || vars === undefined || vars.type === "SpreadElement") return;

        const object = asserted(vars);

        const checked =
          object.parent.type === "TSSatisfiesExpression" &&
          isThemeOverrides(object.parent.typeAnnotation, imports);

        if (!checked && setsThemeTokens(object)) {
          context.report({ node: vars, messageId: "overrides" });
        }
      },
      Property(node) {
        const key = keyOf(node);

        if (!key?.startsWith(tokenProperty)) return;

        // The call whose argument holds the key, through nested styles, functions and conditions.
        let call: ESTree.Node | null = node.parent;

        while (call !== null && call.type !== "CallExpression") call = call.parent;

        if (
          call !== null &&
          (exportOf(call.callee, imports, stylex) === "create" || isMethodCall(call, "Style"))
        ) {
          context.report({ node: node.key, messageId: "elementToken", data: { key } });
        }
      },
      VariableDeclarator({ id }) {
        if (id.type === "Identifier") checkType(id.typeAnnotation?.typeAnnotation);
      },
      TSAsExpression: checkAssertion,
      TSTypeAssertion: checkAssertion,
      FunctionDeclaration: checkParameters,
      FunctionExpression: checkParameters,
      ArrowFunctionExpression: checkParameters,
    };
  },
});
