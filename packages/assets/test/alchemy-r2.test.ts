import * as Alchemy from "alchemy";
import * as Cloudflare from "alchemy/Cloudflare";
import * as State from "alchemy/State";
import * as Test from "alchemy/Test/Vitest";
import { Data, Effect, Schedule, Schema } from "effect";
import { HttpClient, HttpClientRequest, type HttpClientResponse } from "effect/http";
import { expect } from "vitest";

import * as AssetSigning from "../src/AssetSigning.ts";
import { AssetBucketContract, AssetSigningContract } from "../src/testing/index.ts";
import { appOrigin, Assets } from "./alchemy/bucket.ts";
import AssetsFixture from "./alchemy/worker.ts";

// Locally by default: alchemy's local providers run the Worker in workerd
// with an emulated bucket, without a Cloudflare account. `TEST_R2_LIVE=1`
// deploys both to the account of the current alchemy profile, or of
// `CLOUDFLARE_ACCOUNT_ID` and `CLOUDFLARE_API_TOKEN` in CI.
const live = process.env["TEST_R2_LIVE"] === "1";

const { test, beforeAll, afterAll, deploy, destroy } = Test.make({
  providers: Cloudflare.providers(),
  dev: !live,
  // In-process local providers: behind the dev sidecar, `destroy` hangs
  // under Vitest with alchemy 2.0.0-beta.83.
  sidecar: false,
});

const Stack = Alchemy.Stack(
  "AssetsR2Test",
  // State in `.alchemy/`; each run destroys what it deployed.
  { providers: Cloudflare.providers(), state: State.localState() },
  Effect.gen(function* () {
    const worker = yield* AssetsFixture;
    const bucket = yield* Assets;

    return { url: worker.url.as<string>(), publicDomain: bucket.publicDomain };
  }),
);

const stack = beforeAll(deploy(Stack), { timeout: 300_000 });

afterAll(destroy(Stack), { timeout: 300_000 });

class FixtureFailure extends Data.TaggedError("FixtureFailure")<{
  readonly status: number;
  readonly body: string;
}> {}

/**
 * Sends a request to a fixture route. A fresh deployment may not serve yet,
 * so 404s from the edge are retried; a 500 fails with the Worker's failure.
 */
const send = (path: string) =>
  Effect.gen(function* () {
    const { url } = yield* stack;
    const response = yield* HttpClient.execute(HttpClientRequest.post(`${url}${path}`));
    const failed = response.status === 500 || response.status === 404;

    return yield* failed
      ? Effect.flatMap(response.text, (body) =>
          Effect.fail(new FixtureFailure({ status: response.status, body })),
        )
      : Effect.succeed(response);
  }).pipe(
    Effect.retry({
      while: (error) => error instanceof FixtureFailure && error.status === 404,
      schedule: Schedule.spaced("2 seconds"),
      times: 15,
    }),
  );

const ok = (response: HttpClientResponse.HttpClientResponse) => expect(response.status).toBe(204);

// A fresh deployment takes a few seconds to answer its first request.
const timeout = 60_000;

AssetBucketContract.cases.forEach(({ name }, index) =>
  test(`R2 bucket ${name}`, Effect.map(send(`/bucket/${index}`), ok), { timeout }),
);

AssetSigningContract.cases.forEach(({ name }, index) =>
  test(`R2 signing ${name}`, Effect.map(send(`/signing/${index}`), ok), { timeout }),
);

test(
  "stores the content type and cache control as the HTTP metadata R2 serves",
  Effect.gen(function* () {
    const response = yield* send("/avatar");

    expect(yield* response.json).toEqual({
      contentType: "image/png",
      cacheControl: "public, max-age=31536000, immutable",
    });
  }),
  { timeout },
);

// The local S3 endpoint answers any preflight, so only R2 checks the rule.
test.skipIf(!live)(
  "lets browsers on the CORS rule's origins upload with signed URLs",
  Effect.gen(function* () {
    const signed = yield* send("/upload").pipe(
      Effect.flatMap((response) => response.json),
      Effect.flatMap(Schema.decodeUnknownEffect(Schema.toCodecJson(AssetSigning.SignedRequest))),
    );

    const requested = Object.keys(signed.headers);

    // What a browser checks: a 2xx answer that allows the origin and every
    // requested header. R2 answers 204, other S3 stores 200.
    const allows = (origin: string) =>
      Effect.map(
        HttpClient.execute(
          HttpClientRequest.make("OPTIONS")(signed.url).pipe(
            HttpClientRequest.setHeaders({
              origin,
              "access-control-request-method": signed.method,
              "access-control-request-headers": requested.join(","),
            }),
          ),
        ),
        (response) => {
          const allowed = (response.headers["access-control-allow-headers"] ?? "")
            .toLowerCase()
            .split(",")
            .map((header) => header.trim());

          return (
            response.status >= 200 &&
            response.status < 300 &&
            response.headers["access-control-allow-origin"] === origin &&
            requested.every((header) => allowed.includes(header) || allowed.includes("*"))
          );
        },
      );

    expect(yield* allows(appOrigin)).toBe(true);
    expect(yield* allows("https://elsewhere.example.com")).toBe(false);
  }),
  { timeout },
);

// Public domains are served by Cloudflare's edge; alchemy emulates none.
test.skipIf(!live)(
  "serves an object on the bucket's public domain with the cache control stored with it",
  Effect.gen(function* () {
    const { publicDomain } = yield* stack;

    yield* send("/avatar");

    const response = yield* HttpClient.get(`https://${publicDomain}/avatar/ada`);

    expect(response.status).toBe(200);
    expect(response.headers["cache-control"]).toBe("public, max-age=31536000, immutable");
  }),
  { timeout },
);
