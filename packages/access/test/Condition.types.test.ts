import { expectTypeOf, it } from "vitest";

import { Condition } from "../src/index.ts";

interface Invoice {
  readonly id: string;
  readonly dueAt: Date;
  readonly memo?: string;
  readonly customer: { readonly id: string };
  readonly tags: ReadonlyArray<string>;
}

const where = Condition.make<Invoice>();

// Each line uses a capability conditions lack today. When one is added, its
// directive becomes unused and fails the type check, so move it to a real test.

it("does not compare dates, optional, nested or array fields yet", () => {
  // @ts-expect-error -- dates
  expectTypeOf(where.eq).toBeCallableWith("dueAt", new Date(0));
  // @ts-expect-error -- optional fields
  expectTypeOf(where.eq).toBeCallableWith("memo", "Rush");
  // @ts-expect-error -- nested fields
  expectTypeOf(where.eq).toBeCallableWith("customer.id", "c1");
  // @ts-expect-error -- array membership
  expectTypeOf(where.eq).toBeCallableWith("tags", "urgent");
});

it("has no range, pattern or presence operators yet", () => {
  // @ts-expect-error -- ranges
  expectTypeOf(where.lt).toBeFunction();
  // @ts-expect-error -- patterns
  expectTypeOf(where.startsWith).toBeFunction();
  // @ts-expect-error -- presence of optional fields
  expectTypeOf(where.isSet).toBeFunction();
});
