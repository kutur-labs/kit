import { Schema } from "effect";

export class Allow extends Schema.TaggedClass<Allow, { readonly brand: unique symbol }>()(
  "Allow",
  {},
) {}

/**
 * `restriction` when the caller's restriction refused the permission before
 * its policy ran; `requirement` when the policy required a permission, named
 * by `requirement`, that refused.
 */
export class Deny extends Schema.TaggedClass<Deny, { readonly brand: unique symbol }>()("Deny", {
  by: Schema.Literals(["restriction", "policy", "requirement"]),
  reason: Schema.optionalKey(Schema.String),
  requirement: Schema.optionalKey(Schema.String),
}) {}

export const Decision = Schema.Union([Allow, Deny]);

export type Decision = Allow | Deny;

export const allow = (): Allow => new Allow();

export const deny = (reason?: string): Deny =>
  new Deny(reason === undefined ? { by: "policy" } : { by: "policy", reason });

export const restricted = (): Deny => new Deny({ by: "restriction" });

export const unmet = (requirement: string): Deny => new Deny({ by: "requirement", requirement });

export class Denied extends Schema.TaggedError<Denied, { readonly brand: unique symbol }>()(
  "AccessDenied",
  { permission: Schema.String },
  { httpApiStatus: 403 },
) {}

export type DeniedBy<P extends string> = Denied & { readonly permission: P };

export type DeniedBySchema<P extends string> = Schema.refine<DeniedBy<P>, typeof Denied>;

/** The refusals of one permission, from its id alone. */
export const deniedBy = <P extends string>(permission: P): DeniedBySchema<P> =>
  Denied.pipe(Schema.refine((denied): denied is DeniedBy<P> => denied.permission === permission));
