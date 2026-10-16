import { Effect, Option, Predicate, Redacted, Schema, SchemaAST } from "effect";

import * as AuditKey from "../AuditKey.ts";

export type Codec = Schema.Codec<unknown, unknown>;

const isRedacted = (ast: SchemaAST.AST): boolean => {
  const representation = ast.annotations?.["representation"];

  return (
    SchemaAST.isDeclaration(ast) &&
    Predicate.hasProperty(representation, "id") &&
    representation.id === "effect/schema/Redacted"
  );
};

const containsRedacted = (ast: SchemaAST.AST): boolean =>
  isRedacted(ast) ||
  (SchemaAST.isDeclaration(ast) && ast.typeParameters.some(containsRedacted)) ||
  (SchemaAST.isObjects(ast) &&
    (ast.propertySignatures.some(({ type }) => containsRedacted(type)) ||
      ast.indexSignatures.some(({ type }) => containsRedacted(type)))) ||
  (SchemaAST.isArrays(ast) && [...ast.elements, ...ast.rest].some(containsRedacted)) ||
  (SchemaAST.isUnion(ast) && ast.types.some(containsRedacted));

const derive = (ast: SchemaAST.AST): Option.Option<Codec> => {
  if (isRedacted(ast)) return Option.none();

  if (AuditKey.isKey(ast)) return Option.some(Schema.make<Codec>(ast));

  if (SchemaAST.isDeclaration(ast)) {
    const [fields, ...rest] = ast.typeParameters;

    return fields !== undefined && rest.length === 0 && SchemaAST.isObjects(fields)
      ? deriveStruct(fields)
      : Option.none();
  }

  if (SchemaAST.isObjects(ast)) return deriveStruct(ast);

  if (SchemaAST.isArrays(ast)) {
    const [item, ...rest] = ast.rest;

    return item !== undefined && rest.length === 0 && ast.elements.length === 0
      ? Option.map(derive(item), (schema): Codec => Schema.Array(schema))
      : Option.none();
  }

  if (SchemaAST.isUnion(ast)) return deriveUnion(ast);

  return Option.none();
};

const deriveStruct = (ast: SchemaAST.Objects) => {
  const fields = ast.propertySignatures.flatMap(({ name, type }) =>
    Option.match(derive(type), {
      onNone: () => [],
      onSome: (field) => [
        [String(name), SchemaAST.isOptional(type) ? Schema.optionalKey(field) : field] as const,
      ],
    }),
  );

  return fields.length === 0
    ? Option.none()
    : Option.some<Codec>(Schema.Struct(Object.fromEntries(fields)));
};

// Every member must derive a view, so encoding never meets a value no member describes.
const deriveUnion = (ast: SchemaAST.Union) => {
  const defined = ast.types.filter((type) => !SchemaAST.isUndefined(type));
  const members = Option.all(defined.map(derive));

  return Option.map(members, (schemas): Codec => {
    const [first, ...rest] = schemas;

    const union: Codec = first !== undefined && rest.length === 0 ? first : Schema.Union(schemas);

    return defined.length < ast.types.length ? Schema.UndefinedOr(union) : union;
  });
};

export const rejectRedacted = (action: string, part: string, schema: Codec) => {
  if (containsRedacted(schema.ast))
    throw new Error(`The ${part} of audit event ${action} contains a Redacted field`);
};

/** What to record of a target: an explicit view, the fields marked with AuditKey.key or nothing. */
export const viewOf = (
  action: string,
  target: Codec | undefined,
  view: Codec | false | undefined,
): Codec | undefined => {
  if (target === undefined || view === false) return undefined;

  if (view === undefined) return Option.getOrUndefined(derive(target.ast));

  rejectRedacted(action, "view", view);

  return view;
};

/**
 * Runs a value through a view without encoding it to JSON, so values keep
 * their types, and reports whether any Redacted remains: a backstop for
 * schema shapes `rejectRedacted` does not inspect.
 */
const containsRedactedValue = (value: Codec["Type"]): boolean =>
  Redacted.isRedacted(value) ||
  (Array.isArray(value) && value.some(containsRedactedValue)) ||
  (Predicate.isObject(value) && Object.values(value).some(containsRedactedValue));

export const projectOrDie = (action: string, schema: Codec) => {
  const project = Schema.encodeUnknownEffect(Schema.toType(schema));

  return (value: Codec["Type"]) =>
    Effect.flatMap(Effect.orDie(project(value)), (projected) =>
      containsRedactedValue(projected)
        ? Effect.die(new Error(`Audit event ${action} would record a Redacted value`))
        : Effect.void,
    );
};
