import { Auth, Client, Operations } from "@yielded/auth";
import { Effect, Layer, Redacted, Ref, type Scope } from "effect";
import {
  Cookies,
  FetchHttpClient,
  HttpClient,
  HttpClientRequest,
  HttpEffect,
  HttpRouter,
  HttpServer,
  type HttpServerRequest,
} from "effect/http";
import { HttpApiClient } from "effect/http-api";

import { AppAuth } from "./accounts.ts";
import { Api, AuthApi } from "./api.ts";
import { collector, generate, outsider, users } from "./data.ts";
import { Database } from "./database.ts";
import { Directory } from "./directory.ts";
import { Documents } from "./documents.ts";
import { CurrentUser } from "./domain.ts";
import * as Policies from "./policies.ts";
import { AuthLive, origin, Routes } from "./server.ts";

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

/**
 * A client of the API served in this process. Requests and responses go
 * through Fetch and the whole HTTP stack, sharing the test's services.
 */
export const server = Layer.effect(
  HttpClient.HttpClient,
  Effect.gen(function* () {
    const app = yield* HttpRouter.toHttpEffect(
      Routes.pipe(Layer.provide(HttpServer.layerServices)),
    );

    // Each request brings its own Scope and HttpServerRequest.
    type Provided = Exclude<
      Effect.Services<typeof app>,
      Scope.Scope | HttpServerRequest.HttpServerRequest
    >;

    const handler = HttpEffect.toWebHandlerWith<Provided, Effect.Services<typeof app>>(
      yield* Effect.context<Provided>(),
    )(app);

    return yield* HttpClient.HttpClient.pipe(
      Effect.provide(FetchHttpClient.layer),
      Effect.provideService(FetchHttpClient.Fetch, (input, init) =>
        handler(new Request(input, init)),
      ),
    );
  }),
).pipe(Layer.provideMerge(AuthLive));

export const AppClient = Client.make(AuthApi, { baseUrl: origin });

export const emailOf = (user: string) => `${user}@workspaces.test`;

export const passwordOf = (user: string) => `${user} correct horse battery staple`;

/** Creates the user's account, as an administrator would. */
export const provision = (user: string) =>
  Effect.gen(function* () {
    const auth = yield* AppAuth;

    yield* auth.register({
      requestId: `provision-${user}`,
      email: emailOf(user),
      newPassword: passwordOf(user),
      registration: { userId: user },
    });
  }).pipe(
    // Outside any request: registration issues no credentials.
    Effect.provideService(Auth.AuthRequest, {
      credentials: {},
      invocation: Operations.guest,
      credentialCommandSink: () => Effect.void,
    }),
  );

/**
 * A browser on the app's origin: it keeps cookies, sends its Origin and, as
 * the app's own code would, the CSRF header.
 */
export const browser = Effect.gen(function* () {
  const cookies = yield* Ref.make(Cookies.empty);

  const httpClient = (yield* HttpClient.HttpClient).pipe(
    HttpClient.withCookiesRef(cookies),
    HttpClient.mapRequest(HttpClientRequest.setHeader("origin", origin)),
  );

  const auth = yield* AppClient.make.pipe(Effect.provideService(HttpClient.HttpClient, httpClient));

  const api = yield* HttpApiClient.makeWith(Api, {
    baseUrl: origin,
    httpClient: httpClient.pipe(
      HttpClient.mapRequest(HttpClientRequest.setHeader("x-effect-auth-csrf", "1")),
    ),
  });

  return { auth, api, cookies, httpClient };
});

/** A browser signed in as the user, whose account is created first. */
export const signedIn = (user: string) =>
  Effect.gen(function* () {
    yield* provision(user);

    const session = yield* browser;

    yield* session.auth.auth.signIn({ email: emailOf(user), password: passwordOf(user) });

    return session;
  });

/** An agent's client, authenticating with a bearer token alone. */
export const agent = (token: Redacted.Redacted<string>) =>
  Effect.flatMap(HttpClient.HttpClient, (httpClient) =>
    HttpApiClient.makeWith(Api, {
      baseUrl: origin,
      httpClient: httpClient.pipe(
        HttpClient.mapRequest(HttpClientRequest.bearerToken(Redacted.value(token))),
      ),
    }),
  );
