import { type Schema, SchemaAST } from "effect";

const annotation = "~kutur-kit/audit/key";

declare module "effect/Schema" {
  namespace Annotations {
    interface Annotations {
      readonly "~kutur-kit/audit/key"?: "key" | undefined;
    }
  }
}

/** Marks a field the audit log records by default, such as an id. */
export const key = <S extends Schema.Top>(schema: S): S["Rebuild"] =>
  schema.annotate({ [annotation]: "key" });

export const isKey = (ast: SchemaAST.AST): boolean =>
  SchemaAST.resolve(ast)?.[annotation] === "key";
