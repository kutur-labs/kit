import type { Attribute } from "foldkit/html";

import * as stylex from "@stylexjs/stylex";
import { inertHtml } from "foldkit/html";

// Matches no real style. It is here so that a dynamic style's compile error names the fix.
type DynamicStyle = readonly [
  Readonly<{ [key: string]: stylex.StyleXClassNameFor<unknown, unknown> | null | void }>,
  Readonly<{
    "Pass static styles only. For a runtime value, set a custom property with h.Style({ '--x': value }) and read it with var(--x) in a static style.": never;
  }>,
];

/** Static StyleX styles: `stylex.create` entries, markers, themes and falsy conditions. */
export type SxStyles = stylex.StyleXArray<
  null | undefined | boolean | stylex.CompiledStyles | DynamicStyle
>;

/** The one `Class` attribute an element keeps. It fits every element, `textarea` included. */
export type ClassAttribute = Extract<Attribute<never>, Readonly<{ _tag: "Class" }>>;

/** The class string for a `*ClassName` input; "" when no style applies. */
export const sxClassName = (...styles: ReadonlyArray<SxStyles>): string =>
  stylex.props(...styles).className ?? "";

/**
 * All styles of one element as its only `Class`. Later arguments win property by property. Put it
 * last in the attribute list: Foldkit keeps the last `Class` of an element.
 */
export const sx = (...styles: ReadonlyArray<SxStyles>): ClassAttribute =>
  inertHtml.Class(sxClassName(...styles));
