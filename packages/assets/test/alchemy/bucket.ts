import * as Cloudflare from "alchemy/Cloudflare";

import * as AssetsR2 from "../../src/alchemy/r2.ts";

/** The origin the CORS rule admits, as an app's would be. */
export const appOrigin = "https://app.example.com";

/**
 * The bucket the fixture Worker stores to and signs for. Public on its
 * `r2.dev` domain, which serves objects as a custom domain does; local runs
 * have no public domain.
 */
export const Assets = Cloudflare.R2.Bucket("Assets", {
  forceDestroy: true,
  cors: [AssetsR2.corsRule([appOrigin])],
  publicAccess: true,
});
