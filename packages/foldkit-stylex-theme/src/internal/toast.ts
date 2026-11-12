// @foldkit/ui's Toast with `make` themed, plus `restyle`, `closeIcon` and the content styles.
import type * as Schema from "effect/Schema";
import type { View } from "foldkit/submodel";

import * as Core from "@foldkit/ui/toast";
import { ToastStyle } from "@kutur-kit/foldkit-stylex";
import * as stylex from "@stylexjs/stylex";

import { color, fontSize, lineHeight, motion, size, space } from "../tokens.stylex.ts";
import { base } from "./base.ts";
import { closing } from "./closing.stylex.ts";
import { close } from "./marks.ts";

export * from "@foldkit/ui/toast";

const styles = stylex.create({
  container: { inlineSize: "min(22rem, 100vw - 2rem)" },
  // Every entry shares this one class, so it animates on @foldkit/ui's data-closed as base.closed
  // would, and follows the pointer without a transition while swiped. It enters at motion.slow, as
  // base.slowTransition does, and leaves at base.closed's motion.instant. The end padding
  // matches the block padding, so the dismiss button's X sits as far from the end as the text from
  // the start.
  entry: {
    paddingBlock: space.xs,
    paddingInlineStart: space.md,
    paddingInlineEnd: space.xs,
    opacity: { default: 1, ":is([data-closed])": 0 },
    // As base.closed: under reduced motion the entry still fades, without the scale.
    scale: {
      default: "none",
      ":is([data-closed])": closing.scale,
      "@media (prefers-reduced-motion: reduce)": "none",
    },
    transitionDuration: {
      default: motion.slow,
      ":is([data-closed])": motion.instant,
      ':is([data-swipe="move"])': "0s",
    },
    transitionProperty: "opacity, scale, translate",
    transitionTimingFunction: motion.easing,
  },
});

// Raised entries that fade in and out, each with a quiet X that dismisses it.
const theme = {
  container: styles.container,
  entry: [base.panel, styles.entry],
  // The hit area squares off the rounded corners, which would otherwise miss the pointer.
  dismiss: [base.button, base.iconButton, base.quietButton, base.hitArea, base.focusRing],
} satisfies ToastStyle.Styles;

/** The parts `restyle` takes; write a layer kept apart from the call with `satisfies`. */
export type Styles = ToastStyle.Styles;

type Made<A, I> = ReturnType<typeof Core.make<A, I>>;

/** A `Toast.make` module, its view styled by the theme. */
export type Module<A, I> = Omit<Made<A, I>, "view"> &
  Readonly<{
    view: View<
      Made<A, I>["Model"]["Type"],
      Made<A, I>["Message"]["Type"],
      ToastStyle.ViewInputs<Made<A, I>["Entry"]["Type"]>
    >;
  }>;

/** The theme with `layers` over it, part by part: later layers win property by property. */
export const restyle = <const List extends ReadonlyArray<Styles>>(
  ...layers: ToastStyle.Layers<List, [typeof theme]>
) => ({
  make: <A, I>(payloadSchema: Schema.Codec<A, I>): Module<A, I> => {
    const module = Core.make(payloadSchema);

    return { ...module, view: ToastStyle.view(module.view, theme, ...layers) };
  },
});

/** `Toast.make`, its view styled by the theme. */
export const { make } = restyle();

/** An X for an icon-only `dismiss` button; give the button an `h.AriaLabel` of your own. */
export const closeIcon = close;

/**
 * The element you render inside each entry from `entryToView`, which lays out your text and the
 * dismiss button: `sx(Toast.content.body, entry.variant === "Error" && Toast.content.error)`.
 */
export const content = stylex.create({
  // At least one control tall, so a one-line entry matches the dismiss button beside it.
  body: {
    display: "grid",
    gridTemplateColumns: "1fr auto",
    alignItems: "center",
    columnGap: space.sm,
    minBlockSize: size.control,
    fontSize: fontSize.md,
    lineHeight: lineHeight.md,
  },
  error: { color: color.danger },
});
