import type { TestProject } from "vitest/node";

import { chromium } from "playwright";

import { loadServerEntry, serve } from "../serve.ts";

declare module "vitest" {
  export interface ProvidedContext {
    /** Where the gallery's production build is served, such as `http://127.0.0.1:53124`. */
    galleryUrl: string;
    /** The shared Chromium's endpoint for `chromium.connect`. */
    browserEndpoint: string;
  }
}

// One server and one browser for every test file; each file opens its own pages.
export default async function setup(project: TestProject) {
  // Built by the gallery's `build` task, which test:browser depends on.
  const gallery = await serve(
    await loadServerEntry(new URL("../../dist/server/fetch.js", import.meta.url)),
    new URL("../../dist/client/", import.meta.url),
  );

  const browser = await chromium.launchServer();

  project.provide("galleryUrl", gallery.url);
  project.provide("browserEndpoint", browser.wsEndpoint());

  return async () => {
    await browser.close();
    await gallery.close();
  };
}
