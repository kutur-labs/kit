import { describe, expect, it } from "vitest";

import { computed, schemes, useGallery } from "./gallery.ts";

const { open } = useGallery();

// The danger token, light-dark(#dc2626, #f87171), as Chromium computes it.
const danger = { light: "rgb(220, 38, 38)", dark: "rgb(248, 113, 113)" } as const;

describe.each(schemes)("Switch in the %s scheme", (scheme) => {
  it.each([
    ["core", "Notifications"],
    ["themed", "Delete old drafts"],
  ])("slides the %s demo's thumb once a click turns it on", async (demo, name) => {
    const { page } = await open("/switch", scheme);
    const control = page.locator(`#${demo}-demo`).getByRole("switch", { name });
    const thumb = control.locator("span");

    expect(await computed(thumb, "translate")).toBe("none");
    await control.click();
    await expect.poll(() => control.getAttribute("aria-checked")).toBe("true");
    expect(await computed(thumb, "translate")).toBe("20px");
  });

  it("fills a switch with the accent token its part overrides", async () => {
    const { page } = await open("/switch", scheme);
    const control = page.getByRole("switch", { name: "Delete old drafts" });

    await control.click();
    await expect.poll(() => control.getAttribute("aria-checked")).toBe("true");
    expect(await computed(control, "background-color")).toBe(danger[scheme]);
  });
});
