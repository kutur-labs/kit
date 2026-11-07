import { Effect } from "effect";
import { Server } from "foldkit/experimental";

import { init, view } from "./main.ts";

export const renderDocument: Server.DocumentRenderer = (application, assets) =>
  Server.renderDocument(application, assets);

export const renderPage = (_request: Request) =>
  Effect.runPromise(
    Server.renderToString({ init, view }, {}).pipe(Effect.map((page) => Server.Rendered(page))),
  );
