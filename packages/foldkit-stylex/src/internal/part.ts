import type * as stylex from "@stylexjs/stylex";
import type { ChildAttribute } from "foldkit/html";

import * as Predicate from "effect/Predicate";
import { childAttributes } from "foldkit/html";

import { sx, type SxStyles } from "../sx.ts";

// One index-signature branch, so a rejected style names the property, not a missing `theme`.
type Compiled = Readonly<{
  [key: string]: stylex.StyleXClassNameFor<unknown, unknown> | null | void;
}>;

// Matches no real style. It is here so that a dynamic style's error names the fix.
type DynamicStyle = readonly [
  Compiled,
  Readonly<{
    "Pass a static style: a part takes classes only, because @foldkit/ui owns its inline style.": never;
  }>,
];

// A marker, or a `stylex.createTheme` result, which the lint preset rejects.
type Theme = Readonly<{ theme: stylex.StyleXClassNameFor<unknown, unknown> }>;

/** Static StyleX styles for one part. */
export type PartValue = stylex.StyleXArray<
  null | undefined | false | Compiled | Theme | DynamicStyle
>;

/** A part's styles, or a function from the part's state to them. */
export type PartStyle<State> = PartValue | ((state: State) => PartValue);

// The style properties a part's value sets, through lists, falsy entries and a state function.
// The depth bound stops the recursion on StyleXArray itself, which nests without end.
type KeysOf<Value, Depth extends ReadonlyArray<unknown> = []> = Depth["length"] extends 4
  ? never
  : Value extends ReadonlyArray<infer Item>
    ? KeysOf<Item, [...Depth, unknown]>
    : Value extends object
      ? keyof Value & string
      : never;

type Sets<Style> = Style extends (state: never) => infer Value ? KeysOf<Value> : KeysOf<Style>;

// Each part's styles, or the messages of the owned properties they set. Checked on the inferred
// styles, so every form, a state function returning a list included, prints the owned message.
type Checked<Styles, Owns> = {
  readonly [Part in keyof Styles]: Part extends keyof Owns
    ? [Extract<Sets<Styles[Part]>, keyof Owns[Part]>] extends [never]
      ? Styles[Part]
      : Owns[Part][Extract<Sets<Styles[Part]>, keyof Owns[Part]>]
    : Styles[Part];
};

/**
 * Styles objects applied in order, each checked against the properties its parts cannot set.
 * `Owns` maps part names to families from `owned.ts`, or is `Own.None`.
 */
export type Layers<List extends ReadonlyArray<object>, Owns> = List &
  NoInfer<{ readonly [Index in keyof List]: Checked<List[Index], Owns> }>;

/**
 * Looks up one part's styles in every layer and applies its state functions to `state`. Pass the
 * result to `sx`, `sxClassName`, `appendClass` or `appendChildClass`.
 */
export const partsOf =
  <Styles, State>(layers: ReadonlyArray<Styles>, state: State) =>
  (pick: (styles: Styles) => PartStyle<State> | undefined): ReadonlyArray<PartValue | undefined> =>
    layers.map((styles) => {
      const style = pick(styles);

      return Predicate.isFunction(style) ? style(state) : style;
    });

/** A stateless view's bundle with its part's Class last. @foldkit/ui sets no Class in these bundles. */
export const appendClass = <A>(bundle: ReadonlyArray<A>, ...styles: ReadonlyArray<SxStyles>) => [
  ...bundle,
  sx(...styles),
];

/** A Submodel bundle with its part's Class last, bound like the rest of the bundle. */
export const appendChildClass = (
  bundle: ReadonlyArray<ChildAttribute>,
  ...styles: ReadonlyArray<SxStyles>
): ReadonlyArray<ChildAttribute> => [...bundle, ...childAttributes([sx(...styles)])];
