import { describe, expect, it } from "vitest";

import { overrides } from "./app/overrides.stylex.ts";

describe("customising", () => {
  // The tokens read var(--fks-*): an override reaches them only under its literal name.
  it("keeps the literal --fks-* names of an app's overrides", () => {
    expect(overrides).toMatchObject({
      "--fks-color-accent": "var(--fks-color-accent)",
      "--fks-radius-control": "var(--fks-radius-control)",
    });
  });

  // StyleX accepts the var keys, layers and spreads of the README's examples.
  it("compiles the customising examples", async () => {
    const examples = await import("./app/customise.ts");

    expect(examples.invertedPopoverView).toBeTypeOf("function");
  });
});
