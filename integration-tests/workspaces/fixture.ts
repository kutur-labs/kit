import { Effect, Layer } from "effect";

import { collector, generate, outsider, users } from "./data.ts";
import { Database } from "./database.ts";
import { Directory } from "./directory.ts";
import { Documents } from "./documents.ts";
import { CurrentUser } from "./domain.ts";
import * as Policies from "./policies.ts";

export const { memberships, documents, shares } = generate(20_261_016);

export const everyone = [...users, outsider, collector];

export const app = Documents.layer.pipe(
  Layer.provideMerge(Policies.layer),
  Layer.provideMerge(Layer.merge(Database.auditLog, Directory.layer)),
  Layer.provideMerge(Database.layer({ documents, memberships, shares })),
);

/** The first user with a role in some organization. */
export const withRole = (role: "owner" | "admin" | "member" | "guest") =>
  memberships.find((member) => member.role === role)?.userId ?? outsider;

// One user of each kind, as every check queries the directory.
export const sample = [
  ...(["owner", "admin", "member", "guest"] as const).map(withRole),
  outsider,
  collector,
];

export const asUser = (id: string) => Effect.provideService(CurrentUser, { id });
