import { describe, expect, it } from "vitest";

// Importing the examples compiles them with StyleX, while this file loads: the first import
// compiles the core and @foldkit/ui too, which can outlast a test's timeout on a busy runner.
import { invertedPopoverView } from "./app/customise.ts";
import { overrides } from "./app/overrides.stylex.ts";

describe("customising", () => {
  // The tokens read var(--fks-*): an override reaches them only under its literal name, one that
  // varies by condition included.
  it("keeps the literal --fks-* names of an app's overrides", () => {
    expect(overrides).toMatchObject({
      "--fks-color-accent": "var(--fks-color-accent)",
      "--fks-radius-control": "var(--fks-radius-control)",
      "--fks-space-md": "var(--fks-space-md)",
    });
  });

  // StyleX accepts the var keys, layers and spreads of the README's examples.
  it("compiles the customising examples", () => {
    expect(invertedPopoverView).toBeTypeOf("function");
  });
});
