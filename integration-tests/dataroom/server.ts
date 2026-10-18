import { Asset } from "@kutur-kit/assets";
import * as Audit from "@kutur-kit/audit/Audit";
import { Auth, EmailDelivery, Http, Operations, Password, WebCrypto } from "@yielded/auth";
import * as KdfAdmission from "@yielded/crypto/KdfAdmission";
import * as NodeCrypto from "@yielded/crypto/platform-node";
import { ByteSize, Crypto, Effect, Layer, Option, Predicate, Schema, Stream } from "effect";
import { HttpServerRequest } from "effect/http";
import { HttpApiBuilder } from "effect/http-api";

import { AppAuth, Persistence, storage } from "./accounts.ts";
import {
  Api,
  Authentication,
  AuthenticationUnavailable,
  CrossSiteRequest,
  SessionHttp,
  Unauthenticated,
} from "./api.ts";
import { Avatar } from "./assets.ts";
import { CurrentUser, UserId } from "./domain.ts";
import { Profiles } from "./profiles.ts";
import { ProjectFiles } from "./project-files.ts";
import { StorageRoutes } from "./storage.ts";

export const origin = "http://localhost";

export const http = Http.make(AppAuth, {
  origin,
  // Plain HTTP on a loopback origin, as in development.
  cookie: { name: SessionHttp.cookieName, secure: false },
});

const ProvisioningLive = Layer.effect(
  Persistence.Provisioning,
  Effect.gen(function* () {
    const crypto = yield* Crypto.Crypto;

    return {
      password: {
        values: ({ registration }) =>
          crypto.randomUUIDv4().pipe(
            Effect.map((securityRevision) => ({
              id: registration.userId,
              active: true,
              securityRevision,
            })),
            Effect.mapError(() => Password.PasswordUnavailable.make({})),
          ),
      },
    };
  }),
);

const PasswordLive = Layer.mergeAll(
  Password.PasswordHashing.layer(Password.defaultScryptPasswordHashingConfig).pipe(
    Layer.provide(Layer.provideMerge(NodeCrypto.layer(), KdfAdmission.layer())),
  ),
  Layer.succeed(AppAuth.strategies.password.SessionClaims, { resolve: () => Effect.succeed({}) }),
  // No breach screening: passwords are only set by provisioning.
  Layer.succeed(Password.CompromisedPasswords, {
    check: () => Effect.succeed({ _tag: "Allowed" as const }),
  }),
  // Clients can change no password, so no change is ever authorized.
  Layer.succeed(Password.PasswordActionEvidence, {
    verify: () => Effect.fail(Password.PasswordActionRequired.make({})),
  }),
  // Clients cannot request a reset, so nothing is ever sent.
  Layer.succeed(EmailDelivery.EmailDelivery, {
    send: () => Effect.fail(EmailDelivery.EmailNotAccepted.make({})),
  }),
);

export const AuthLive = http.layer.pipe(
  Layer.provide(PasswordLive),
  Layer.provide(Persistence.layer.pipe(Layer.provide(ProvisioningLive))),
  Layer.provide(Persistence.Config.layer(storage)),
  Layer.provideMerge(WebCrypto.layerWebCrypto),
  // PostgreSQL keeps its own clock, which may lag ours a little.
  Layer.provideMerge(Operations.AuthenticationClock.layer({ futureToleranceMillis: 1_000 })),
  Layer.orDie,
);

const AuthenticationLive = Layer.effect(
  Authentication,
  Effect.gen(function* () {
    const auth = yield* AppAuth;

    return Authentication.of({
      session: Effect.fnUntraced(function* (httpEffect) {
        // Supplied for each request by `http.middleware`, which wraps the routes.
        const request = yield* Effect.serviceOption(Auth.AuthRequest).pipe(
          Effect.flatMap(Effect.fromOption),
          Effect.orDie,
        );

        const session = yield* auth.requireSession().pipe(
          Effect.mapError((error) =>
            Predicate.isTagged(error, "SessionUnavailable")
              ? new AuthenticationUnavailable()
              : new Unauthenticated(),
          ),
          Effect.provideService(Auth.AuthRequest, request),
        );

        const { method } = yield* HttpServerRequest.HttpServerRequest;

        // Cookies come with any request, so a change must also pass the
        // Origin and CSRF checks.
        yield* method === "GET" || method === "HEAD"
          ? Effect.void
          : http.protect(Effect.void).pipe(
              Effect.mapError(() => new CrossSiteRequest()),
              Effect.provideService(Auth.AuthRequest, request),
            );

        const id = UserId.make(session.subjectId);

        return yield* httpEffect.pipe(
          Effect.provideService(CurrentUser, { id }),
          Audit.withActor({ id, kind: "user" }),
        );
      }),
    });
  }),
);

const ProjectsHandlers = HttpApiBuilder.group(Api, "projects", (handlers) =>
  Effect.map(ProjectFiles, (files) =>
    handlers
      .handle("files", ({ params }) => files.list(params.id))
      .handle("upload", ({ params, payload }) => files.start(params.id, payload)),
  ),
);

const FilesHandlers = HttpApiBuilder.group(Api, "files", (handlers) =>
  Effect.map(ProjectFiles, (files) =>
    handlers
      .handle("complete", ({ params }) => files.complete(params.id))
      .handle("download", ({ params }) => files.download(params.id))
      .handle("remove", ({ params }) => files.remove(params.id)),
  ),
);

// A content type the avatar does not accept is unsupported, answered with 415
// rather than as a malformed request.
const contentType = (request: HttpServerRequest.HttpServerRequest) => {
  const header = request.headers["content-type"] ?? "";

  return Schema.decodeEffect(Avatar.ContentType)(header).pipe(
    Effect.mapError(
      () => new Asset.UnsupportedContentType({ asset: Avatar.id, contentType: header }),
    ),
  );
};

// Node rejects malformed Content-Length headers before routing, and chunked
// requests have none: those are measured as they stream.
const contentLength = (request: HttpServerRequest.HttpServerRequest) =>
  Option.getOrUndefined(
    Option.flatMap(Option.fromUndefinedOr(request.headers["content-length"]), (header) =>
      ByteSize.fromInput(Number(header)),
    ),
  );

const AccountHandlers = HttpApiBuilder.group(Api, "account", (handlers) =>
  Effect.map(Profiles, (profiles) =>
    // Raw, so the body streams to storage instead of being buffered here.
    handlers.handleRaw("avatar", ({ request }) =>
      Effect.flatMap(contentType(request), (type) =>
        // A client that disconnects mid-upload fails the request, not the API.
        profiles.replaceAvatar(Stream.orDie(request.stream), {
          contentType: type,
          contentLength: contentLength(request),
        }),
      ),
    ),
  ),
);

const ProfilesHandlers = HttpApiBuilder.group(Api, "profiles", (handlers) =>
  Effect.map(Profiles, (profiles) =>
    handlers.handle("get", ({ params }) =>
      Effect.map(profiles.avatarUrl(params.id), (url) => ({
        id: params.id,
        avatarUrl: Option.getOrNull(url),
      })),
    ),
  ),
);

/** The API and the avatars CDN path, needing `AuthLive`, the services and storage. */
export const Routes = Layer.mergeAll(
  HttpApiBuilder.layer(Api).pipe(
    Layer.provide(http.handlers(Api)),
    Layer.provide([ProjectsHandlers, FilesHandlers, AccountHandlers, ProfilesHandlers]),
    Layer.provide(AuthenticationLive),
    http.middleware,
  ),
  // Outside the auth middleware, as a CDN would be: it marks responses
  // `no-store`, and public avatars are cached.
  StorageRoutes,
);
