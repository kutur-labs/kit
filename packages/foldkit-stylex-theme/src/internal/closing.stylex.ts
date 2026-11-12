// First, so the compile guard runs before the constant is defined.
import "./compiled.ts";
import * as stylex from "@stylexjs/stylex";

/**
 * How a closing part looks, for base.closed and for Toast's entries, which close on an attribute
 * rather than a state the theme reads.
 */
export const closing = stylex.defineConsts({ scale: "0.97" });
