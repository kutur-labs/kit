import type * as Condition from "../Condition.ts";

import { and, type Column, eq, isNull, or, type SQL, sql } from "drizzle-orm";
import { Match, Predicate } from "effect";

/**
 * Column kinds whose SQL equality is JavaScript's, so a query selects exactly
 * the rows Condition.matches accepts. Excluded: numeric (decimal text), char
 * (space padded), string-mode bigints, citext and other custom types.
 */
type Comparable =
  | "string"
  | "string enum"
  | "string uuid"
  | "number int16"
  | "number int32"
  | "number int53"
  | "bigint int64"
  | "boolean"
  | "number float"
  | "number double";

// char shares text's dataType and numeric's bigint mode shares bigint's, so
// the runtime check names column classes too.
const comparable: ReadonlySet<string> = new Set([
  "PgText",
  "PgVarchar",
  "PgEnumColumn",
  "PgEnumObjectColumn",
  "PgUUID",
  "PgSmallInt",
  "PgInteger",
  "PgBigInt53",
  "PgBigInt64",
  "PgBoolean",
  "PgReal",
  "PgDoublePrecision",
]);

// PostgreSQL reads uuids in any case and writes them lowercase.
const canonicalUuid = /^[\da-f]{8}-[\da-f]{4}-[\da-f]{4}-[\da-f]{4}-[\da-f]{12}$/;

/** A comparable column for every field a condition over `T` can compare; a Drizzle table qualifies. */
export type Columns<T> = {
  readonly [K in Condition.Field<T>]: Column & { readonly dataType: Comparable };
};

/** Translates a condition, such as a PermissionFilter's, into a PostgreSQL `where` clause. */
export const where = <T>(columns: Columns<T>, condition: Condition.Condition<T>): SQL => {
  const byField = new Map<string, Column>(Object.entries(columns));

  const column = (field: string) => {
    const found = byField.get(field);

    if (found === undefined) throw new Error(`No column for condition field ${field}`);

    if (!comparable.has(found.columnType))
      throw new Error(
        `Column ${field} (${found.getSQLType()}) compares differently in PostgreSQL than in JavaScript`,
      );

    return found;
  };

  const value = (target: Column, compared: Condition.Value) => {
    if (
      target.columnType === "PgUUID" &&
      !(Predicate.isString(compared) && canonicalUuid.test(compared))
    )
      throw new Error(`Uuid ${String(compared)} is not lowercase and canonical`);

    return compared;
  };

  const translate: (node: Condition.Node) => SQL = Match.type<Condition.Node>().pipe(
    Match.tagsExhaustive({
      All: () => sql`true`,
      None: () => sql`false`,
      Eq: ({ field, value: compared }) => {
        const target = column(field);

        return compared === null ? isNull(target) : eq(target, value(target, compared));
      },
      OneOf: ({ field, values }) => {
        const target = column(field);
        const known = values.filter((each) => each !== null).map((each) => value(target, each));

        // One array parameter however long the list: @effect/sql-pg sends at
        // most 32767 parameters per statement.
        const listed =
          known.length === 0
            ? sql`false`
            : sql`${target} = any(${sql.param(known)}::${sql.raw(target.getSQLType())}[])`;

        // IN and ANY never match NULL, while Condition.matches finds null in the list.
        return values.includes(null) ? (or(listed, isNull(target)) ?? listed) : listed;
      },
      And: ({ conditions }) => and(sql`true`, ...conditions.map(translate)) ?? sql`true`,
      Or: ({ conditions }) => or(sql`false`, ...conditions.map(translate)) ?? sql`false`,
      // Comparisons with NULL columns are NULL, which WHERE, AND and OR treat as
      // false like Condition.matches does; NOT would keep it NULL, so negate with
      // IS NOT TRUE instead.
      Not: ({ condition: inner }) => sql`(${translate(inner)}) is not true`,
    }),
  );

  return translate(condition);
};
