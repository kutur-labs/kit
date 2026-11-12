import type { Join } from "./join.ts";
import type { Owns } from "./owned.ts";
import type { BeatenBy } from "./precedence.ts";
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
    "Pass a static style: a part takes classes only, because @foldkit/ui owns its inline style. For a runtime value, set a custom property with h.Style on your own element around the part and read it with var() in the part's styles; a portaled panel inherits from none of your elements, so set it on an element you render inside the panel and style that element.": never;
  }>,
];

// A `stylex.createTheme` result, which the lint preset rejects. Markers match Compiled.
type Theme = Readonly<{ theme: stylex.StyleXClassNameFor<unknown, unknown> }>;

/** Static StyleX styles for one part. */
export type PartValue = stylex.StyleXArray<
  null | undefined | false | Compiled | Theme | DynamicStyle
>;

/** A part's styles, or a function from the part's state to them. */
export type PartStyle<State> = PartValue | ((state: State) => PartValue);

/**
 * A part with one class in every state. A state function on it fails with `Message`, through its
 * parameter and its result, so the message shows whether or not the function reads its state.
 * Read the part with `staticPartsOf`.
 */
export type StatelessPart<
  Message extends string =
    "This part has one class in every state, so pass its styles, not a function of state.",
> = PartValue | ((state: Readonly<{ [Key in Message]: never }>) => Message);

// What KeysOf gives for a value whose type admits any style, such as an `XStyle.Styles` annotation:
// its properties cannot be read.
type Widened = Readonly<{ widened: true }>;

// The keys a style's type spells out, without the index signature that a computed var key adds.
type KnownKeys<Style> = keyof {
  [Key in keyof Style as string extends Key ? never : number extends Key ? never : Key]: 0;
} &
  string;

// The style properties a part's value sets, through lists of any depth and falsy entries. A type
// that admits any style ends the recursion: `Compiled` and its supertypes, and a list that holds
// itself, as StyleXArray does. `any`, the type of a misspelt style or of a state function whose
// body fails to compile, sets nothing, in a list too, so that mistake's own error is the only one.
type KeysOf<Value> = 0 extends 1 & Value
  ? never
  : [Compiled] extends [Value]
    ? Widened
    : Value extends ReadonlyArray<infer Item>
      ? 0 extends 1 & Item
        ? never
        : [Value] extends [Item]
          ? Widened
          : KeysOf<Item>
      : Value extends object
        ? KnownKeys<Value>
        : never;

// The style properties a part's value or state function sets.
type Sets<Style> = Style extends (state: never) => infer Value ? KeysOf<Value> : KeysOf<Style>;

// A styles object's value for one part: styles, a state function, or the message type of a key
// that names a part wrongly. Any other value is a group of parts, such as DatePicker's `calendar`.
type Leaf = PartValue | ((state: never) => PartValue | string) | string;

// The parts of a styles object, without the keys whose type is a message for a wrong name.
type PartName<Styles> = {
  [Part in keyof Styles]-?: NonNullable<Styles[Part]> extends string ? never : Part;
}[keyof Styles] &
  string;

// One part's value in each of the layers before, as a union.
type ValuesOf<Before, Part> = Before extends unknown
  ? Part extends keyof Before
    ? Before[Part]
    : never
  : never;

// The message for each property in Keys that StyleX applies under a property an earlier layer sets,
// unless this layer sets that property too.
type Overridden<Property, Keys, Earlier> = Property extends keyof BeatenBy
  ? Extract<BeatenBy[Property], Exclude<Earlier, Keys>> extends infer Over extends string
    ? [Over] extends [never]
      ? never
      : `An earlier styles object sets ${Join<Over, " and ">} on this part, which StyleX applies over ${Property} whatever the order. Set ${Join<Over, " and ">} in this styles object too.`
    : never
  : never;

// One part's value, or the message of the first check it fails: an annotation hid its properties,
// it sets a property the part cannot set, or an earlier layer sets a property StyleX applies over
// one of its own.
type CheckedPart<Value, Owned, Earlier, Strict extends boolean> =
  Sets<Value> extends infer Keys
    ? [Extract<Keys, Widened>] extends [never]
      ? [Extract<Keys, keyof Owned>] extends [never]
        ? [Overridden<Keys, Keys, Earlier>] extends [never]
          ? Value
          : Overridden<Keys, Keys, Earlier>
        : Owned[Extract<Keys, keyof Owned>]
      : Strict extends true
        ? "These styles have a type annotation, which hides the properties they set from this view's checks. Write satisfies instead of the annotation, and pass the styles to the view where they are written."
        : Value
    : never;

// Each part of a layer, checked against the component's parts, the families of properties its
// parts cannot set and the layers before it. `Before` is a union of those layers. `Strict` is false
// when the list is an array rather than a tuple: styles spread from an array, or the
// `ReadonlyArray<Styles>` that inference falls back to after another error, whose parts would all
// read as annotated.
type Checked<Layer, Styles, Families, Before, Strict extends boolean> = {
  readonly [Part in keyof Layer]: Part extends PartName<Styles>
    ? [NonNullable<Styles[Part]>] extends [Leaf]
      ? CheckedPart<
          Layer[Part],
          Part extends keyof Families ? Families[Part] : unknown,
          Extract<Sets<ValuesOf<Before, Part>>, string>,
          Strict
        >
      : Checked<
          Layer[Part],
          NonNullable<Styles[Part]>,
          Part extends keyof Families ? Families[Part] : unknown,
          NonNullable<ValuesOf<Before, Part>>,
          Strict
        >
    : Part extends keyof Styles
      ? Layer[Part]
      : `${Part & string} names no part, so its styles would reach no element. Write ${Join<PartName<Styles>, " or ">}.`;
};

// The layers before the one at Index, as a union.
type LayersBefore<
  List,
  Index,
  Seen extends ReadonlyArray<unknown> = [],
> = `${Seen["length"]}` extends Index
  ? Seen[number]
  : List extends readonly [infer Head, ...infer Rest]
    ? LayersBefore<Rest, Index, [...Seen, Head]>
    : never;

/**
 * Styles objects applied in order after the ones in `Before`, each checked against the component's
 * `Styles`, the properties its parts cannot set and every layer before it, `Before`'s included.
 * `Component` names the component's entry in `Owns`, which maps its parts to the families in
 * `owned.ts`. Each namespace exports it as `Layers`, so a library that puts its own styles first
 * keeps the checks on the layers an app adds.
 */
export type CheckedLayers<
  List extends ReadonlyArray<object>,
  Styles,
  Component extends keyof Owns,
  Before extends ReadonlyArray<object> = [],
> = List &
  NoInfer<{
    readonly [Index in keyof List]: Checked<
      List[Index],
      Styles,
      Owns[Component],
      LayersBefore<List, Index> | Before[number],
      number extends List["length"] ? false : true
    >;
  }>;

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

/**
 * Looks up a `StatelessPart`'s styles in every layer. Its function type is there for its message
 * only and fails to compile, so a function applies no style.
 */
export const staticPartsOf =
  <Styles>(layers: ReadonlyArray<Styles>) =>
  (
    pick: (styles: Styles) => PartValue | ((state: never) => string) | undefined,
  ): ReadonlyArray<PartValue | undefined> =>
    layers.map((styles) => {
      const style = pick(styles);

      return Predicate.isFunction(style) ? undefined : style;
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
