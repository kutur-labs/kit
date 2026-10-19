import { Permission } from "@kutur-kit/access";
import { Schema } from "effect";

import { type CurrentUser, File, MembershipUnavailable, Project } from "./domain.ts";

export class ViewProject extends Permission.Service<ViewProject, { requires: CurrentUser }>()(
  "dataroom/ViewProject",
  { id: "projects.view", target: Project, error: MembershipUnavailable },
) {}

export class UploadFile extends Permission.Service<UploadFile, { requires: CurrentUser }>()(
  "dataroom/UploadFile",
  {
    id: "files.upload",
    target: Project,
    error: Schema.Union([ViewProject.Denied, MembershipUnavailable]),
  },
) {}

export class ViewFile extends Permission.Service<ViewFile, { requires: CurrentUser }>()(
  "dataroom/ViewFile",
  { id: "files.view", target: File, error: MembershipUnavailable },
) {}

export class DeleteFile extends Permission.Service<DeleteFile, { requires: CurrentUser }>()(
  "dataroom/DeleteFile",
  {
    id: "files.delete",
    target: File,
    error: Schema.Union([ViewFile.Denied, MembershipUnavailable]),
  },
) {}
