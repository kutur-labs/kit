import { Decision } from "@kutur-kit/access";
import * as PermissionAudit from "@kutur-kit/access/audit";
import { Effect, Layer, Option } from "effect";

import { Directory } from "./directory.ts";
import { CurrentUser, type Membership } from "./domain.ts";
import {
  DeleteDocument,
  DeleteDocumentFilter,
  EditDocument,
  EditDocumentFilter,
  ViewDocument,
  ViewDocumentFilter,
} from "./permissions.ts";

const elevated = (member: Membership) => member.role === "owner" || member.role === "admin";

const cleared = (member: Membership) =>
  Array.from({ length: member.clearance + 1 }, (_, level) => level);

// Each policy has a filter stating the same rule as a condition; tests check
// they agree for every user and document.

export const ViewDocumentLayer = ViewDocument.toLayer(
  Effect.gen(function* () {
    const directory = yield* Directory;

    return Effect.fn(function* (document) {
      if (document.visibility === "public" && document.status === "published")
        return Decision.allow();

      const user = yield* CurrentUser;
      const member = yield* directory.membership(user.id, document.orgId);

      if (Option.isNone(member)) return Decision.deny("Not a member");

      if (document.classification > member.value.clearance) return Decision.deny("Classified");

      if (elevated(member.value)) return Decision.allow();

      if (document.status === "archived") return Decision.deny("Archived");

      const insider = member.value.role !== "guest";

      const visible =
        document.ownerId === user.id ||
        (insider && document.visibility === "org") ||
        (insider &&
          document.visibility === "team" &&
          document.teamId !== null &&
          member.value.teams.includes(document.teamId)) ||
        Option.isSome(yield* directory.share(user.id, document.id));

      return visible ? Decision.allow() : Decision.deny();
    });
  }),
);

export const ViewDocumentFilterLayer = ViewDocumentFilter.toLayer(
  Effect.gen(function* () {
    const directory = yield* Directory;

    return Effect.fn(function* (where) {
      const user = yield* CurrentUser;
      const shared = yield* directory.shared(user.id, "view");
      const memberships = yield* directory.memberships(user.id);

      // What a membership lets the user reach at all, before ownership,
      // visibility or shares decide.
      const reachable = (member: Membership) =>
        where.and(
          where.eq("orgId", member.orgId),
          where.oneOf("classification", cleared(member)),
          elevated(member) ? where.all() : where.not(where.eq("status", "archived")),
        );

      return where.or(
        where.and(where.eq("visibility", "public"), where.eq("status", "published")),
        ...memberships.map((member) => {
          const insider = member.role !== "guest";

          return where.and(
            reachable(member),
            elevated(member)
              ? where.all()
              : where.or(
                  where.eq("ownerId", user.id),
                  insider ? where.eq("visibility", "org") : where.none(),
                  insider
                    ? where.and(where.eq("visibility", "team"), where.oneOf("teamId", member.teams))
                    : where.none(),
                ),
          );
        }),
        // Shares once, rather than in every membership: the list can be long.
        where.and(where.oneOf("id", shared), where.or(...memberships.map(reachable))),
      );
    });
  }),
);

export const EditDocumentLayer = EditDocument.toLayer(
  Effect.gen(function* () {
    const directory = yield* Directory;
    const view = yield* ViewDocument;

    return Effect.fn(function* (document) {
      yield* view.require(document);

      if (document.legalHold) return Decision.deny("Legal hold");

      if (document.status === "archived") return Decision.deny("Archived");

      const user = yield* CurrentUser;
      const member = yield* directory.membership(user.id, document.orgId);

      if (Option.isNone(member)) return Decision.deny("Not a member");

      const editor =
        elevated(member.value) ||
        document.ownerId === user.id ||
        Option.contains(yield* directory.share(user.id, document.id), "edit");

      return editor ? Decision.allow() : Decision.deny("Read only");
    });
  }),
).pipe(Layer.provide(ViewDocumentLayer), PermissionAudit.record(EditDocument));

export const EditDocumentFilterLayer = EditDocumentFilter.toLayer(
  Effect.gen(function* () {
    const directory = yield* Directory;
    const viewFilter = yield* ViewDocumentFilter;

    return Effect.fn(function* (where) {
      const user = yield* CurrentUser;
      const shared = yield* directory.shared(user.id, "edit");
      const memberships = yield* directory.memberships(user.id);

      return where.and(
        yield* viewFilter.condition,
        where.not(where.eq("legalHold", true)),
        where.not(where.eq("status", "archived")),
        where.or(
          ...memberships.map((member) =>
            where.and(
              where.eq("orgId", member.orgId),
              elevated(member) ? where.all() : where.eq("ownerId", user.id),
            ),
          ),
          // Shares once, rather than in every membership: the list can be long.
          where.and(
            where.oneOf("id", shared),
            where.oneOf(
              "orgId",
              memberships.map(({ orgId }) => orgId),
            ),
          ),
        ),
      );
    });
  }),
).pipe(Layer.provide(ViewDocumentFilterLayer));

export const DeleteDocumentLayer = DeleteDocument.toLayer(
  Effect.gen(function* () {
    const directory = yield* Directory;
    const edit = yield* EditDocument;

    return Effect.fn(function* (document) {
      yield* edit.require(document);

      if (document.status !== "draft") return Decision.deny("Only drafts");

      const user = yield* CurrentUser;

      const owner =
        document.ownerId === user.id ||
        Option.exists(
          yield* directory.membership(user.id, document.orgId),
          ({ role }) => role === "owner",
        );

      return owner ? Decision.allow() : Decision.deny("Owners only");
    });
  }),
).pipe(Layer.provide(EditDocumentLayer), PermissionAudit.record(DeleteDocument));

export const DeleteDocumentFilterLayer = DeleteDocumentFilter.toLayer(
  Effect.gen(function* () {
    const directory = yield* Directory;
    const editFilter = yield* EditDocumentFilter;

    return Effect.fn(function* (where) {
      const user = yield* CurrentUser;

      return where.and(
        yield* editFilter.condition,
        where.eq("status", "draft"),
        where.or(
          where.eq("ownerId", user.id),
          ...(yield* directory.memberships(user.id)).flatMap((member) =>
            member.role === "owner" ? [where.eq("orgId", member.orgId)] : [],
          ),
        ),
      );
    });
  }),
).pipe(Layer.provide(EditDocumentFilterLayer));

export const layer = Layer.mergeAll(
  ViewDocumentLayer,
  ViewDocumentFilterLayer,
  EditDocumentLayer,
  EditDocumentFilterLayer,
  DeleteDocumentLayer,
  DeleteDocumentFilterLayer,
);
