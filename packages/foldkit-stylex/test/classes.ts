import type { SxStyles } from "../src/sx.ts";

import * as Scene from "foldkit/scene";

import { sxClassName } from "../src/sx.ts";

/** The class tokens StyleX gives these styles, so tests never hard-code a hash. */
export const classOf = (...styles: ReadonlyArray<SxStyles>): string => sxClassName(...styles);

/** Steps asserting that the element has every class token these styles compile to. */
export const hasStyles = (locator: Scene.Locator, ...styles: ReadonlyArray<SxStyles>) =>
  classOf(...styles)
    .split(" ")
    .map((token) => Scene.expect(locator).toHaveClass(token));

/**
 * Steps asserting that, in a scenario where a flag is `on`, @foldkit/ui sets `hook` on the element
 * exactly when the flag's style is there. Give each flag's style its own CSS property, so StyleX
 * keeps every flag's class.
 */
export const agrees = (locator: Scene.Locator, hook: string, style: SxStyles, on: boolean) =>
  on
    ? [Scene.expect(locator).toHaveAttr(hook), Scene.expect(locator).toHaveClass(classOf(style))]
    : [
        Scene.expect(locator).not.toHaveAttr(hook),
        Scene.expect(locator).not.toHaveClass(classOf(style)),
      ];
