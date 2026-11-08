import { describe, expect, it } from "vitest";

import { computed, schemes, useGallery } from "./gallery.ts";

const { open } = useGallery();

describe.each(schemes)("Disclosure in the %s scheme", (scheme) => {
  it.each(["core", "themed"])("turns the %s demo's chevron once a click opens it", async (demo) => {
    const { page } = await open("/disclosure", scheme);
    const button = page.locator(`#${demo}-demo`).getByRole("button", { name: "Shipping" });
    const chevron = button.locator("span");

    expect(await computed(chevron, "rotate")).toBe("none");
    await button.click();
    await expect.poll(() => button.getAttribute("aria-expanded")).toBe("true");
    expect(await computed(chevron, "rotate")).toBe("180deg");
  });
});
