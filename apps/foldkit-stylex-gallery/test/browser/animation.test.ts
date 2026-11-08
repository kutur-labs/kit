import { describe, expect, it } from "vitest";

import { computed, schemes, useGallery } from "./gallery.ts";

const { open } = useGallery();

describe.each(schemes)("Animation in the %s scheme", (scheme) => {
  it("keeps the animateSize element in the page, collapsed and faded, until shown", async () => {
    const { page } = await open("/animation", scheme);
    const notes = page.locator("#notes");

    expect(await notes.getAttribute("data-closed")).toBe("");
    expect(await computed(notes, "opacity")).toBe("0");
    expect((await notes.locator("../..").boundingBox())?.height).toBe(0);

    await page.locator("#core-demo").getByRole("button", { name: "Show notes" }).click();
    await expect.poll(() => notes.getAttribute("data-closed")).toBeNull();
    await expect.poll(() => computed(notes, "opacity")).toBe("1");
    await expect.poll(async () => (await notes.boundingBox())?.height).toBeGreaterThan(0);

    await page.locator("#core-demo").getByRole("button", { name: "Hide notes" }).click();
    await expect.poll(() => notes.getAttribute("data-closed")).toBe("");
  });

  it("adds the themed element when shown and removes it once it has left", async () => {
    const { page } = await open("/animation", scheme);
    const notes = page.locator("#themed-notes");
    const trigger = page.locator("#themed-demo").getByRole("button");

    expect(await notes.count()).toBe(0);
    await trigger.click();
    await expect.poll(() => computed(notes, "opacity")).toBe("1");
    expect(await computed(notes, "scale")).toBe("none");
    expect(await computed(notes, "translate")).toBe("none");

    await trigger.click();
    await expect.poll(() => notes.count()).toBe(0);
  });
});
