import { describe, expect, it } from "vitest";

import { computed, schemes, useGallery } from "./gallery.ts";

const { open } = useGallery();

describe.each(schemes)("Input in the %s scheme", (scheme) => {
  it("rounds only the part whose token the demo overrides", async () => {
    const { page } = await open("/input", scheme);

    expect(await computed(page.locator("#themed-search"), "border-top-left-radius")).toBe("999px");
    expect(await computed(page.locator("#themed-email"), "border-top-left-radius")).not.toBe(
      "999px",
    );
  });

  it("fills the read-only input, unlike an editable one", async () => {
    const { page } = await open("/input", scheme);

    expect(await computed(page.locator("#themed-handle"), "background-color")).not.toBe(
      await computed(page.locator("#themed-email"), "background-color"),
    );
  });
});
