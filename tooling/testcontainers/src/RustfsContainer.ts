import * as Credentials from "@distilled.cloud/aws/Credentials";
import * as Endpoint from "@distilled.cloud/aws/Endpoint";
import * as Region from "@distilled.cloud/aws/Region";
import * as S3 from "@distilled.cloud/aws/s3";
import { Config, Context, Effect, Layer, Option, Redacted, Stream } from "effect";
import * as FetchHttpClient from "effect/http/FetchHttpClient";
import { GenericContainer, Wait } from "testcontainers";

export const image =
  "rustfs/rustfs:1.0.3@sha256:9ca9559533b537d10482fe923288b676ad08f92a7069d9a17327fbae3cab688b";

const port = 9000;

/** An S3-compatible server for tests: RustFS, or another one configured. */
export class RustfsContainer extends Context.Service<
  RustfsContainer,
  {
    readonly endpoint: string;
    readonly region: string;
    readonly accessKeyId: Redacted.Redacted<string>;
    readonly secretAccessKey: Redacted.Redacted<string>;
  }
>()("@kutur-kit/testcontainers/RustfsContainer") {
  /**
   * Uses `TEST_S3_ENDPOINT` with `TEST_S3_ACCESS_KEY_ID` and
   * `TEST_S3_SECRET_ACCESS_KEY` when set, such as a CI service. Otherwise
   * reuses the container every process of every run shares, starting it if
   * needed. `TESTCONTAINERS_REUSE_ENABLE=false` gives the scope its own container.
   */
  static readonly layer = Layer.effect(
    RustfsContainer,
    Effect.gen(function* () {
      const configured = yield* Effect.orDie(
        Config.option(
          Config.all({
            endpoint: Config.String("TEST_S3_ENDPOINT"),
            accessKeyId: Config.Redacted("TEST_S3_ACCESS_KEY_ID"),
            secretAccessKey: Config.Redacted("TEST_S3_SECRET_ACCESS_KEY"),
            region: Config.String("TEST_S3_REGION").pipe(Config.withDefault("us-east-1")),
          }),
        ),
      );

      if (Option.isSome(configured)) return configured.value;

      const reuse = yield* Effect.orDie(
        Config.Boolean("TESTCONTAINERS_REUSE_ENABLE").pipe(Config.withDefault(true)),
      );

      // Fixed, so every process reusing the container signs with the same keys.
      const accessKeyId = "kutur-kit-test";
      const secretAccessKey = "kutur-kit-test-secret";

      // Other processes, such as Stryker's workers, may still use a shared container.
      const container = yield* Effect.acquireRelease(
        Effect.promise(() =>
          new GenericContainer(image)
            .withEnvironment({ RUSTFS_ACCESS_KEY: accessKeyId, RUSTFS_SECRET_KEY: secretAccessKey })
            .withExposedPorts(port)
            .withWaitStrategy(Wait.forHttp("/health", port))
            .withReuse()
            .start(),
        ),
        (started) => (reuse ? Effect.void : Effect.promise(() => started.stop())),
      );

      return {
        endpoint: `http://${container.getHost()}:${container.getMappedPort(port)}`,
        region: "us-east-1",
        accessKeyId: Redacted.make(accessKeyId),
        secretAccessKey: Redacted.make(secretAccessKey),
      };
    }),
  );
}

/** The services `@distilled.cloud/aws` clients need to reach the server. */
export const aws = Layer.unwrap(
  Effect.map(RustfsContainer, (server) =>
    Layer.mergeAll(
      FetchHttpClient.layer,
      Credentials.fromCredentials(
        { accessKeyId: server.accessKeyId, secretAccessKey: server.secretAccessKey },
        server.region,
      ),
      Region.of(server.region),
      Endpoint.of(server.endpoint),
    ),
  ),
);

/**
 * Creates an empty bucket on the server and deletes it with its objects when
 * the scope closes, so tests sharing one server stay isolated.
 */
export const bucket = Effect.gen(function* () {
  const name = `test-${globalThis.crypto.randomUUID()}`;

  yield* S3.createBucket({ Bucket: name });

  yield* Effect.addFinalizer(() =>
    S3.listObjectsV2.pages({ Bucket: name }).pipe(
      Stream.flatMap((page) => Stream.fromIterable(page.Contents ?? [])),
      Stream.runForEach(({ Key }) =>
        Key === undefined ? Effect.void : S3.deleteObject({ Bucket: name, Key }),
      ),
      Effect.andThen(S3.deleteBucket({ Bucket: name })),
      Effect.ignore,
    ),
  );

  return name;
}).pipe(Effect.orDie);
