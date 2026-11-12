import { readdirSync } from "node:fs";
import { dirname, join } from "node:path";

import { chromium, request, type APIRequestContext, type Browser } from "playwright";
import { afterAll, beforeAll, describe, expect, inject, it } from "vitest";

import { startVite, type DevServer } from "./run.ts";

const consumer = inject("consumer");

const vite = join(consumer, "node_modules/vite/bin/vite.js");

const guard = (name: string) => `StyleX did not compile ${name} in this Vite or Vitest run.`;

let browser: Browser | undefined;

let api: APIRequestContext | undefined;

beforeAll(async () => {
  browser = await chromium.launch();
  api = await request.newContext();
});

afterAll(async () => {
  await browser?.close();
  await api?.dispose();
});

const get = (url: string) => {
  if (api === undefined) throw new Error("The request context did not start.");

  return api.get(url, { failOnStatusCode: false });
};

// Loads the page and returns the errors it logged, once Foldkit hydrated it, which removes
// data-foldkit-app, or a script threw. Network idleness would not do: on a slow CPU the network
// goes quiet while the browser still evaluates the module graph.
const errorsOn = async (server: DevServer) => {
  if (browser === undefined) throw new Error("The browser did not start.");
  const page = await browser.newPage();
  const errors: Array<string> = [];
  page.on("console", (message) => {
    if (message.type() === "error") errors.push(message.text());
  });

  const threw = new Promise<void>((resolve) => {
    page.on("pageerror", (error) => {
      errors.push(error.message);
      resolve();
    });
  });

  try {
    await page.goto(server.url);
    await Promise.race([
      threw,
      page.waitForFunction(() => document.querySelector("[data-foldkit-app]") === null),
    ]);
  } finally {
    await page.close();
  }

  return errors;
};

// Each server runs alone: they share the app's dependency cache in node_modules/.vite.
describe("vite dev in an app that installed the packed packages", () => {
  it("serves the app compiled when Vite starts in the parent directory", async () => {
    const server = await startVite(vite, [consumer], dirname(consumer));

    try {
      const html = await (await get(server.url)).text();

      expect(html).toMatch(/<main[^>]*>/);
      expect(await errorsOn(server)).toEqual([]);
      expect(
        readdirSync(join(consumer, "node_modules/.vite/deps")).filter((file) =>
          file.includes("kutur"),
        ),
      ).toEqual([]);
    } finally {
      await server.stop();
    }
  });

  // Vite's client adds a script's stylesheets only once the script runs, so without the link a
  // server-rendered page first paints in the browser's default font.
  it("links the client entry's stylesheet ahead of StyleX's, so the page paints styled before its scripts run", async () => {
    if (browser === undefined) throw new Error("The browser did not start.");
    const server = await startVite(vite, [], consumer);

    try {
      const head = (await (await get(server.url)).text()).split("</head>")[0] ?? "";

      const stylesheets = Array.from(
        head.matchAll(/<link rel="stylesheet" href="([^"]+)"/g),
        ([, href]) => href,
      );

      expect(stylesheets).toEqual(["/src/styles.css", "/virtual:stylex.css"]);

      const page = await browser.newPage();

      try {
        await page.route(/\.ts$/, (route) => route.abort());
        await page.goto(server.url);

        // The browser's default is a serif; src/styles.css sets the system font.
        expect(
          await page.evaluate(() => getComputedStyle(document.documentElement).fontFamily),
        ).toBe("system-ui, sans-serif");
      } finally {
        await page.close();
      }

      expect(await errorsOn(server)).toEqual([]);
    } finally {
      await server.stop();
    }
  });

  it("shows the core's guard in the browser when StyleX's own plugin replaces foldkitStylex()", async () => {
    const server = await startVite(vite, ["--config", "vite.stylex-core.config.ts"], consumer);

    try {
      expect((await get(server.url)).status()).toBe(200);
      expect((await errorsOn(server)).join("\n")).toContain(guard("@kutur-kit/foldkit-stylex"));
    } finally {
      await server.stop();
    }
  });

  // Each theme namespace imports the core before its tokens, so the core's guard reports first.
  it("shows the core's guard in the browser of an app with the theme when StyleX's own plugin replaces foldkitStylex()", async () => {
    const server = await startVite(vite, ["--config", "vite.stylex-themed.config.ts"], consumer);

    try {
      expect((await get(server.url)).status()).toBe(200);
      expect((await errorsOn(server)).join("\n")).toContain(guard("@kutur-kit/foldkit-stylex"));
    } finally {
      await server.stop();
    }
  });
});
