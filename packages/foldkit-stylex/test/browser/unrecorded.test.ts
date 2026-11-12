// audit in a page that never called recordMotion: a recorder cannot be removed once it runs, so
// these tests need a page of their own.
import { expect, it } from "vitest";

import { audit } from "../../src/testing.ts";

const reducedMotion = matchMedia("(prefers-reduced-motion: reduce)").matches;

it.runIf(reducedMotion)("throws under reduced motion at kit, which checks movement", async () => {
  await expect(audit()).rejects.toThrow(
    "Call recordMotion before the app renders. page.setContent and navigations drop it: in Playwright, page.addInitScript(recordMotion) runs it again on every navigation, and page.evaluate(recordMotion) after page.setContent. Without it, audit cannot tell what moved under reduced motion.",
  );
});

it("checks the rest without the recorder at AA, and at kit without reduced motion", async () => {
  expect(await audit({ level: reducedMotion ? "AA" : "kit" })).toEqual([]);
});
