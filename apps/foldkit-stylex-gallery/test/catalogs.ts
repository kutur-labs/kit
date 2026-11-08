import { execFileSync } from "node:child_process";
import { fileURLToPath } from "node:url";

import { Schema } from "effect";

export const Catalog = Schema.Record(Schema.String, Schema.String);

const Catalogs = Schema.fromJsonString(
  Schema.Struct({ runtime: Catalog, tooling: Catalog, testing: Catalog, peers: Catalog }),
);

/** Kit's pnpm catalogs, as pnpm reads them: the versions kit tests and the peer ranges it publishes. */
export const readCatalogs = () =>
  Schema.decodeSync(Catalogs)(
    execFileSync("pnpm", ["config", "get", "catalogs", "--json"], {
      cwd: fileURLToPath(new URL("../../../", import.meta.url)),
      encoding: "utf8",
    }),
  );
