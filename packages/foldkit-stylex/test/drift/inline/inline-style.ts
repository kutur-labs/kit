// The properties @foldkit/ui writes inline on each part equal the ones its owned family in
// src/internal/owned.ts lists, so a part's styles cannot set a property an inline style overrides.
// A property @foldkit/ui adds fails a test in this directory; `owns` fails the type check where the
// property has no `Overlapping` row, or where a family lacks a property that sets the same longhand.
import { Option } from "effect";
import * as Scene from "foldkit/scene";

type Properties = Set<string>;

/**
 * A step adding the inline properties of the element `selector` finds, camel-cased as StyleX names
 * them. Custom properties carry values to the app's styles, so no part owns them.
 */
export const inline = (selector: string, into: Properties) =>
  Scene.tap((simulation) => {
    const element = Option.getOrThrow(Scene.find(simulation.html, selector));

    for (const property of Object.keys(element.data?.style ?? {})) {
      if (!property.startsWith("--")) {
        into.add(
          property.replace(/-([a-z])/g, (_dash: string, letter: string) => letter.toUpperCase()),
        );
      }
    }
  });

export const sorted = (properties: Iterable<string>) => [...properties].sort();

// Each property @foldkit/ui writes inline, with every property that sets one of its longhands in a
// horizontal writing mode, left to right or right to left. An inline style beats every class, so a
// class setting any of them loses that longhand. Add a row for each property @foldkit/ui starts
// writing inline.
type Overlapping = {
  position: "position";
  zIndex: "zIndex";
  display: "display";
  visibility: "visibility";
  pointerEvents: "pointerEvents";
  touchAction: "touchAction";
  transform: "transform";
  flexDirection: "flexDirection" | "flexFlow";
  gap: "gap" | "rowGap" | "columnGap";
  overflow: "overflow" | "overflowX" | "overflowY" | "overflowBlock" | "overflowInline";
  overflowAnchor: "overflowAnchor";
  listStyle: "listStyle" | "listStyleType" | "listStylePosition" | "listStyleImage";
  userSelect: "userSelect";
  // It sets the user-select longhand, and StyleX types no prefixed property an app could set.
  WebkitUserSelect: "userSelect";
  inset:
    | "inset"
    | "insetBlock"
    | "insetBlockStart"
    | "insetBlockEnd"
    | "insetInline"
    | "insetInlineStart"
    | "insetInlineEnd"
    | "top"
    | "right"
    | "bottom"
    | "left";
  top: "inset" | "insetBlock" | "insetBlockStart" | "top";
  bottom: "inset" | "insetBlock" | "insetBlockEnd" | "bottom";
  left: "inset" | "insetInline" | "insetInlineStart" | "insetInlineEnd" | "left";
  right: "inset" | "insetInline" | "insetInlineStart" | "insetInlineEnd" | "right";
  margin:
    | "margin"
    | "marginBlock"
    | "marginBlockStart"
    | "marginBlockEnd"
    | "marginInline"
    | "marginInlineStart"
    | "marginInlineEnd"
    | "marginTop"
    | "marginRight"
    | "marginBottom"
    | "marginLeft";
  padding:
    | "padding"
    | "paddingBlock"
    | "paddingBlockStart"
    | "paddingBlockEnd"
    | "paddingInline"
    | "paddingInlineStart"
    | "paddingInlineEnd"
    | "paddingTop"
    | "paddingRight"
    | "paddingBottom"
    | "paddingLeft";
  width: "width" | "inlineSize";
  height: "height" | "blockSize";
  maxWidth: "maxWidth" | "maxInlineSize";
  maxHeight: "maxHeight" | "maxBlockSize";
  minHeight: "minHeight" | "minBlockSize";
  // The border shorthand also resets border-image.
  border:
    | `border${"" | "Block" | "Inline" | "Top" | "Right" | "Bottom" | "Left"}${"" | "Width" | "Style" | "Color"}`
    | `borderImage${"" | "Source" | "Slice" | "Width" | "Outset" | "Repeat"}`;
  background:
    | "background"
    | `background${"Color" | "Image" | "Position" | "PositionX" | "PositionY" | "Size" | "Repeat" | "Clip" | "Origin" | "Attachment"}`;
};

type Missing<Family, Property extends keyof Overlapping> = Exclude<
  Overlapping[Property],
  keyof Family
>;

// Matches no property that lacks a row, or whose row the family misses part of, so the error names
// the fix.
type Checked<Family, Property> = Property extends keyof Overlapping
  ? [Missing<Family, Property>] extends [never]
    ? Property
    : Readonly<{
        [
          Message in `Add ${Missing<Family, Property>} to the part's owned family: it sets a longhand of ${Property}, which @foldkit/ui writes inline.`
        ]: never;
      }>
  : Readonly<{
      [
        Message in `Add an Overlapping row for ${Property & string} in test/drift/inline/inline-style.ts, listing every property that sets one of its longhands.`
      ]: never;
    }>;

/**
 * `properties`, the ones @foldkit/ui writes inline on a part whose owned family is `Family`. Fails the
 * type check for a property without an `Overlapping` row, or whose row `Family` does not cover.
 */
export const owns =
  <Family>() =>
  <const List extends ReadonlyArray<string>>(
    ...properties: List & NoInfer<{ readonly [Index in keyof List]: Checked<Family, List[Index]> }>
  ): List =>
    properties;
