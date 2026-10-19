import { and, eq } from "drizzle-orm";
import { Context, Effect, Layer, Option } from "effect";

import { Database, memberships } from "./database.ts";
import { type Membership, MembershipUnavailable, UserId } from "./domain.ts";

/** Who belongs to which organization, read from the database on each lookup. */
export class Memberships extends Context.Service<
  Memberships,
  {
    readonly find: (
      userId: UserId,
      orgId: string,
    ) => Effect.Effect<Option.Option<Membership>, MembershipUnavailable>;
  }
>()("dataroom/Memberships") {
  static readonly layer = Layer.effect(
    Memberships,
    Effect.map(Database, (database) =>
      Memberships.of({
        find: (userId, orgId) =>
          database
            .select()
            .from(memberships)
            .where(and(eq(memberships.userId, userId), eq(memberships.orgId, orgId)))
            .pipe(
              Effect.tapError((error) => Effect.logError("Membership lookup failed", error)),
              Effect.mapError(() => new MembershipUnavailable()),
              Effect.map(([row]) =>
                Option.map(Option.fromNullishOr(row), (found) => ({
                  ...found,
                  userId: UserId.make(found.userId),
                })),
              ),
            ),
      }),
    ),
  );
}
