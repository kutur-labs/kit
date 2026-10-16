import { and, eq } from "drizzle-orm";
import { Clock, Context, Crypto, Effect, Layer, Option, Redacted, Schema } from "effect";
import { Base64Url, Hex } from "effect/encoding";

import { users } from "./accounts.ts";
import { TokenNotFound } from "./api.ts";
import { agentTokens, Database } from "./database.ts";
import { CurrentUser } from "./domain.ts";
import { AgentScopes } from "./permissions.ts";

export type AgentScope = (typeof AgentScopes.schema.Type)[number];

export interface AgentToken {
  readonly id: string;
  readonly userId: string;
  readonly scopes: ReadonlyArray<AgentScope>;
}

/** Tokens a user issues for agents to act for them with fewer permissions. */
export class AgentTokens extends Context.Service<
  AgentTokens,
  {
    /** Issues a token for the current user. Requested scopes naming no permission are dropped. */
    readonly issue: (
      requested: ReadonlyArray<string>,
    ) => Effect.Effect<
      AgentToken & { readonly token: Redacted.Redacted<string> },
      never,
      CurrentUser
    >;
    /** Revokes one of the current user's tokens. */
    readonly revoke: (id: string) => Effect.Effect<void, TokenNotFound, CurrentUser>;
    /** The token, while it exists and its user's account is active. */
    readonly find: (token: Redacted.Redacted<string>) => Effect.Effect<Option.Option<AgentToken>>;
  }
>()("workspaces/AgentTokens") {
  static readonly layer = Layer.effect(
    AgentTokens,
    Effect.gen(function* () {
      const database = yield* Database;
      const crypto = yield* Crypto.Crypto;
      const decodeScopes = Schema.decodeEffect(AgentScopes.schema);

      const digest = (token: Redacted.Redacted<string>) =>
        crypto
          .digest("SHA-256", new TextEncoder().encode(Redacted.value(token)))
          .pipe(Effect.map(Hex.encode));

      return AgentTokens.of({
        issue: Effect.fn("AgentTokens.issue")(function* (requested) {
          const user = yield* CurrentUser;
          const scopes = yield* decodeScopes(requested);
          const id = yield* crypto.randomUUIDv7();
          const token = Redacted.make(Base64Url.encode(yield* crypto.randomBytes(32)));

          yield* database.insert(agentTokens).values({
            id,
            userId: user.id,
            tokenHash: yield* digest(token),
            scopes: [...scopes],
            createdAt: new Date(yield* Clock.currentTimeMillis),
          });

          return { id, userId: user.id, scopes, token };
        }, Effect.orDie),
        revoke: Effect.fn("AgentTokens.revoke")(function* (id) {
          const user = yield* CurrentUser;

          const revoked = yield* database
            .delete(agentTokens)
            .where(and(eq(agentTokens.id, id), eq(agentTokens.userId, user.id)))
            .returning({ id: agentTokens.id })
            .pipe(Effect.orDie);

          return yield* revoked.length === 0 ? Effect.fail(new TokenNotFound()) : Effect.void;
        }),
        find: Effect.fn("AgentTokens.find")(function* (token) {
          const [row] = yield* database
            .select({
              id: agentTokens.id,
              userId: agentTokens.userId,
              scopes: agentTokens.scopes,
            })
            .from(agentTokens)
            .innerJoin(users, and(eq(users.id, agentTokens.userId), eq(users.active, true)))
            .where(eq(agentTokens.tokenHash, yield* digest(token)));

          if (row === undefined) return Option.none();

          // Scopes naming permissions that no longer exist are dropped.
          return Option.some({
            id: row.id,
            userId: row.userId,
            scopes: yield* decodeScopes(row.scopes),
          });
        }, Effect.orDie),
      });
    }),
  );
}
