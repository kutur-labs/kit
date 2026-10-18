import type { CurrentUser } from "./domain.ts";

import { Decision } from "@kutur-kit/access";
import { Asset } from "@kutur-kit/assets";
import * as AssetSigning from "@kutur-kit/assets/AssetSigning";
import { AuthContract, OperationHttp, SessionContract } from "@yielded/auth";
import { Schema } from "effect";
import {
  HttpApi,
  HttpApiEndpoint,
  HttpApiGroup,
  HttpApiMiddleware,
  HttpApiSchema,
  HttpApiSecurity,
} from "effect/http-api";

import { Avatar, ProjectFile } from "./assets.ts";
import {
  File,
  FileId,
  FileNotFound,
  ProjectId,
  ProjectNotFound,
  StorageUnavailable,
  UserId,
} from "./domain.ts";

// Shared with clients: schemas only, no keys or storage.

export const AuthApi = AuthContract.make("dataroom/Auth", {
  claims: Schema.Struct({}),
  actions: (sessions) => ({ signIn: AuthContract.passwordSignIn(sessions) }),
});

export const SessionHttp = SessionContract.makeSessionHttpContract(
  "dataroom/Auth",
  AuthApi.sessions.Session,
  { cookieName: "dataroom-session" },
);

export class Unauthenticated extends Schema.TaggedError<
  Unauthenticated,
  { readonly brand: unique symbol }
>()("Unauthenticated", {}, { httpApiStatus: 401 }) {}

/** The request failed the Origin or CSRF checks a cookie-authenticated change needs. */
export class CrossSiteRequest extends Schema.TaggedError<
  CrossSiteRequest,
  { readonly brand: unique symbol }
>()("CrossSiteRequest", {}, { httpApiStatus: 403 }) {}

export class AuthenticationUnavailable extends Schema.TaggedError<
  AuthenticationUnavailable,
  { readonly brand: unique symbol }
>()("AuthenticationUnavailable", {}, { httpApiStatus: 503 }) {}

/** @effect-expect-leaking HttpServerRequest | ParsedSearchParams | RouteContext */
export class Authentication extends HttpApiMiddleware.Service<
  Authentication,
  { provides: CurrentUser }
>()("dataroom/Authentication", {
  security: { session: HttpApiSecurity.apiKey({ in: "cookie", key: SessionHttp.cookieName }) },
  error: [
    Unauthenticated,
    CrossSiteRequest,
    AuthenticationUnavailable,
    // Auth's request middleware refuses malformed requests first.
    ...([400, 403, 413] as const).map((status) =>
      OperationHttp.OperationHttpError.annotate({ httpApiStatus: status }),
    ),
  ],
}) {}

/** What a client declares before uploading a file: its name, type and size. */
export const NewFile = Schema.Struct({
  ...AssetSigning.Upload(ProjectFile).fields,
  name: Schema.NonEmptyString.check(Schema.isMaxLength(200)),
});

export const StartedUpload = Schema.Struct({
  file: File,
  /** Where the client sends the file: straight to storage. */
  upload: AssetSigning.SignedRequest,
});

const fileParams = { id: FileId };

export const Projects = HttpApiGroup.make("projects")
  .add(
    HttpApiEndpoint.get("files", "/projects/:id/files", {
      params: { id: ProjectId },
      success: Schema.Array(File),
      error: [ProjectNotFound],
    }),
    HttpApiEndpoint.post("upload", "/projects/:id/files", {
      params: { id: ProjectId },
      payload: NewFile,
      success: StartedUpload.pipe(HttpApiSchema.status(201)),
      error: [
        ProjectNotFound,
        Decision.Denied,
        Asset.UnsupportedContentType,
        Asset.TooLarge,
        StorageUnavailable,
      ],
    }),
  )
  .middleware(Authentication);

export const Files = HttpApiGroup.make("files")
  .add(
    HttpApiEndpoint.post("complete", "/files/:id/complete", {
      params: fileParams,
      success: File,
      error: [FileNotFound, AssetSigning.UploadNotConfirmed, StorageUnavailable],
    }),
    HttpApiEndpoint.post("download", "/files/:id/download", {
      params: fileParams,
      success: AssetSigning.SignedRequest,
      error: [FileNotFound, StorageUnavailable],
    }),
    HttpApiEndpoint.delete("remove", "/files/:id", {
      params: fileParams,
      success: HttpApiSchema.NoContent,
      error: [FileNotFound, Decision.Denied, StorageUnavailable],
    }),
  )
  .middleware(Authentication);

// One encoding per accepted type, for OpenAPI and the typed client.
const images = Avatar.contentTypes.map((contentType) =>
  Schema.Uint8Array.pipe(HttpApiSchema.asUint8Array({ contentType })),
);

export const Account = HttpApiGroup.make("account")
  .add(
    // Small, so it passes through the app, streamed to storage.
    HttpApiEndpoint.put("avatar", "/me/avatar", {
      payload: images,
      success: HttpApiSchema.NoContent,
      error: [
        Asset.UnsupportedContentType,
        Asset.TooLarge,
        Asset.ContentLengthMismatch,
        StorageUnavailable,
      ],
    }),
  )
  .middleware(Authentication);

export const Profile = Schema.Struct({
  id: UserId,
  /** Where browsers load the avatar from; null without one. */
  avatarUrl: Schema.NullOr(Schema.String),
});

/** Profiles are public, as avatars are. */
export const Profiles = HttpApiGroup.make("profiles").add(
  HttpApiEndpoint.get("get", "/users/:id", {
    params: { id: UserId },
    success: Profile,
  }),
);

export const Api = HttpApi.make("dataroom").add(
  Projects,
  Files,
  Account,
  Profiles,
  AuthContract.httpGroup(AuthApi),
);
