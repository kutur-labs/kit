import * as Audit from "@kutur-kit/audit/Audit";
import * as AuditEvent from "@kutur-kit/audit/AuditEvent";
import { Effect, Layer, Predicate, Schema } from "effect";

import * as Permission from "./Permission.ts";

/** What refused a denied decision. Allowed decisions have no details. */
export const Details = Schema.UndefinedOr(
  Schema.Struct({
    deniedBy: Schema.Literals(["restriction", "policy", "requirement"]),
    requirement: Schema.optionalKey(Schema.String),
  }),
);

type CheckView<D extends Permission.Definition, V> = [V] extends [never]
  ? unknown
  : [V] extends [Permission.Codec]
    ? D extends { readonly target: Permission.Codec }
      ? [Permission.TargetOf<D>] extends [V["Type"]]
        ? unknown
        : { readonly view: Schema.Codec<Permission.TargetOf<D>, unknown> }
      : { readonly view?: false }
    : unknown;

export interface Options<V> {
  /** See `AuditEvent.Definition["view"]`. */
  readonly view?: V;
}

/**
 * Records the decisions of a permission's `require`s as audit events named by
 * its id; `check`s only answer questions, so they are not recorded. Refusals
 * fail the request whose transaction would store them, so writes are isolated.
 */
export const record = <
  Self,
  I extends string,
  D extends Permission.Definition,
  R,
  const V extends Permission.Codec | false = never,
>(
  permission: Permission.Tag<Self, I, D, R>,
  options?: Options<V> & CheckView<D, V>,
) => {
  const view = options?.view;

  // Permissions without a target log Schema.Undefined, which records nothing.
  const event = AuditEvent.make(permission.id, {
    target: permission.definition.target ?? Schema.Undefined,
    ...(view !== undefined && { view }),
    outcomes: ["Allow", "Deny"] as const,
    details: Details,
    isolated: true,
  });

  return <E, RL>(layer: Layer.Layer<Self, E, RL>): Layer.Layer<Self, E, RL | Audit.AuditLog> =>
    Layer.effect(
      permission,
      Effect.gen(function* () {
        const inner = yield* permission;
        const auditLog = yield* Audit.AuditLog;

        return Permission.tap<D>(({ via, target: args, decision }) => {
          if (via === "check") return Effect.void;

          const denied = Predicate.isTagged(decision, "Deny") ? decision : undefined;

          return event
            .log({
              target: args[0],
              outcome: decision._tag,
              ...(denied?.reason !== undefined && { reason: denied.reason }),
              details: denied && {
                deniedBy: denied.by,
                ...(denied.requirement !== undefined && { requirement: denied.requirement }),
              },
            })
            .pipe(Effect.provideService(Audit.AuditLog, auditLog));
        })(inner);
      }),
    ).pipe(Layer.provide(layer));
};
