import { describe, expect, it } from "vitest";

import { computed, schemes, settled, useGallery } from "./gallery.ts";

const { open } = useGallery();

describe.each(schemes)("Animation in the $colorScheme scheme", (scheme) => {
  it("adds the element when shown and removes it once it has left", async () => {
    const { page } = await open("/animation", scheme);
    const notes = page.locator("#notes");
    const trigger = page.locator("#demo").getByRole("button");

    expect(await notes.count()).toBe(0);
    await trigger.click();
    await expect.poll(() => computed(notes, "opacity")).toBe("1");
    await settled(notes);
    expect(await computed(notes, "scale")).toBe("none");
    expect(await computed(notes, "translate")).toBe("none");

    await trigger.click();
    await expect.poll(() => notes.count()).toBe(0);
  });
});
