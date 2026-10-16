import { and, eq } from "drizzle-orm";
import { Context, Effect, Layer, Option } from "effect";

import { Database, memberships, shares, teamMembers } from "./database.ts";
import { DirectoryUnavailable, type Membership, type Share } from "./domain.ts";

/** Memberships and shares, read from the database on each lookup. */
export class Directory extends Context.Service<
  Directory,
  {
    readonly membership: (
      userId: string,
      orgId: string,
    ) => Effect.Effect<Option.Option<Membership>, DirectoryUnavailable>;
    readonly memberships: (
      userId: string,
    ) => Effect.Effect<ReadonlyArray<Membership>, DirectoryUnavailable>;
    readonly share: (
      userId: string,
      documentId: string,
    ) => Effect.Effect<Option.Option<Share["access"]>, DirectoryUnavailable>;
    /** The documents shared with a user for `access`; an edit share also grants viewing. */
    readonly shared: (
      userId: string,
      access: Share["access"],
    ) => Effect.Effect<ReadonlyArray<string>, DirectoryUnavailable>;
  }
>()("workspaces/Directory") {
  static readonly layer = Layer.effect(
    Directory,
    Effect.gen(function* () {
      const database = yield* Database;
      const unavailable = Effect.mapError(() => new DirectoryUnavailable());

      const withTeams = Effect.fnUntraced(function* (
        found: ReadonlyArray<typeof memberships.$inferSelect>,
      ) {
        const [first] = found;

        if (first === undefined) return [];

        const teams = yield* database
          .select()
          .from(teamMembers)
          .where(eq(teamMembers.userId, first.userId))
          .pipe(unavailable);

        return found.map((member): Membership => ({
          ...member,
          teams: teams.flatMap(({ orgId, teamId }) => (orgId === member.orgId ? [teamId] : [])),
        }));
      });

      return Directory.of({
        membership: (userId, orgId) =>
          database
            .select()
            .from(memberships)
            .where(and(eq(memberships.userId, userId), eq(memberships.orgId, orgId)))
            .pipe(
              unavailable,
              Effect.flatMap(withTeams),
              Effect.map((found) => Option.fromNullishOr(found[0])),
            ),
        memberships: (userId) =>
          database
            .select()
            .from(memberships)
            .where(eq(memberships.userId, userId))
            .pipe(unavailable, Effect.flatMap(withTeams)),
        share: (userId, documentId) =>
          database
            .select({ access: shares.access })
            .from(shares)
            .where(and(eq(shares.userId, userId), eq(shares.documentId, documentId)))
            .pipe(
              unavailable,
              Effect.map((found) => Option.fromNullishOr(found[0]?.access)),
            ),
        shared: (userId, access) =>
          database
            .select({ documentId: shares.documentId })
            .from(shares)
            .where(
              access === "view"
                ? eq(shares.userId, userId)
                : and(eq(shares.userId, userId), eq(shares.access, "edit")),
            )
            .pipe(
              unavailable,
              Effect.map((found) => found.map(({ documentId }) => documentId)),
            ),
      });
    }),
  );
}
