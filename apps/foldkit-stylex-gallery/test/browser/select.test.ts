import { describe, expect, it } from "vitest";

import { computed, edgeContrast, schemes, useGallery } from "./gallery.ts";

const { open } = useGallery();

describe.each(schemes)("Select in the $colorScheme scheme", (scheme) => {
  it("passes a click on the chevron through to the select", async () => {
    const { page } = await open("/select", scheme);
    const select = page.locator("#language");
    const chevron = select.locator("xpath=following-sibling::*[local-name()='svg'][1]");
    const box = await chevron.boundingBox();

    if (!box) throw new Error("The select rendered no chevron.");
    await page.mouse.click(box.x + box.width / 2, box.y + box.height / 2);

    expect(await page.evaluate(() => document.activeElement?.id)).toBe("language");
  });

  it("draws the edge and description in one color once the choice is invalid", async () => {
    const { page } = await open("/select", scheme);
    const select = page.locator("#language");
    const description = page.locator("#language-description");
    const valid = await computed(select, "border-top-color");

    await select.selectOption("tlh");
    await expect.poll(() => select.getAttribute("aria-invalid")).toBe("true");

    const invalid = await computed(select, "border-top-color");

    expect(invalid).not.toBe(valid);
    expect(await computed(description, "color")).toBe(invalid);
  });

  it("turns the select's edge to 3:1 under the pointer", async () => {
    const { page } = await open("/select", scheme);

    const field = page.locator("#language");
    await field.hover();

    // Polled past the edge's ease-in.
    await expect.poll(() => edgeContrast(field)).toBeGreaterThanOrEqual(3);
  });

  // The Size example sets size.control and fontSize.md on its select's part.
  it("resizes only the select whose part sets the tokens", async () => {
    const { page } = await open("/select", scheme);

    expect((await page.locator("#language").boundingBox())?.height).toBe(32);
    expect((await page.locator("#edition").boundingBox())?.height).toBe(40);
  });
});
