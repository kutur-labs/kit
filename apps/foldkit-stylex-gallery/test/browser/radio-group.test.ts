import type { Locator } from "playwright";

import { describe, expect, it } from "vitest";

import { computed, schemes, useGallery } from "./gallery.ts";

const { open } = useGallery();

// The core demo marks the selection with a thicker border, the theme with a dot of the accent.
const markOf = (radio: Locator) => {
  const mark = radio.locator("span").first();

  return Promise.all(
    ["border-width", "background-color", "box-shadow"].map((property) => computed(mark, property)),
  ).then((values) => values.join(" "));
};

describe.each(schemes)("RadioGroup in the %s scheme", (scheme) => {
  it.each(["core", "themed"])(
    "selects an option of the %s demo from a click on its description and moves the mark",
    async (demo) => {
      const { page } = await open("/radio-group", scheme);
      const radios = page.locator(`#${demo}-demo`).getByRole("radio");
      const [free, pro] = [radios.nth(0), radios.nth(1)];
      const [selected, unselected] = await Promise.all([markOf(free), markOf(pro)]);

      expect(selected).not.toBe(unselected);
      await pro.getByText("Unlimited projects and drafts.").click();
      await expect.poll(() => pro.getAttribute("aria-checked")).toBe("true");
      expect(await Promise.all([markOf(free), markOf(pro)])).toEqual([unselected, selected]);
    },
  );
});
