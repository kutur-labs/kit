import { Effect, Option } from "effect";
import { Server } from "foldkit/experimental";

import { programOf, screenAt } from "./main.ts";

export const renderDocument: Server.DocumentRenderer = (application, assets) =>
  Server.renderDocument(application, assets);

export const renderPage = (request: Request): Promise<Server.EntryResult> =>
  Option.match(screenAt(new URL(request.url).pathname), {
    onNone: () =>
      Promise.resolve(
        Server.Responded(new Response("No component has this page.", { status: 404 })),
      ),
    onSome: (screen) =>
      Effect.runPromise(
        Server.renderToString(programOf(screen), {}).pipe(
          Effect.map((page) => Server.Rendered(page)),
        ),
      ),
  });
