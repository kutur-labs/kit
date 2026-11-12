import { describe, expect, it } from "vitest";

import { computed, openPanel, schemes, useGallery } from "./gallery.ts";

const { open } = useGallery();

describe.each(schemes)("Dialog in the $colorScheme scheme", (scheme) => {
  // The theme lays the dialog out with display: grid, which would show a closed <dialog>.
  it("hides the closed dialog", async () => {
    const { page } = await open("/dialog", scheme);

    expect(await computed(page.locator("#confirm"), "display")).toBe("none");
  });

  it("covers the viewport with the backdrop, which closes the dialog and no click on the panel does", async () => {
    const { page } = await open("/dialog", scheme);
    const dialog = page.locator("#confirm");
    const panel = await openPanel(page.locator("#confirm-trigger"), page.locator("#confirm-panel"));

    expect(await computed(dialog, "display")).toBe("grid");
    expect(await dialog.locator(":scope > div").first().boundingBox()).toEqual({
      x: 0,
      y: 0,
      ...scheme.viewport,
    });
    await panel.locator("p").click();
    expect(await panel.count()).toBe(1);
    await page.mouse.click(4, 4);
    await expect.poll(() => computed(dialog, "display")).toBe("none");
  });

  it("gives the <dialog> the page's text color instead of the user agent's CanvasText", async () => {
    const { page } = await open("/dialog", scheme);
    await openPanel(page.locator("#confirm-trigger"), page.locator("#confirm-panel"));

    expect(await computed(page.locator("#confirm"), "color")).toBe(
      await computed(page.locator("#demo"), "color"),
    );
  });

  it("fills Delete, which destroys the draft, in the danger color of the Button page", async () => {
    const { page } = await open("/dialog", scheme);
    const panel = await openPanel(page.locator("#confirm-trigger"), page.locator("#confirm-panel"));
    const { page: buttons } = await open("/button", scheme);

    expect(await computed(panel.getByRole("button", { name: "Delete" }), "background-color")).toBe(
      await computed(buttons.locator("#example-3 button"), "background-color"),
    );
  });
});
