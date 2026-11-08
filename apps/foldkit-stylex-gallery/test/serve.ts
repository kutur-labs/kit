import { readFile } from "node:fs/promises";
import { createServer, type IncomingMessage, type ServerResponse } from "node:http";
import { extname } from "node:path";

import { Predicate, Schema } from "effect";

/** The server entry @foldkit/vite-plugin builds to dist/server/fetch.js: a fetch handler. */
export type FetchHandler = Readonly<{ fetch: (request: Request) => Promise<Response> }>;

// The bundle is plain JavaScript, so this checks the handler is a function and trusts
// @foldkit/vite-plugin for its signature.
const isFetch = (input: unknown): input is FetchHandler["fetch"] => Predicate.isFunction(input);

const Entry = Schema.Struct({
  default: Schema.Struct({ fetch: Schema.declare(isFetch) }),
});

/** Loads the server entry of a build, such as `dist/server/fetch.js`. */
export const loadServerEntry = async (path: URL): Promise<FetchHandler> =>
  Schema.decodeUnknownSync(Entry)(await import(path.href)).default;

const contentTypes = new Map([
  [".css", "text/css"],
  [".js", "text/javascript"],
]);

const client = new URL("../dist/client/", import.meta.url);

const Listening = Schema.Struct({ port: Schema.Int });

const respond = async (
  handler: FetchHandler,
  request: IncomingMessage,
  response: ServerResponse,
): Promise<void> => {
  const path = request.url ?? "/";

  if (path.startsWith("/assets/")) {
    const body = await readFile(new URL(`.${path}`, client)).catch(() => undefined);
    response.writeHead(body === undefined ? 404 : 200, {
      "content-type": contentTypes.get(extname(path)) ?? "application/octet-stream",
    });
    response.end(body);

    return;
  }

  const page = await handler.fetch(
    new Request(new URL(path, "http://localhost"), { headers: { accept: "text/html" } }),
  );

  response.writeHead(page.status, Object.fromEntries(page.headers));
  response.end(await page.text());
};

/**
 * Serves the gallery's production build, as a host would: assets from dist/client, every other
 * path through the server entry. Resolves with the base URL once it listens on a free port.
 */
export const serve = (handler: FetchHandler) =>
  new Promise<Readonly<{ url: string; close: () => Promise<void> }>>((resolve) => {
    const server = createServer((request, response) => {
      void respond(handler, request, response);
    });

    server.listen(0, "127.0.0.1", () => {
      const { port } = Schema.decodeUnknownSync(Listening)(server.address());

      resolve({
        url: `http://127.0.0.1:${port}`,
        close: () => new Promise((done) => server.close(() => done())),
      });
    });
  });
