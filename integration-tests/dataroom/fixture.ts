import * as Credentials from "@distilled.cloud/aws/Credentials";
import * as S3 from "@distilled.cloud/aws/s3";
import * as AssetSigning from "@kutur-kit/assets/AssetSigning";
import * as RustfsContainer from "@kutur-kit/testcontainers/RustfsContainer";
import { rustfs } from "@kutur-kit/testcontainers/vitest";
import { Auth, Client, Operations, WebCrypto } from "@yielded/auth";
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
import { Database, type Seed } from "./database.ts";
import { type Membership, ProjectId, UserId } from "./domain.ts";
import * as Policies from "./policies.ts";
import { Profiles } from "./profiles.ts";
import { ProjectFiles } from "./project-files.ts";
import { AuthLive, origin, Routes } from "./server.ts";
import { Storage } from "./storage.ts";

/** Owns acme. */
export const ada = UserId.make("ada");

/** A member of acme. */
export const bob = UserId.make("bob");

/** A guest of acme: reads, uploads nothing. */
export const cara = UserId.make("cara");

/** A member of globex only. */
export const dan = UserId.make("dan");

/** Belongs to no organization. */
export const eve = UserId.make("eve");

export const launch = ProjectId.make("acme-launch");

export const merger = ProjectId.make("globex-merger");

const memberships: ReadonlyArray<Membership> = [
  { userId: ada, orgId: "acme", role: "owner" },
  { userId: bob, orgId: "acme", role: "member" },
  { userId: cara, orgId: "acme", role: "guest" },
  { userId: dan, orgId: "globex", role: "member" },
];

const seed: Seed = {
  memberships,
  projects: [
    { id: launch, orgId: "acme", name: "Launch" },
    { id: merger, orgId: "globex", name: "Merger" },
  ],
};

/**
 * Both buckets, fresh on the S3-compatible server for each test, reached as
 * the app would reach production storage. With `refused`, the app signs its
 * requests with a secret the storage does not accept.
 */
export const storage = (options: { readonly refused?: boolean } = {}) =>
  Layer.unwrap(
    Effect.gen(function* () {
      const server = yield* RustfsContainer.RustfsContainer;
      const documents = yield* RustfsContainer.bucket;
      const avatars = yield* RustfsContainer.bucket;

      // As the deployment configures it: browsers upload from the app's origin.
      yield* S3.putBucketCors({
        Bucket: documents,
        CORSConfiguration: {
          CORSRules: [
            {
              AllowedOrigins: [origin],
              AllowedMethods: ["PUT"],
              AllowedHeaders: [...AssetSigning.uploadHeaders],
            },
          ],
        },
      }).pipe(Effect.orDie);

      const buckets = Storage({ endpoint: server.endpoint, documents, avatars });

      return options.refused === true
        ? buckets.pipe(
            Layer.provide(
              Credentials.fromCredentials(
                { accessKeyId: server.accessKeyId, secretAccessKey: Redacted.make("wrong") },
                server.region,
              ),
            ),
          )
        : buckets;
    }),
  ).pipe(Layer.provide(RustfsContainer.aws), Layer.provide(rustfs));

/** The app's services on a fresh database and buckets. */
export const app = <A, E, R>(buckets: Layer.Layer<A, E, R>) =>
  Layer.mergeAll(ProjectFiles.layer, Profiles.layer).pipe(
    Layer.provideMerge(Policies.layer),
    Layer.provideMerge(Database.auditLog),
    Layer.provideMerge(buckets),
    Layer.provideMerge(Database.layer(seed)),
    Layer.provide(WebCrypto.layerWebCrypto),
  );

/**
 * A browser's fetch: requests to the app go to the API served in this
 * process, with its cookies and headers, and other origins, such as storage,
 * over the network.
 */
export const server = Layer.effect(
  HttpClient.HttpClient,
  Effect.gen(function* () {
    const routes = yield* HttpRouter.toHttpEffect(
      Routes.pipe(Layer.provide(HttpServer.layerServices)),
    );

    // Each request brings its own Scope and HttpServerRequest.
    type Provided = Exclude<
      Effect.Services<typeof routes>,
      Scope.Scope | HttpServerRequest.HttpServerRequest
    >;

    const handler = HttpEffect.toWebHandlerWith<Provided, Effect.Services<typeof routes>>(
      yield* Effect.context<Provided>(),
    )(routes);

    // Fresh: a layer is built once per run and shared, and storage's client
    // has already built this one, without the Fetch below.
    return yield* HttpClient.HttpClient.pipe(
      Effect.provide(Layer.fresh(FetchHttpClient.layer)),
      Effect.provideService(FetchHttpClient.Fetch, (input, init) => {
        const request = new Request(input, init);

        return new URL(request.url).origin === origin ? handler(request) : fetch(request);
      }),
    );
  }),
).pipe(Layer.provideMerge(AuthLive));

const AppClient = Client.make(AuthApi, { baseUrl: origin });

const emailOf = (user: string) => `${user}@dataroom.test`;

const passwordOf = (user: string) => `${user} correct horse battery staple`;

/** Creates the user's account, as an administrator would. */
const provision = (user: string) =>
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
  const fetchClient = yield* HttpClient.HttpClient;

  // Cookies and the app's headers go to the app alone, as a browser sends them.
  const httpClient = fetchClient.pipe(
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

  return { auth, api, httpClient, storage: fetchClient };
});

/** A browser signed in as the user, whose account is created first. */
export const signedIn = (user: string) =>
  Effect.gen(function* () {
    yield* provision(user);

    const session = yield* browser;

    yield* session.auth.auth.signIn({ email: emailOf(user), password: passwordOf(user) });

    return session;
  });
