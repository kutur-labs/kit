// Playwright Test's projects, as the core README writes them. Each variation without its name is
// a browser context's options: test/packed/types.test.ts checks each against Playwright's type.
import type { BrowserContextOptions } from "playwright";

import { variations } from "@kutur-kit/foldkit-stylex/testing";

export const projects = variations.map(({ name, ...use }) => ({
  name,
  use: use satisfies Pick<BrowserContextOptions, keyof typeof use>,
}));
