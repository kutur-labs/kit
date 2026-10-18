import { Decision } from "@kutur-kit/access";
import * as PermissionAudit from "@kutur-kit/access/audit";
import { Effect, Layer, Option } from "effect";

import { CurrentUser, type Membership } from "./domain.ts";
import { Memberships } from "./memberships.ts";
import { DeleteFile, UploadFile, ViewFile, ViewProject } from "./permissions.ts";

const elevated = (member: Membership) => member.role === "owner" || member.role === "admin";

/** The current user and their membership of the organization, read when a policy runs. */
const membership = Effect.map(
  Memberships,
  (memberships) => (orgId: string) =>
    Effect.flatMap(CurrentUser, (user) =>
      Effect.map(memberships.find(user.id, orgId), (member) => ({ user, member })),
    ),
);

// Anyone in the project's organization sees it, guests included.
export const ViewProjectLayer = ViewProject.toLayer(
  Effect.map(
    membership,
    (find) => (project) =>
      Effect.map(find(project.orgId), ({ member }) =>
        Option.isSome(member) ? Decision.allow() : Decision.deny("Not a member"),
      ),
  ),
);

// Members upload; guests only read.
export const UploadFileLayer = UploadFile.toLayer(
  Effect.gen(function* () {
    const view = yield* ViewProject;
    const find = yield* membership;

    return Effect.fn(function* (project) {
      yield* view.require(project);

      const { member } = yield* find(project.orgId);

      return Option.exists(member, ({ role }) => role !== "guest")
        ? Decision.allow()
        : Decision.deny("Guests cannot upload");
    });
  }),
).pipe(Layer.provide(ViewProjectLayer), PermissionAudit.record(UploadFile));

// Members see ready files; a pending one only its uploader, who completes it.
export const ViewFileLayer = ViewFile.toLayer(
  Effect.map(
    membership,
    (find) => (file) =>
      Effect.map(find(file.orgId), ({ user, member }) =>
        Option.isNone(member)
          ? Decision.deny("Not a member")
          : file.status === "ready" || file.uploaderId === user.id
            ? Decision.allow()
            : Decision.deny("Pending"),
      ),
  ),
);

// Its uploader, or the organization's owners and admins, delete a file.
export const DeleteFileLayer = DeleteFile.toLayer(
  Effect.gen(function* () {
    const view = yield* ViewFile;
    const find = yield* membership;

    return Effect.fn(function* (file) {
      yield* view.require(file);

      const { user, member } = yield* find(file.orgId);

      return file.uploaderId === user.id || Option.exists(member, elevated)
        ? Decision.allow()
        : Decision.deny("Uploader or admins only");
    });
  }),
).pipe(Layer.provide(ViewFileLayer), PermissionAudit.record(DeleteFile));

export const layer = Layer.mergeAll(
  ViewProjectLayer,
  UploadFileLayer,
  ViewFileLayer,
  DeleteFileLayer,
).pipe(Layer.provide(Memberships.layer));
