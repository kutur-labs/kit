import type { ESTree, Scope, SourceCode, Variable } from "@oxlint/plugins";

/**
 * The variable an identifier refers to, from the innermost scope that declares its name, or
 * `undefined` for a global. Rules that follow a value to where it was made, such as a parameter or
 * a `const` initialiser, read the variable's `defs` and `references`, so a same-named binding
 * elsewhere in the file is a different variable.
 */
export const variableOf = (
  sourceCode: SourceCode,
  identifier: ESTree.IdentifierReference,
): Variable | undefined => {
  for (
    let scope: Scope | null = sourceCode.getScope(identifier);
    scope !== null;
    scope = scope.upper
  ) {
    const variable = scope.set.get(identifier.name);

    if (variable !== undefined) return variable;
  }

  return undefined;
};
