import { describe, expect, it } from "vitest";

import { computed, openPanel, schemes, useGallery } from "./gallery.ts";
import { audit } from "./wcag.ts";

const { open } = useGallery();

describe.each(schemes)("Dialog in the %s scheme", (scheme) => {
  // Both demos lay the dialog out with display: grid, which would show a closed <dialog>.
  it.each(["confirm", "themed-confirm"])("hides the closed #%s dialog", async (id) => {
    const { page } = await open("/dialog", scheme);

    expect(await computed(page.locator(`#${id}`), "display")).toBe("none");
  });

  it("covers the viewport with the backdrop, which closes the dialog and no click on the panel does", async () => {
    const { page } = await open("/dialog", scheme);
    const dialog = page.locator("#confirm");
    const panel = await openPanel(page.locator("#confirm-trigger"), page.locator("#confirm-panel"));

    expect(await computed(dialog, "display")).toBe("grid");
    expect(await dialog.locator(":scope > div").first().boundingBox()).toEqual({
      x: 0,
      y: 0,
      width: 1280,
      height: 900,
    });
    await panel.locator("p").click();
    expect(await panel.count()).toBe(1);
    await page.mouse.click(4, 4);
    await expect.poll(() => computed(dialog, "display")).toBe("none");
  });

  it("gives the <dialog> the page's text color instead of the user agent's CanvasText", async () => {
    const { page } = await open("/dialog", scheme);
    await openPanel(page.locator("#themed-confirm-trigger"), page.locator("#themed-confirm-panel"));

    expect(await computed(page.locator("#themed-confirm"), "color")).toBe(
      await computed(page.locator("#themed-demo"), "color"),
    );
  });

  it("keeps the open themed dialog readable and its controls reachable", async () => {
    const { page } = await open("/dialog", scheme);
    await openPanel(page.locator("#themed-confirm-trigger"), page.locator("#themed-confirm-panel"));

    expect(await audit(page, "#themed-confirm-panel")).toEqual([]);
  });
});
