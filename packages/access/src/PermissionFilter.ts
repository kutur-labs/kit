import type { Scope } from "effect";

import { Context, Effect, Layer } from "effect";

import * as Condition from "./Condition.ts";
import * as Permission from "./Permission.ts";

export type Policy<D extends Permission.Definition, R> = (
  where: Condition.Builder<Permission.TargetOf<D>>,
) =>
  | Condition.Condition<Permission.TargetOf<D>>
  | Effect.Effect<Condition.Condition<Permission.TargetOf<D>>, Permission.CheckError<D>, R>;

export interface Api<D extends Permission.Definition, R> {
  /** The targets the permission allows, or none outside the caller's restriction. */
  readonly condition: Effect.Effect<
    Condition.Condition<Permission.TargetOf<D>>,
    Permission.CheckError<D>,
    R
  >;
}

export interface Statics<Self, D extends Permission.Definition, R> {
  readonly condition: Effect.Effect<
    Condition.Condition<Permission.TargetOf<D>>,
    Permission.CheckError<D>,
    Self | R
  >;
  readonly toLayer: <E = never, RL = never>(
    policy: Policy<D, R> | Effect.Effect<Policy<D, R>, E, RL>,
  ) => Layer.Layer<Self, E, Exclude<RL, Scope.Scope>>;
}

export type PermissionFilter<Self, D extends Permission.Definition, R> = Context.ServiceClass<
  Self,
  string,
  Api<D, R>
> &
  Statics<Self, D, R>;

/**
 * Defines the query form of a permission: the condition its policy allows,
 * for listing targets in one query. Its key is the permission's with
 * `/Filter`, so name the class after the permission too, such as
 * `ViewInvoiceFilter`. Its policy must agree with the permission's;
 * `PermissionTesting.assertFilterAgrees` checks that.
 */
export const Service =
  <Self>() =>
  <
    PermissionSelf,
    I extends string,
    D extends Permission.Definition & { readonly target: Permission.Codec },
    R,
  >(
    permission: Permission.Tag<PermissionSelf, I, D, R>,
  ): PermissionFilter<Self, D, R> => {
    const key = `${permission.key}/Filter`;
    const Tag = Context.Service<Self, Api<D, R>>()(key);

    const toLayer: Statics<Self, D, R>["toLayer"] = (policy) =>
      Layer.effect(
        Tag,
        Effect.gen(function* () {
          const resolved = Effect.isEffect(policy) ? yield* policy : policy;

          const condition = Effect.gen(function* () {
            const refused = yield* Permission.isRestricted(permission);

            if (refused) return Condition.make<Permission.TargetOf<D>>().none();

            const result = resolved(Condition.make());

            return Effect.isEffect(result) ? yield* result : result;
          }).pipe(
            Effect.tap((result) =>
              Effect.annotateCurrentSpan({
                "access.permission": permission.id,
                "access.condition": result._tag,
              }),
            ),
            Effect.withSpan(`${key}.condition`),
          );

          return Tag.of({ condition });
        }),
      );

    return Object.assign(Tag, {
      condition: Tag.use((filter) => filter.condition),
      toLayer,
    });
  };
