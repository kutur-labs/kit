import type { Scope } from "effect";

import { Context, Effect, Layer, Predicate, Schema, SchemaTransformation } from "effect";

import * as Decision from "./Decision.ts";

export type Codec = Schema.Codec<unknown, unknown>;

export interface Config {
  readonly requires?: unknown;
}

export interface Definition {
  readonly id?: string;
  readonly target?: Codec;
  readonly error?: Codec;
}

export type IdOf<Key extends string, D extends Definition> = D extends {
  readonly id: infer I extends string;
}
  ? I
  : Key;

export type Requires<C extends Config> = C extends { readonly requires: infer R } ? R : never;

export type TargetOf<D extends Definition> = D extends { readonly target: infer S extends Codec }
  ? S["Type"]
  : never;

export type TargetArgs<D extends Definition> = D extends { readonly target: Codec }
  ? [target: TargetOf<D>]
  : [];

export type PolicyError<D extends Definition> = D extends {
  readonly error: infer S extends Codec;
}
  ? S["Type"]
  : never;

/** The errors a check can fail with: refusals of required permissions become decisions. */
export type CheckError<D extends Definition> = Exclude<PolicyError<D>, Refusal<D>>;

type Refusal<D extends Definition> = Extract<PolicyError<D>, Decision.Denied>;

export type Policy<D extends Definition, R> = (
  ...target: TargetArgs<D>
) => Decision.Decision | Effect.Effect<Decision.Decision, PolicyError<D>, R>;

export interface Api<I extends string, D extends Definition, R> {
  readonly check: (...target: TargetArgs<D>) => Effect.Effect<Decision.Decision, CheckError<D>, R>;
  readonly require: (
    ...target: TargetArgs<D>
  ) => Effect.Effect<void, Decision.DeniedBy<I> | PolicyError<D>, R>;
}

export interface Statics<Self, I extends string, D extends Definition, R> {
  readonly id: I;
  readonly definition: D;
  readonly Denied: Decision.DeniedBySchema<I>;
  readonly check: (
    ...target: TargetArgs<D>
  ) => Effect.Effect<Decision.Decision, CheckError<D>, Self | R>;
  readonly require: (
    ...target: TargetArgs<D>
  ) => Effect.Effect<void, Decision.DeniedBy<I> | PolicyError<D>, Self | R>;
  readonly toLayer: <E = never, RL = never>(
    policy: Policy<D, R> | Effect.Effect<Policy<D, R>, E, RL>,
  ) => Layer.Layer<Self, E, Exclude<RL, Scope.Scope>>;
}

export type Permission<Self, Key extends string, D extends Definition, R> = Context.ServiceClass<
  Self,
  Key,
  Api<IdOf<Key, D>, D, R>
> &
  Statics<Self, IdOf<Key, D>, D, R>;

export interface Any {
  readonly id: string;
  /** The service key: unique per permission, as Effect requires of service keys. */
  readonly key: string;
}

export interface Tag<Self, I extends string, D extends Definition, R> extends Context.Service<
  Self,
  Api<I, D, R>
> {
  readonly id: I;
  readonly definition: D;
}

/**
 * The keys of the permissions the caller may use, or undefined for all.
 * Keys rather than ids, so permissions sharing an id stay apart.
 */
export class Restriction extends Context.Reference<ReadonlySet<string> | undefined>(
  "@kutur-kit/access/Permission/Restriction",
  { defaultValue: () => undefined },
) {}

export interface Decided<D extends Definition> {
  readonly permission: string;
  readonly via: "check" | "require";
  readonly target: TargetArgs<D>;
  readonly decision: Decision.Decision;
}

interface Internals<I extends string, D extends Definition, R> {
  readonly key: string;
  readonly id: I;
  readonly decide: (
    via: Decided<D>["via"],
    target: ReadonlyArray<unknown>,
  ) => Effect.Effect<Decided<D>, CheckError<D>, R>;
}

// True while a check runs, so requires inside its policies only answer it too.
const Answering = Context.Reference<boolean>("@kutur-kit/access/Permission/Answering", {
  defaultValue: () => false,
});

// A WeakMap rather than a field keeps services from Layer.succeed valid.
const internals = new WeakMap<object, unknown>();

const make = <I extends string, D extends Definition, R>(
  internal: Internals<I, D, R>,
): Api<I, D, R> => {
  const { key, id, decide } = internal;

  const run = Effect.fnUntraced(function* (via: Decided<D>["via"], target: ReadonlyArray<unknown>) {
    const answering = (yield* Answering) || via === "check";

    const { decision } = yield* decide(answering ? "check" : via, target).pipe(
      Effect.provideService(Answering, answering),
    );

    yield* Effect.annotateCurrentSpan({
      "access.permission": id,
      "access.decision": decision._tag,
      ...(Predicate.isTagged(decision, "Deny") && {
        "access.denied_by": decision.by,
        ...(decision.reason !== undefined && { "access.reason": decision.reason }),
        ...(decision.requirement !== undefined && { "access.requirement": decision.requirement }),
      }),
    });

    return decision;
  });

  const check = Effect.fn(`${key}.check`)(function* (...target: ReadonlyArray<unknown>) {
    return yield* run("check", target);
  });

  const require = Effect.fn(`${key}.require`)(function* (...target: ReadonlyArray<unknown>) {
    const decision = yield* run("require", target);

    // A required permission's refusal fails as that permission's, as it would
    // without this one, so callers can still tell which refused.
    return yield* Predicate.isTagged(decision, "Deny")
      ? Effect.fail(new Decision.Denied({ permission: decision.requirement ?? id }))
      : Effect.void;
  });

  // SAFETY: Callers pass the arguments TargetArgs<D> describes, and Denied
  // carries this permission's id.
  const service = { check, require } as Api<I, D, R>;

  internals.set(service, internal);

  return service;
};

/**
 * Runs `f` after every decision of a permission service built by `toLayer`,
 * inside the check's span and before `require` fails.
 */
export const tap =
  <D extends Definition>(f: (decided: Decided<D>) => Effect.Effect<void>) =>
  <I extends string, R>(service: Api<I, D, R>): Api<I, D, R> => {
    // SAFETY: make stored the Internals of this service's I, D and R.
    const internal = internals.get(service) as Internals<I, D, R> | undefined;

    if (internal === undefined)
      throw new Error("Permission.tap needs a permission service built by toLayer");

    return make({
      ...internal,
      decide: (via, target) => Effect.tap(internal.decide(via, target), f),
    });
  };

/** Whether the caller's restriction excludes a permission, so it must refuse. */
export const isRestricted = (permission: Any) =>
  Effect.map(Restriction, (allowed) => allowed !== undefined && !allowed.has(permission.key));

export const restrictTo =
  (permissions: Iterable<Any>) =>
  <A, E, R>(effect: Effect.Effect<A, E, R>): Effect.Effect<A, E, R> =>
    Effect.flatMap(Restriction, (current) => {
      const allowed = Array.from(permissions, ({ key }) => key);

      return Effect.provideService(
        effect,
        Restriction,
        new Set(current === undefined ? allowed : allowed.filter((key) => current.has(key))),
      );
    });

export interface PermissionSet<P extends Any> {
  readonly schema: Schema.Codec<ReadonlyArray<P["id"]>, ReadonlyArray<string>>;
  readonly restrictTo: (
    ids: Iterable<P["id"]>,
  ) => <A, E, R>(effect: Effect.Effect<A, E, R>) => Effect.Effect<A, E, R>;
}

export const set = <const Ps extends readonly [Any, ...ReadonlyArray<Any>]>(
  permissions: Ps,
): PermissionSet<Ps[number]> => {
  type P = Ps[number];

  const ids = permissions.map((permission): P["id"] => permission.id);
  const duplicate = ids.find((id, index) => ids.indexOf(id) !== index);

  if (duplicate !== undefined)
    throw new Error(`Permission id ${duplicate} is used by more than one permission`);

  // Ids name permissions outside the code, such as in stored token scopes.
  const byId = new Map(permissions.map((permission) => [permission.id, permission]));
  const isKnown = (id: string): id is P["id"] => byId.has(id);

  const schema = Schema.Array(Schema.String).pipe(
    Schema.decodeTo(
      Schema.Array(Schema.Literals(ids)),
      SchemaTransformation.transform<ReadonlyArray<P["id"]>, ReadonlyArray<string>>({
        decode: (stored) => stored.filter(isKnown),
        encode: (decoded) => decoded,
      }),
    ),
  );

  return {
    schema,
    restrictTo: (allowed) => restrictTo(Array.from(allowed).flatMap((id) => byId.get(id) ?? [])),
  };
};

export const Service =
  <Self, C extends Config = {}>() =>
  <const Key extends string, const D extends Definition>(
    key: Key,
    definition: D,
  ): Permission<Self, Key, D, Requires<C>> => {
    type R = Requires<C>;

    // SAFETY: IdOf<Key, D> is the declared id, or the key without one.
    const id = (definition.id ?? key) as IdOf<Key, D>;

    const Tag = Context.Service<Self, Api<IdOf<Key, D>, D, R>>()(key);

    const restricted = isRestricted({ id, key });

    const toLayer: Statics<Self, IdOf<Key, D>, D, R>["toLayer"] = (policy) =>
      Layer.effect(
        Tag,
        Effect.gen(function* () {
          // SAFETY: Callers pass the arguments TargetArgs<D> describes.
          const resolved = (Effect.isEffect(policy) ? yield* policy : policy) as (
            ...target: ReadonlyArray<unknown>
          ) => Decision.Decision | Effect.Effect<Decision.Decision, PolicyError<D>, R>;

          const decide: Internals<IdOf<Key, D>, D, R>["decide"] = Effect.fnUntraced(
            function* (via, target) {
              const result = (yield* restricted) ? Decision.restricted() : resolved(...target);

              const refusal = (error: PolicyError<D>): error is Refusal<D> =>
                Schema.is(Decision.Denied)(error);

              const answered = (answer: Effect.Effect<Decision.Decision, PolicyError<D>, R>) =>
                answer.pipe(
                  Effect.catchIf(refusal, (denied) =>
                    Effect.succeed(Decision.unmet(denied.permission)),
                  ),
                );

              const decision = Effect.isEffect(result) ? yield* answered(result) : result;

              // SAFETY: Callers pass the arguments TargetArgs<D> describes.
              return { permission: id, via, target: target as TargetArgs<D>, decision };
            },
          );

          return Tag.of(make({ key, id, decide }));
        }),
      );

    const check: Statics<Self, IdOf<Key, D>, D, R>["check"] = (...target) =>
      Tag.use((permission) => permission.check(...target));

    const require: Statics<Self, IdOf<Key, D>, D, R>["require"] = (...target) =>
      Tag.use((permission) => permission.require(...target));

    return Object.assign(Tag, {
      id,
      definition,
      Denied: Decision.deniedBy(id),
      toLayer,
      check,
      require,
    });
  };
