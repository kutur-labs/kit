import { describe, expect, it } from "vitest";

import { computed, schemes, useGallery } from "./gallery.ts";

const { open } = useGallery();

describe.each(schemes)("Select in the %s scheme", (scheme) => {
  it("passes a click on the themed chevron through to the select", async () => {
    const { page } = await open("/select", scheme);
    const select = page.locator("#themed-language");
    const chevron = select.locator("xpath=following-sibling::span[1]");
    const box = await chevron.boundingBox();

    if (!box) throw new Error("The themed select rendered no chevron.");
    await page.mouse.click(box.x + box.width / 2, box.y + box.height / 2);

    expect(await page.evaluate(() => document.activeElement?.id)).toBe("themed-language");
  });

  it("draws the edge and description in one color once the choice is invalid", async () => {
    const { page } = await open("/select", scheme);
    const select = page.locator("#themed-language");
    const description = page.locator("#themed-language-description");
    const valid = await computed(select, "border-top-color");

    await select.selectOption("tlh");
    await expect.poll(() => select.getAttribute("aria-invalid")).toBe("true");

    const invalid = await computed(select, "border-top-color");

    expect(invalid).not.toBe(valid);
    expect(await computed(description, "color")).toBe(invalid);
  });
});
