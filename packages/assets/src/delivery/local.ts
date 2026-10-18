import type * as AssetBucket from "../AssetBucket.ts";

import { Effect, Option } from "effect";
import { HttpRouter, HttpServerResponse } from "effect/http";

import { mount, respond, target } from "../internal/http.ts";

export interface Options {
  /**
   * Where `routes` are mounted, such as `/cdn/public` or
   * `http://localhost:3000/cdn/public`. Give `AssetDelivery.layer` the same
   * base URL, so the public URLs it makes reach the routes.
   */
  readonly baseUrl: string;
}

/**
 * Serves every object of a bucket under `baseUrl` without a signature, as a
 * CDN serves a public bucket, for development and tests. Objects are served
 * with the cache control stored with them, as R2 and S3 serve it.
 */
export const routes = <Self, Id extends string>(
  bucket: AssetBucket.Tag<Self, Id>,
  options: Options,
) => {
  const { prefix, path } = mount(options.baseUrl);

  return HttpRouter.add(
    "GET",
    path,
    Effect.gen(function* () {
      const { key } = yield* target(prefix);
      const store = yield* bucket;

      return yield* Option.match(key, {
        onNone: () => Effect.succeed(HttpServerResponse.empty({ status: 404 })),
        onSome: (value) => respond(store, value),
      });
    }).pipe(Effect.orDie),
  );
};
