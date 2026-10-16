import type * as Decision from "../Decision.ts";

import { Effect, Predicate } from "effect";

import * as Condition from "../Condition.ts";

export interface Checkable<T, E, R> {
  readonly id: string;
  readonly check: (target: T) => Effect.Effect<Decision.Decision, E, R>;
}

export interface Filter<T, E, R> {
  readonly condition: Effect.Effect<Condition.Condition<T>, E, R>;
}

/**
 * Dies unless a PermissionFilter's condition matches exactly the targets its
 * permission allows, so lists never show what a direct read would refuse, or
 * hide what it would allow.
 */
export const assertFilterAgrees = Effect.fnUntraced(function* <
  T extends object,
  E,
  RCheck,
  RFilter,
>(permission: Checkable<T, E, RCheck>, filter: Filter<T, E, RFilter>, targets: Iterable<T>) {
  const condition = yield* filter.condition;

  const decided = yield* Effect.forEach(targets, (target) =>
    Effect.map(permission.check(target), (decision) => ({
      target,
      allowed: Predicate.isTagged(decision, "Allow"),
    })),
  );

  const mismatch = decided.find(
    ({ target, allowed }) => allowed !== Condition.matches(condition, target),
  );

  return yield* mismatch === undefined
    ? Effect.void
    : Effect.die(
        new Error(
          `The filter of permission ${permission.id} ${mismatch.allowed ? "excludes" : "matches"} a target the permission ${mismatch.allowed ? "allows" : "refuses"}: ${JSON.stringify(mismatch.target)}`,
        ),
      );
});
