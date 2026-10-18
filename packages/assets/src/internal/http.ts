import type * as AssetBucket from "../AssetBucket.ts";

import { Effect, Option } from "effect";
import { HttpServerRequest, HttpServerResponse } from "effect/http";

/** The routes' prefix and wildcard path under a base URL, absolute or not. */
export const mount = (baseUrl: string) => {
  const prefix = new URL(baseUrl, "http://localhost").pathname.replace(/\/$/u, "");

  return { prefix, path: `/${prefix.slice(1)}/*` as const };
};

/** The current request's key under the prefix, and its query; no key for a malformed path. */
export const target = (prefix: string) =>
  Effect.map(HttpServerRequest.HttpServerRequest, (request) => {
    const url = new URL(request.url, "http://localhost");

    const key = Option.liftThrowable(() =>
      url.pathname
        .slice(prefix.length + 1)
        .split("/")
        .map(decodeURIComponent)
        .join("/"),
    )();

    return { request, key, query: url.searchParams };
  });

// Objects are served from the app's origin in development. Even a file a
// browser would read as something else must not be sniffed or run.
const inert = {
  "x-content-type-options": "nosniff",
  "content-security-policy": "default-src 'none'; sandbox",
};

/** Serves a stored object with its type, length and cache control, or 404. */
export const respond = (bucket: AssetBucket.Bucket, key: string) =>
  Effect.map(
    bucket.get(key),
    Option.match({
      onNone: () => HttpServerResponse.empty({ status: 404 }),
      onSome: ({ info, body }) => {
        const response = HttpServerResponse.stream(body, {
          contentType: info.contentType,
          contentLength: Number(info.size),
          headers: inert,
        });

        return info.cacheControl === undefined
          ? response
          : HttpServerResponse.setHeader(response, "cache-control", info.cacheControl);
      },
    }),
  );
