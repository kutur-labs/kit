import { and, eq } from "drizzle-orm";
import { Context, Effect, Layer, Option } from "effect";

import { Database, memberships } from "./database.ts";
import { MembershipUnavailable, OrgId, type Role, type UserId } from "./domain.ts";

export interface Membership {
  readonly userId: typeof UserId.Type;
  readonly orgId: typeof OrgId.Type;
  readonly role: Role;
}

export class Memberships extends Context.Service<
  Memberships,
  {
    readonly roleIn: (
      userId: typeof UserId.Type,
      orgId: typeof OrgId.Type,
    ) => Effect.Effect<Option.Option<Role>, MembershipUnavailable>;
    readonly orgsOf: (
      userId: typeof UserId.Type,
    ) => Effect.Effect<ReadonlyArray<typeof OrgId.Type>, MembershipUnavailable>;
  }
>()("billing/Memberships") {
  static readonly layer = Layer.effect(
    Memberships,
    Effect.gen(function* () {
      const database = yield* Database;
      const unavailable = Effect.mapError(() => new MembershipUnavailable());

      return Memberships.of({
        roleIn: (userId, orgId) =>
          database
            .select({ role: memberships.role })
            .from(memberships)
            .where(and(eq(memberships.userId, userId), eq(memberships.orgId, orgId)))
            .pipe(
              unavailable,
              Effect.map((found) => Option.fromNullishOr(found[0]?.role)),
            ),
        orgsOf: (userId) =>
          database
            .select({ orgId: memberships.orgId })
            .from(memberships)
            .where(eq(memberships.userId, userId))
            .pipe(
              unavailable,
              Effect.map((found) => found.map(({ orgId }) => OrgId.make(orgId))),
            ),
      });
    }),
  );
}
