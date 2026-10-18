import { Data, Schema } from "effect";

export type Decision = Data.TaggedEnum<{
  Allow: {};
  /**
   * `restriction` when the caller's restriction refused the permission before
   * its policy ran; `requirement` when the policy required a permission, named
   * by `requirement`, that refused.
   */
  Deny: {
    readonly by: "restriction" | "policy" | "requirement";
    readonly reason?: string;
    readonly requirement?: string;
  };
}>;

export type Allow = Extract<Decision, { readonly _tag: "Allow" }>;

export type Deny = Extract<Decision, { readonly _tag: "Deny" }>;

const constructors = Data.taggedEnum<Decision>();

export const allow = (): Allow => constructors.Allow();

export const deny = (reason?: string): Deny =>
  constructors.Deny(reason === undefined ? { by: "policy" } : { by: "policy", reason });

export const restricted = (): Deny => constructors.Deny({ by: "restriction" });

export const unmet = (requirement: string): Deny =>
  constructors.Deny({ by: "requirement", requirement });

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
