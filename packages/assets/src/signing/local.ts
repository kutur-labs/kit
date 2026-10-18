import type * as AssetBucket from "../AssetBucket.ts";

import {
  ByteSize,
  Clock,
  DateTime,
  Duration,
  Effect,
  Layer,
  Option,
  Redacted,
  Stream,
} from "effect";
import { HttpRouter, HttpServerResponse } from "effect/http";

import * as AssetSigning from "../AssetSigning.ts";
import { mount, respond, target } from "../internal/http.ts";
import { encodeKey } from "../internal/url.ts";

export interface Options {
  /**
   * Where `routes` are mounted, such as `/storage/private` or
   * `http://localhost:3000/storage/private`. Signed URLs start with it.
   */
  readonly baseUrl: string;
  /** Signs URLs. Changing it invalidates URLs already handed out. */
  readonly secret: Redacted.Redacted<string>;
}

interface Signed {
  readonly method: "PUT" | "GET";
  readonly key: string;
  readonly expires: number;
  readonly contentType?: string | undefined;
  readonly contentLength?: string | undefined;
  /** `*` on uploads: they create an object and never replace one. */
  readonly ifNoneMatch?: string | undefined;
  readonly cacheControl?: string | undefined;
}

const hex = (bytes: ArrayBuffer) =>
  Array.from(new Uint8Array(bytes), (byte) => byte.toString(16).padStart(2, "0")).join("");

// The signature covers everything a client must not change.
const sign = (secret: Redacted.Redacted<string>, signed: Signed) =>
  Effect.promise(async () => {
    const key = await crypto.subtle.importKey(
      "raw",
      new TextEncoder().encode(Redacted.value(secret)),
      { name: "HMAC", hash: "SHA-256" },
      false,
      ["sign"],
    );

    const message = [
      signed.method,
      signed.key,
      signed.expires,
      signed.contentType ?? "",
      signed.contentLength ?? "",
      signed.ifNoneMatch ?? "",
      signed.cacheControl ?? "",
    ].join("\n");

    return hex(await crypto.subtle.sign("HMAC", key, new TextEncoder().encode(message)));
  });

// Compares in time independent of where the strings differ.
const equal = (a: string, b: string) => {
  let difference = a.length ^ b.length;

  for (let index = 0; index < Math.max(a.length, b.length); index++)
    difference |= (a.charCodeAt(index) || 0) ^ (b.charCodeAt(index) || 0);

  return difference === 0;
};

/**
 * Signs URLs for a bucket with an HMAC, for development, tests or a single
 * self-hosted server. `routes` verifies them, so storage needs no signing.
 */
export const layer = <Self, Id extends string>(
  bucket: AssetBucket.Tag<Self, Id>,
  options: Options,
): Layer.Layer<AssetSigning.SigningOf<Self>> => {
  const request = (signed: Omit<Signed, "expires">, expiresIn: Duration.Duration) =>
    Effect.gen(function* () {
      const now = yield* Clock.currentTimeMillis;
      const expires = Math.ceil((now + Duration.toMillis(expiresIn)) / 1000);
      const signature = yield* sign(options.secret, { ...signed, expires });
      const query = new URLSearchParams({ expires: String(expires), signature });
      const headers: Record<string, string> = {};

      if (signed.contentType !== undefined) headers["content-type"] = signed.contentType;

      if (signed.ifNoneMatch !== undefined) headers["if-none-match"] = signed.ifNoneMatch;

      if (signed.cacheControl !== undefined) headers["cache-control"] = signed.cacheControl;

      return {
        method: signed.method,
        url: `${options.baseUrl}/${encodeKey(signed.key)}?${query.toString()}`,
        headers,
        expiresAt: DateTime.makeUnsafe(expires * 1000),
      };
    });

  return Layer.succeed(AssetSigning.of(bucket), {
    signPut: ({ key, contentType, contentLength, cacheControl, expiresIn }) =>
      request(
        {
          method: "PUT",
          key,
          contentType,
          contentLength: String(contentLength),
          ifNoneMatch: "*",
          cacheControl,
        },
        expiresIn,
      ),
    signGet: ({ key, expiresIn }) => request({ method: "GET", key }, expiresIn),
  });
};

const refused = HttpServerResponse.text("Forbidden", { status: 403 });

/**
 * Accepts signed uploads and serves signed downloads of a bucket under
 * `baseUrl`. Refuses a request that differs from what was signed: another
 * method, key, content type, length or cache control, or one sent after it
 * expires. An upload to a key that already holds an object is refused with
 * 412.
 */
export const routes = <Self, Id extends string>(
  bucket: AssetBucket.Tag<Self, Id>,
  options: Options,
) => {
  const { prefix, path } = mount(options.baseUrl);

  const verify = (query: URLSearchParams, signed: Omit<Signed, "expires">) =>
    Effect.gen(function* () {
      const expires = Number(query.get("expires"));
      const signature = query.get("signature") ?? "";
      const now = yield* Clock.currentTimeMillis;
      const expected = yield* sign(options.secret, { ...signed, expires });

      return now <= expires * 1000 && equal(signature, expected);
    });

  const upload = Effect.gen(function* () {
    const { request, key, query } = yield* target(prefix);
    const contentType = request.headers["content-type"];
    const contentLength = request.headers["content-length"];
    const ifNoneMatch = request.headers["if-none-match"];
    const cacheControl = request.headers["cache-control"];

    // The signed length is required, so the body's is checked against it.
    const length = Option.flatMap(Option.fromUndefinedOr(contentLength), (header) =>
      ByteSize.fromInput(Number(header)),
    );

    const allowed =
      Option.isSome(key) &&
      Option.isSome(length) &&
      (yield* verify(query, {
        method: "PUT",
        key: key.value,
        contentType,
        contentLength,
        ifNoneMatch,
        cacheControl,
      }));

    if (!allowed || Option.isNone(key) || Option.isNone(length)) return refused;

    const store = yield* bucket;

    // A signed upload writes once, as S3 answers `If-None-Match: *`. Checked
    // before writing, so two uploads racing to one key may both succeed: these
    // routes serve development and tests.
    const existing = yield* store.head(key.value);

    if (Option.isSome(existing))
      return HttpServerResponse.text("Precondition Failed", { status: 412 });

    // Node ends the body at its Content-Length; a client that sends less
    // fails the stream, so the bucket keeps what it had.
    yield* store.put({
      key: key.value,
      contentType: contentType ?? "",
      cacheControl,
      body: Stream.orDie(request.stream),
      contentLength: length.value,
    });

    return HttpServerResponse.empty({ status: 200 });
  }).pipe(Effect.orDie);

  const download = Effect.gen(function* () {
    const { key, query } = yield* target(prefix);

    const allowed = Option.isSome(key) && (yield* verify(query, { method: "GET", key: key.value }));

    if (!allowed || Option.isNone(key)) return refused;

    return yield* respond(yield* bucket, key.value);
  }).pipe(Effect.orDie);

  return Layer.mergeAll(HttpRouter.add("PUT", path, upload), HttpRouter.add("GET", path, download));
};
