import type { ESTree } from "@oxlint/plugins";

/**
 * What a name refers to through an import: the module and the export path inside it. After
 * `import { Popover } from "@foldkit/ui"`, `Popover.view` is `@foldkit/ui` with `Popover.view`.
 */
export type Imported = Readonly<{ source: string; path: string }>;

export type Imports = ReadonlyMap<string, Imported>;

/**
 * The import that each local name binds. Rules recognise calls such as `sx(...)` or
 * `Effect.runSync(...)` by these, so a local function that happens to be called `sx` is not one.
 */
export const importsOf = (program: ESTree.Program): Imports =>
  new Map(
    program.body.flatMap((statement) =>
      statement.type === "ImportDeclaration"
        ? statement.specifiers.map((specifier): [string, Imported] => [
            specifier.local.name,
            { source: statement.source.value, path: pathOf(specifier) },
          ])
        : [],
    ),
  );

const pathOf = (specifier: ESTree.ImportDeclarationSpecifier) => {
  if (specifier.type === "ImportNamespaceSpecifier") return "";

  if (specifier.type === "ImportDefaultSpecifier") return "default";

  return specifier.imported.type === "Literal" ? specifier.imported.value : specifier.imported.name;
};

const join = (path: string, name: string) => (path === "" ? name : `${path}.${name}`);

/**
 * Resolves an identifier, a member chain such as `Ui.Popover.view` or a qualified type name such as
 * `PopoverStyle.Styles` to the import it starts from, or `undefined` for anything else.
 */
export const resolve = (node: ESTree.Node, imports: Imports): Imported | undefined => {
  if (node.type === "Identifier") return imports.get(node.name);

  const [object, property] =
    node.type === "MemberExpression" && !node.computed
      ? [node.object, node.property]
      : node.type === "TSQualifiedName"
        ? [node.left, node.right]
        : [];

  if (object === undefined || property?.type !== "Identifier") return undefined;

  const resolved = resolve(object, imports);

  return resolved && { source: resolved.source, path: join(resolved.path, property.name) };
};

/** The export path `node` names in `source`, such as `create` for `stylex.create`. */
export const exportOf = (node: ESTree.Node, imports: Imports, source: string) => {
  const resolved = resolve(node, imports);

  return resolved?.source === source ? resolved.path : undefined;
};

/**
 * The export `imported` names in an Effect module, read from the barrel (`Effect.runSync` from
 * "effect") or the module's own path (`runSync` from "effect/Effect").
 */
export const effectMemberOf = (imported: Imported | undefined, module: string) => {
  if (imported?.source === `effect/${module}`) return imported.path;

  return imported?.source === "effect" && imported.path.startsWith(`${module}.`)
    ? imported.path.slice(module.length + 1)
    : undefined;
};

/** The identifier a member chain such as `tab.tab.attributes` starts from. */
export const rootOf = (node: ESTree.Expression): ESTree.IdentifierReference | undefined => {
  if (node.type === "Identifier") return node;

  return node.type === "MemberExpression" ? rootOf(node.object) : undefined;
};

/** A call of a method named `name` on any object, such as `h.Class(...)`. */
export const isMethodCall = (node: ESTree.Node, name: string): node is ESTree.CallExpression =>
  node.type === "CallExpression" &&
  node.callee.type === "MemberExpression" &&
  !node.callee.computed &&
  node.callee.property.type === "Identifier" &&
  node.callee.property.name === name;

/** A property's key as written, for identifier and string keys. */
export const keyOf = (property: Readonly<{ computed: boolean; key: ESTree.PropertyKey }>) => {
  if (property.computed) return undefined;

  if (property.key.type === "Identifier") return property.key.name;

  return property.key.type === "Literal" ? String(property.key.value) : undefined;
};
