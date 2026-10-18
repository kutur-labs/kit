import { Permission } from "@kutur-kit/access";

import { type CurrentUser, File, Project } from "./domain.ts";

export class ViewProject extends Permission.Service<ViewProject, { requires: CurrentUser }>()(
  "dataroom/ViewProject",
  { id: "projects.view", target: Project },
) {}

export class UploadFile extends Permission.Service<UploadFile, { requires: CurrentUser }>()(
  "dataroom/UploadFile",
  { id: "files.upload", target: Project, error: ViewProject.Denied },
) {}

export class ViewFile extends Permission.Service<ViewFile, { requires: CurrentUser }>()(
  "dataroom/ViewFile",
  { id: "files.view", target: File },
) {}

export class DeleteFile extends Permission.Service<DeleteFile, { requires: CurrentUser }>()(
  "dataroom/DeleteFile",
  { id: "files.delete", target: File, error: ViewFile.Denied },
) {}
