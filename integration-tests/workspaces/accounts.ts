import { Auth, Schema as AuthSchema, Password, Sessions } from "@yielded/auth";
import { AuthPersistence } from "@yielded/auth-persistence-drizzle/Postgres";
import { boolean, pgTable, text } from "drizzle-orm/pg-core";
import { Effect, Schema } from "effect";

import { AuthApi } from "./api.ts";

/** Accounts of the users in the directory, keyed by the same ids. */
export const users = pgTable("users", {
  id: text().primaryKey(),
  active: boolean().notNull(),
  securityRevision: text("security_revision").notNull(),
});

export const AppAuth = Auth.make(AuthApi, {
  sessions: Sessions.stateful({ maxAge: "8 hours", idleTimeout: "30 minutes" }),
  strategies: {
    // The server provisions accounts for users of the directory; the contract
    // exposes neither registration nor reset to clients.
    password: Password.make({
      registration: Schema.Struct({ userId: Schema.String }),
      reset: Password.resetLink({ url: "https://workspaces.test/reset-password" }),
    }),
  },
  defaultStrategy: "password",
});

const requirement = Sessions.AuthenticationRequirement.make({
  alternatives: [
    {
      factors: ["knowledge"],
      minimumCredentials: 1,
      userVerified: false,
      phishingResistant: false,
    },
  ],
  maximumAgeMillis: 300_000,
});

export const Persistence = AuthPersistence.make(AppAuth);

export const storage = Persistence.managed({
  subjects: {
    table: users,
    id: "id",
    status: "active",
    activeValue: true,
    securityRevision: "securityRevision",
    idCodec: AuthSchema.SubjectId,
    requirements: () => Effect.succeed(requirement),
  },
  prefix: "auth",
});
