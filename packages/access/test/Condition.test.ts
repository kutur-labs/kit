import { expect, it } from "vitest";

import { Condition } from "../src/index.ts";

interface Row {
  readonly id: string;
  readonly org: string | null;
  readonly amount: number;
  readonly open: boolean;
}

const where = Condition.make<Row>();

const row: Row = { id: "r1", org: "acme", amount: 5, open: true };

it("matches targets by field values, combinations and their negation", () => {
  const cases: ReadonlyArray<readonly [Condition.Condition<Row>, boolean]> = [
    [where.all(), true],
    [where.none(), false],
    [where.eq("org", "acme"), true],
    [where.eq("org", null), false],
    [where.oneOf("amount", [1, 5]), true],
    [where.oneOf("amount", []), false],
    [where.and(where.eq("open", true), where.eq("amount", 6)), false],
    [where.or(where.eq("open", false), where.eq("amount", 5)), true],
    [where.not(where.eq("id", "r1")), false],
    [where.and(), true],
    [where.or(), false],
  ];

  expect(cases.map(([condition]) => Condition.matches(condition, row))).toEqual(
    cases.map(([, expected]) => expected),
  );
  expect(Condition.matches(where.eq("org", null), { ...row, org: null })).toBe(true);
});
