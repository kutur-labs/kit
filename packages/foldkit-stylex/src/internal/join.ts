/**
 * Names as one string for a message: "a", "a and b", "a, b and c". tsrs orders a union of string
 * literals by value, so its lists are alphabetical.
 */
export type Join<Names extends string, Last extends string> = [Names] extends [never]
  ? ""
  : LastOf<Names> extends infer Name extends string
    ? [Exclude<Names, Name>] extends [never]
      ? Name
      : `${Join<Exclude<Names, Name>, ", ">}${Last}${Name}`
    : never;

type LastOf<Union> = (
  Union extends unknown ? (union: (name: Union) => void) => void : never
) extends (union: infer Overloads) => void
  ? Overloads extends (name: infer Name) => void
    ? Name
    : never
  : never;
