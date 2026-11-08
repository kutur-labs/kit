// Every page, in both schemes: it loads, hydrates the server's HTML and logs no error. Themed
// demos also meet WCAG's contrast and target sizes, with each token preset.
import { describe, expect, it } from "vitest";

import { duplicateIds, hydration, schemes, slugs, themedSlugs, useGallery } from "./gallery.ts";
import { audit } from "./wcag.ts";

const { open } = useGallery();

describe.each(schemes)("in the %s scheme", (scheme) => {
  it.each(["", ...slugs])("hydrates /%s without errors", async (slug) => {
    const { page, errors } = await open(`/${slug}`, scheme);

    expect(await hydration(page)).toEqual({ discarded: [], created: [] });
    expect(await duplicateIds(page)).toEqual([]);
    expect(errors).toEqual([]);
  });

  it.each(themedSlugs)("keeps the themed /%s demo readable and reachable", async (slug) => {
    const { page } = await open(`/${slug}`, scheme);

    for (const preset of ["Kit", "Ember", "Paper"]) {
      await page.getByRole("button", { name: preset, exact: true }).click();
      expect(await audit(page, "#themed-demo"), preset).toEqual([]);
    }
  });
});
