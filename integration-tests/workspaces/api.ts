import type { CurrentUser } from "./domain.ts";

import { Decision } from "@kutur-kit/access";
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

import { DirectoryUnavailable, Document, DocumentNotFound } from "./domain.ts";

// Shared with clients: schemas only, no keys or storage.

export const AuthApi = AuthContract.make("workspaces/Auth", {
  claims: Schema.Struct({}),
  actions: (sessions) => ({ signIn: AuthContract.passwordSignIn(sessions) }),
});

export const SessionHttp = SessionContract.makeSessionHttpContract(
  "workspaces/Auth",
  AuthApi.sessions.Session,
  { cookieName: "workspaces-session" },
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

const authenticationErrors = [
  Unauthenticated,
  CrossSiteRequest,
  AuthenticationUnavailable,
  // Auth's request middleware runs first and refuses malformed requests, such
  // as an empty session cookie, with the statuses it gives these reasons.
  ...([400, 403, 413] as const).map((status) =>
    OperationHttp.OperationHttpError.annotate({ httpApiStatus: status }),
  ),
];

const session = HttpApiSecurity.apiKey({ in: "cookie", key: SessionHttp.cookieName });

/**
 * A signed-in user, or an agent acting for one with its token's scopes.
 *
 * @effect-expect-leaking HttpServerRequest | ParsedSearchParams | RouteContext
 */
export class Authentication extends HttpApiMiddleware.Service<
  Authentication,
  { provides: CurrentUser }
>()("workspaces/Authentication", {
  // Tried in order: a request without a bearer token falls through to its cookie.
  security: { agent: HttpApiSecurity.bearer, session },
  error: authenticationErrors,
}) {}

/** Only a signed-in user, for actions an agent must not take for itself. */
export class SessionAuthentication extends HttpApiMiddleware.Service<
  SessionAuthentication,
  { provides: CurrentUser }
>()("workspaces/SessionAuthentication", {
  security: { session },
  error: authenticationErrors,
}) {}

export const DocumentPage = Schema.Struct({
  ids: Schema.Array(Schema.String),
  next: Schema.NullOr(Schema.String),
});

export const Documents = HttpApiGroup.make("documents")
  .add(
    HttpApiEndpoint.get("list", "/documents", {
      query: {
        after: Schema.optionalKey(Schema.String),
        limit: Schema.optionalKey(
          Schema.NumberFromString.check(
            Schema.isInt(),
            Schema.isBetween({ minimum: 1, maximum: 100 }),
          ),
        ),
      },
      success: DocumentPage,
      error: DirectoryUnavailable,
    }),
    HttpApiEndpoint.get("get", "/documents/:id", {
      params: { id: Schema.String },
      success: Document,
      error: [DocumentNotFound, DirectoryUnavailable],
    }),
    HttpApiEndpoint.patch("rename", "/documents/:id", {
      params: { id: Schema.String },
      payload: Schema.Struct({ title: Schema.NonEmptyString.check(Schema.isMaxLength(200)) }),
      error: [DocumentNotFound, Decision.Denied, DirectoryUnavailable],
    }),
    HttpApiEndpoint.delete("delete", "/documents/:id", {
      params: { id: Schema.String },
      error: [DocumentNotFound, Decision.Denied, DirectoryUnavailable],
    }),
  )
  .middleware(Authentication);

export const IssuedToken = Schema.Struct({
  id: Schema.String,
  token: Schema.RedactedFromValue(Schema.String),
  /** The requested scopes that name permissions. */
  scopes: Schema.Array(Schema.String),
});

export class TokenNotFound extends Schema.TaggedError<
  TokenNotFound,
  { readonly brand: unique symbol }
>()("TokenNotFound", {}, { httpApiStatus: 404 }) {}

export const Tokens = HttpApiGroup.make("tokens")
  .add(
    HttpApiEndpoint.post("issue", "/tokens", {
      payload: Schema.Struct({ scopes: Schema.Array(Schema.String) }),
      success: IssuedToken.pipe(HttpApiSchema.status(201)),
    }),
    HttpApiEndpoint.delete("revoke", "/tokens/:id", {
      params: { id: Schema.String },
      error: TokenNotFound,
    }),
  )
  .middleware(SessionAuthentication);

export const Api = HttpApi.make("workspaces").add(
  Documents,
  Tokens,
  AuthContract.httpGroup(AuthApi),
);
