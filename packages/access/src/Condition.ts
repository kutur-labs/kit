import { Data, Match, Predicate } from "effect";

/** The values conditions compare. */
export type Value = string | number | boolean | bigint | null;

/** The fields of `T` a condition can compare: those holding primitive values. */
export type Field<T> = {
  readonly [K in keyof T & string]: T[K] extends Value ? K : never;
}[keyof T & string];

export class All extends Data.TaggedClass("All")<{}> {}

export class None extends Data.TaggedClass("None")<{}> {}

export class Eq extends Data.TaggedClass("Eq")<{
  readonly field: string;
  readonly value: Value;
}> {}

export class OneOf extends Data.TaggedClass("OneOf")<{
  readonly field: string;
  readonly values: ReadonlyArray<Value>;
}> {}

export class And extends Data.TaggedClass("And")<{ readonly conditions: ReadonlyArray<Node> }> {}

export class Or extends Data.TaggedClass("Or")<{ readonly conditions: ReadonlyArray<Node> }> {}

export class Not extends Data.TaggedClass("Not")<{ readonly condition: Node }> {}

export type Node = All | None | Eq | OneOf | And | Or | Not;

/**
 * A condition over targets of type `T`. The phantom member keeps conditions
 * over one target type from being used for another.
 */
export type Condition<T> = Node & { readonly "~target"?: (target: T) => T };

/** Builds conditions over one target type; PermissionFilter policies receive it. */
export interface Builder<T> {
  readonly all: () => Condition<T>;
  readonly none: () => Condition<T>;
  readonly eq: <K extends Field<T>>(field: K, value: T[K] & Value) => Condition<T>;
  readonly oneOf: <K extends Field<T>>(
    field: K,
    values: ReadonlyArray<T[K] & Value>,
  ) => Condition<T>;
  readonly and: (...conditions: ReadonlyArray<Condition<T>>) => Condition<T>;
  readonly or: (...conditions: ReadonlyArray<Condition<T>>) => Condition<T>;
  readonly not: (condition: Condition<T>) => Condition<T>;
}

export const make = <T>(): Builder<T> => ({
  all: () => new All(),
  none: () => new None(),
  eq: (field, value) => new Eq({ field, value }),
  oneOf: (field, values) => new OneOf({ field, values }),
  and: (...conditions) => new And({ conditions }),
  or: (...conditions) => new Or({ conditions }),
  not: (condition) => new Not({ condition }),
});

// NaN equals NaN and 0 equals -0, as in SQL.
const same = (actual: Value | undefined, value: Value) =>
  actual === value || Object.is(actual, value);

const isValue = (value: unknown): value is Value =>
  value === null ||
  Predicate.isString(value) ||
  Predicate.isNumber(value) ||
  Predicate.isBoolean(value) ||
  Predicate.isBigInt(value);

const evaluate = (fields: ReadonlyMap<string, Value>): ((node: Node) => boolean) =>
  Match.type<Node>().pipe(
    Match.tagsExhaustive({
      All: () => true,
      None: () => false,
      Eq: ({ field, value }) => same(fields.get(field), value),
      OneOf: ({ field, values }) => values.some((value) => same(fields.get(field), value)),
      And: ({ conditions }) => conditions.every(evaluate(fields)),
      Or: ({ conditions }) => conditions.some(evaluate(fields)),
      Not: ({ condition }) => !evaluate(fields)(condition),
    }),
  );

/** Whether a target satisfies a condition, as a query applying it would decide. */
export const matches = <T extends object>(condition: Condition<T>, target: T): boolean =>
  evaluate(
    new Map(
      Object.entries(target).flatMap(([field, value]) => (isValue(value) ? [[field, value]] : [])),
    ),
  )(condition);
