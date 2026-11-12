import type { Join } from "./join.ts";

// Properties that a part's styles cannot set, because @foldkit/ui writes them inline (an inline
// style beats any class) or because this package sets them for the component to work. Each family
// lists every property that sets one of the same longhands, shorthands and logical aliases
// included: an inline style beats an app's class for each longhand, and StyleX lets an app's
// longhand beat this package's shorthand. test/owned.test.ts checks that each family is complete,
// test/drift/inline that @foldkit/ui writes inline only what a part's family says it writes, and
// the gallery's test/browser/anchored-panels.test.ts the same for what Floating UI writes in a
// browser. `Owns` maps each component's parts to these families.

// A family of `Members`, of which @foldkit/ui writes `Written` inline. `Together` lists the members
// that share no longhand with `Written` but work with it, such as `bottom` with an inline `top`,
// so that an app's value would change what the inline style does. The others overlap `Written`.
// test/owned.test.ts checks which members are which.
type Inline<
  Members extends string,
  Written extends Members,
  Fix extends string,
  Together extends Exclude<Members, Written> = never,
> = Readonly<
  { [K in Written]: `@foldkit/ui sets ${K} inline on this part. ${Fix}` } & {
    [
      K in Exclude<Members, Written | Together>
    ]: `@foldkit/ui sets ${Join<Written, " and ">} inline on this part, and ${K} overlaps what it sets. ${Fix}`;
  } & {
    [
      K in Together
    ]: `@foldkit/ui sets ${Join<Written, " and ">} inline on this part, and ${K} works together with them, so a value of yours would change what they do. ${Fix}`;
  }
>;

// A family of `Members`, of which this package sets `Set` for the component to work. `Together`
// is as for `Inline`.
type Functional<
  Members extends string,
  Set extends Members,
  Fix extends string,
  Together extends Exclude<Members, Set> = never,
> = Readonly<
  {
    [K in Set]: `@kutur-kit/foldkit-stylex sets ${K} on this part so the component works. ${Fix}`;
  } & {
    [
      K in Exclude<Members, Set | Together>
    ]: `@kutur-kit/foldkit-stylex sets ${Join<Set, " and ">} on this part so the component works, and ${K} overlaps what it sets. ${Fix}`;
  } & {
    [
      K in Together
    ]: `@kutur-kit/foldkit-stylex sets ${Join<Set, " and ">} on this part so the component works, and ${K} works together with them, so a value of yours would change what they do. ${Fix}`;
  }
>;

type Inset =
  | "inset"
  | "insetBlock"
  | "insetBlockStart"
  | "insetBlockEnd"
  | "insetInline"
  | "insetInlineStart"
  | "insetInlineEnd"
  // StyleX's legacy names for insetInlineStart and insetInlineEnd.
  | "start"
  | "end"
  | "top"
  | "right"
  | "bottom"
  | "left";

type Margin =
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

type Padding =
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

type Size =
  | "width"
  | "height"
  | "inlineSize"
  | "blockSize"
  | "maxWidth"
  | "maxHeight"
  | "maxInlineSize"
  | "maxBlockSize";

type Border =
  | `border${"" | "Block" | "BlockStart" | "BlockEnd" | "Inline" | "InlineStart" | "InlineEnd" | "Top" | "Right" | "Bottom" | "Left"}${"" | "Width" | "Style" | "Color"}`
  // The border shorthand also resets border-image.
  | `borderImage${"" | "Source" | "Slice" | "Width" | "Outset" | "Repeat"}`;

type Overflow = "overflow" | "overflowX" | "overflowY" | "overflowBlock" | "overflowInline";

type Gap = "gap" | "rowGap" | "columnGap" | "gridGap" | "gridRowGap" | "gridColumnGap";

type Background =
  | "background"
  | "backgroundColor"
  | "backgroundImage"
  | "backgroundPosition"
  | "backgroundPositionX"
  | "backgroundPositionY"
  | "backgroundSize"
  | "backgroundRepeat"
  | "backgroundClip"
  | "backgroundOrigin"
  | "backgroundAttachment";

/** For a component with no part that owns a property. */
export type None = Readonly<Record<never, never>>;

/** Anchor positions panels with Floating UI and writes these inline. */
export type AnchoredPanel = Inline<
  | "position"
  | "visibility"
  | Inset
  | Margin
  | "maxHeight"
  | "maxBlockSize"
  | Overflow
  // Floating UI sets the shorthand, so it owns both axes.
  | `overscrollBehavior${"" | "X" | "Y" | "Block" | "Inline"}`,
  // The view writes position, margin and visibility; Floating UI then writes the rest while the
  // panel is open.
  | "position"
  | "visibility"
  | "margin"
  | "left"
  | "top"
  | "maxHeight"
  | "overflowY"
  | "overscrollBehavior",
  "Floating UI positions the panel and caps its height; size and scroll an element inside it.",
  "bottom" | "insetBlockEnd" | "overflowX" | "overflowInline"
>;

/** A Tooltip panel takes no pointer events on top of the anchored panel's inline styles. */
export type TooltipPanel = AnchoredPanel &
  Inline<
    "pointerEvents",
    "pointerEvents",
    "A tooltip is not interactive; put interactive content in a Popover."
  >;

/** Listbox, Menu and Popover, DatePicker's included, lift their trigger while the panel is open. */
export type OpenTrigger = Inline<
  "position" | "zIndex",
  "position" | "zIndex",
  "It is set only while the panel is open, so a class value would apply only while it is closed. Layer the trigger with zIndex on wrapper, and position an element of your own inside or around it."
>;

/** The element around an anchored trigger, which this package positions. */
export type Wrapper = Functional<
  "position",
  "position",
  "Inside a <dialog>, @foldkit/ui moves the backdrop next to this wrapper, so it stays positioned. To place the component, position an element of your own around it."
>;

/** The outside-click catcher of an anchored panel, which this package makes cover the viewport. */
export type Backdrop = Functional<
  "position" | Inset,
  "position" | "inset",
  "The backdrop covers the viewport to catch outside clicks; style its color and opacity."
>;

/** Popover's arrow, which this package places on the panel edge that faces the trigger. */
export type Arrow = Functional<
  "position" | Inset | "translate" | "rotate",
  "position" | "top" | "right" | "bottom" | "left" | "translate" | "rotate",
  "It is centred on the panel edge that faces the trigger; draw it pointing up in a square box."
>;

export type DialogElement = Inline<
  Size | Padding | Border | Background | "position" | Inset | "zIndex",
  | "width"
  | "height"
  | "maxWidth"
  | "maxHeight"
  | "padding"
  | "border"
  | "background"
  | "position"
  | "inset"
  | "zIndex",
  "Style the panel inside the dialog."
>;

export type DialogBackdrop = Inline<
  "minHeight" | "minBlockSize",
  "minHeight",
  "Style its color and opacity."
> &
  Functional<
    "position" | Inset,
    "position" | "inset",
    "The backdrop covers the viewport to catch outside clicks."
  >;

export type ToastContainer = Inline<
  | "position"
  | "display"
  | "flexDirection"
  | "flexFlow"
  | "flexWrap"
  | Gap
  | Padding
  | "pointerEvents"
  | "zIndex"
  | Inset
  | "transform",
  | "position"
  | "display"
  | "flexDirection"
  | "gap"
  | "padding"
  | "pointerEvents"
  | "zIndex"
  | "top"
  | "right"
  | "bottom"
  | "left"
  | "transform",
  "Style each entry instead.",
  "flexWrap"
>;

export type ToastEntry = Inline<
  "pointerEvents" | "touchAction" | "translate",
  "pointerEvents" | "touchAction" | "translate",
  "Swipe-to-dismiss moves the entry with translate; animate opacity, scale or transform instead."
>;

export type SliderTrack = Inline<
  "position" | "touchAction",
  "position" | "touchAction",
  "Style its size and color."
>;

export type SliderFill = Inline<
  "position" | Inset | Size | "pointerEvents",
  "position" | "top" | "right" | "bottom" | "left" | "width" | "height" | "pointerEvents",
  "Its geometry follows the value; style its color.",
  "maxWidth" | "maxHeight" | "maxInlineSize" | "maxBlockSize"
>;

export type SliderThumb = Inline<
  "position" | Inset | "transform" | "touchAction",
  "position" | "bottom" | "left" | "transform" | "touchAction",
  "Its position follows the value; use scale for press feedback.",
  "top" | "insetBlockStart"
>;

/** Meter's fill and Progress's indicator, whose width @foldkit/ui sets from the value. */
export type ValueFill = Inline<
  "width" | "inlineSize",
  "width",
  "Its width follows the value; style its height and color."
>;

/** VirtualList's container, which scrolls and measures its rows. */
export type VirtualListContainer = Inline<
  | Overflow
  | "overflowAnchor"
  | "listStyle"
  | "listStyleType"
  | "listStylePosition"
  | "listStyleImage"
  | Margin
  | Padding,
  "overflow" | "overflowAnchor" | "listStyle" | "margin" | "padding",
  "The list scrolls and measures this element; style its size, border and background, and space rows inside itemToView."
>;

/** A DragAndDrop draggable, which takes pointer and touch input for dragging. */
export type Draggable = Inline<
  "touchAction" | "userSelect",
  "touchAction" | "userSelect",
  "Dragging by pointer and touch relies on it; style the element's look."
>;

/**
 * Each component's parts that own a family, under the name its namespace passes to
 * `CheckedLayers`; a part left out owns nothing. Every component has an entry, so a view cannot
 * skip the check, and test/drift/inline reads each part's family here, so a mapping cannot go
 * missing unnoticed.
 */
export interface Owns {
  readonly Animation: None;
  readonly Button: None;
  readonly Calendar: None;
  readonly Checkbox: None;
  readonly Combobox: Readonly<{ wrapper: Wrapper; backdrop: Backdrop; items: AnchoredPanel }>;
  readonly DatePicker: Readonly<{
    wrapper: Wrapper;
    trigger: OpenTrigger;
    backdrop: Backdrop;
    panel: AnchoredPanel;
  }>;
  readonly Dialog: Readonly<{ dialog: DialogElement; backdrop: DialogBackdrop }>;
  readonly Disclosure: None;
  readonly DragAndDrop: Readonly<{ draggable: Draggable }>;
  readonly Fieldset: None;
  readonly FileDrop: None;
  readonly HoverIntent: None;
  readonly Input: None;
  readonly Listbox: Readonly<{
    wrapper: Wrapper;
    button: OpenTrigger;
    backdrop: Backdrop;
    items: AnchoredPanel;
  }>;
  readonly Menu: Readonly<{
    wrapper: Wrapper;
    button: OpenTrigger;
    backdrop: Backdrop;
    items: AnchoredPanel;
  }>;
  readonly Meter: Readonly<{ fill: ValueFill }>;
  readonly Nav: None;
  readonly Popover: Readonly<{
    wrapper: Wrapper;
    button: OpenTrigger;
    panel: AnchoredPanel;
    backdrop: Backdrop;
    arrow: Arrow;
  }>;
  readonly Progress: Readonly<{ indicator: ValueFill }>;
  readonly RadioGroup: None;
  readonly Select: None;
  readonly Slider: Readonly<{ track: SliderTrack; filledTrack: SliderFill; thumb: SliderThumb }>;
  readonly Switch: None;
  readonly Tabs: None;
  readonly Textarea: None;
  readonly Toast: Readonly<{ container: ToastContainer; entry: ToastEntry }>;
  readonly Tooltip: Readonly<{ panel: TooltipPanel }>;
  readonly VirtualList: Readonly<{ container: VirtualListContainer }>;
}
