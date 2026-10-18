import { Asset, AssetBucket } from "@kutur-kit/assets";
import { Schema } from "effect";

import { AvatarId, FileId, ProjectId } from "./domain.ts";

/** Project files: private, read through short-lived signed URLs. */
export class Documents extends AssetBucket.Service<Documents>()("documents") {}

/** Avatars: public, served from a CDN, so only types browsers render inertly. */
export class Avatars extends AssetBucket.Service<Avatars>()("avatars") {}

/** A file in a project. Uploads go straight to storage, so they may be large. */
export const ProjectFile = Asset.make("projects", {
  bucket: Documents,
  key: Schema.TemplateLiteralParser([ProjectId, "/", FileId]),
  contentTypes: [
    "application/pdf",
    "image/png",
    "image/jpeg",
    "text/plain",
    "text/csv",
    "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  ],
  maxSize: "50 MiB",
});

/**
 * A user's avatar, under its own id rather than the user's: a replaced avatar
 * gets a new URL, so the CDN and browsers may cache each one forever.
 */
export const Avatar = Asset.make("avatar", {
  bucket: Avatars,
  key: AvatarId,
  contentTypes: ["image/png", "image/jpeg", "image/webp"],
  maxSize: "2 MiB",
  cacheControl: "public, max-age=31536000, immutable",
});
