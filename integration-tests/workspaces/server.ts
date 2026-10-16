import * as Audit from "@kutur-kit/audit/Audit";
import { Auth, EmailDelivery, Http, Operations, Password, WebCrypto } from "@yielded/auth";
import * as KdfAdmission from "@yielded/crypto/KdfAdmission";
import * as NodeCrypto from "@yielded/crypto/platform-node";
import { Crypto, Effect, Layer, Option, Predicate, Redacted } from "effect";
import { HttpServerRequest, type HttpServerResponse } from "effect/http";
import { HttpApiBuilder } from "effect/http-api";

import { AppAuth, Persistence, storage } from "./accounts.ts";
import {
  Api,
  Authentication,
  AuthenticationUnavailable,
  CrossSiteRequest,
  SessionAuthentication,
  SessionHttp,
  Unauthenticated,
} from "./api.ts";
import { Documents } from "./documents.ts";
import { CurrentUser } from "./domain.ts";
import { AgentScopes } from "./permissions.ts";
import { AgentTokens } from "./tokens.ts";

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
  // PostgreSQL keeps its own clock, which may lag ours a little. Auth and its
  // storage compare the two, and by default tolerate no difference at all.
  Layer.provideMerge(Operations.AuthenticationClock.layer({ futureToleranceMillis: 1_000 })),
  Layer.orDie,
);

const authenticateSession = Effect.gen(function* () {
  const auth = yield* AppAuth;

  return Effect.fnUntraced(function* <E>(
    httpEffect: Effect.Effect<HttpServerResponse.HttpServerResponse, E, CurrentUser>,
  ) {
    // Supplied for each request by `http.middleware`, which wraps the routes,
    // so it is missing only when they are composed without it.
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

    // Cookies come with any request, so a change must also pass the Origin
    // and CSRF checks; a bearer token is never sent by the browser itself.
    yield* method === "GET" || method === "HEAD"
      ? Effect.void
      : http.protect(Effect.void).pipe(
          Effect.mapError(() => new CrossSiteRequest()),
          Effect.provideService(Auth.AuthRequest, request),
        );

    return yield* httpEffect.pipe(
      Effect.provideService(CurrentUser, { id: session.subjectId }),
      Audit.withActor({ id: session.subjectId, kind: "user" }),
    );
  });
});

const AuthenticationLive = Layer.effect(
  Authentication,
  Effect.gen(function* () {
    const tokens = yield* AgentTokens;
    const session = yield* authenticateSession;

    return Authentication.of({
      agent: Effect.fn("Authentication.agent")(function* (httpEffect, { credential }) {
        const token =
          Redacted.value(credential) === "" ? Option.none() : yield* tokens.find(credential);

        return yield* Option.match(token, {
          onNone: () => Effect.fail(new Unauthenticated()),
          onSome: ({ id, userId, scopes }) =>
            httpEffect.pipe(
              AgentScopes.restrictTo(scopes),
              Effect.provideService(CurrentUser, { id: userId }),
              Audit.withActor({ id, kind: "agent", onBehalfOf: userId }),
            ),
        });
      }),
      session: (httpEffect) => session(httpEffect),
    });
  }),
);

const SessionAuthenticationLive = Layer.effect(
  SessionAuthentication,
  Effect.map(authenticateSession, (session) =>
    SessionAuthentication.of({ session: (httpEffect) => session(httpEffect) }),
  ),
);

const DocumentsHandlers = HttpApiBuilder.group(Api, "documents", (handlers) =>
  Effect.gen(function* () {
    const documents = yield* Documents;

    return handlers
      .handle("list", ({ query: { after, limit = 50 } }) =>
        // One more than asked tells whether another page follows.
        Effect.map(documents.visibleAfter(after, limit + 1), (ids) => ({
          ids: ids.slice(0, limit),
          next: ids.length > limit ? (ids[limit - 1] ?? null) : null,
        })),
      )
      .handle("get", ({ params }) => documents.view(params.id))
      .handle("rename", ({ params, payload }) => documents.edit(params.id, payload.title))
      .handle("delete", ({ params }) => documents.delete(params.id));
  }),
);

const TokensHandlers = HttpApiBuilder.group(Api, "tokens", (handlers) =>
  Effect.gen(function* () {
    const tokens = yield* AgentTokens;

    return handlers
      .handle("issue", ({ payload }) => tokens.issue(payload.scopes))
      .handle("revoke", ({ params }) => tokens.revoke(params.id));
  }),
);

/** The API, needing `AuthLive`, the documents and the database. */
export const Routes = HttpApiBuilder.layer(Api).pipe(
  Layer.provide(http.handlers(Api)),
  Layer.provide([DocumentsHandlers, TokensHandlers]),
  Layer.provide([AuthenticationLive, SessionAuthenticationLive]),
  http.middleware,
  Layer.provide(AgentTokens.layer),
);
