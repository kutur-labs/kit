// Properties that a part's styles cannot change, because @foldkit/ui writes them inline (an inline
// style beats any class) or because this package sets them for the component to work. Each family
// lists every property that sets one of the same longhands, shorthands and logical aliases
// included: an inline style beats an app's class for each longhand, and StyleX lets an app's
// longhand beat this package's shorthand. test/drift/inline checks the families of the properties
// @foldkit/ui writes inline. A component module maps its parts to these families in its `Owns` type.

type Inline<P extends string, Fix extends string> = Readonly<{
  [K in P]: `@foldkit/ui sets ${K} inline on this part. ${Fix}`;
}>;

type Functional<P extends string, Fix extends string> = Readonly<{
  [K in P]: `@kutur-kit/foldkit-stylex sets ${K} on this part so the component works. ${Fix}`;
}>;

type Inset =
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
  | "border"
  | "borderWidth"
  | "borderStyle"
  | "borderColor"
  | "borderBlock"
  | "borderBlockWidth"
  | "borderBlockStyle"
  | "borderBlockColor"
  | "borderInline"
  | "borderInlineWidth"
  | "borderInlineStyle"
  | "borderInlineColor"
  | "borderTop"
  | "borderTopWidth"
  | "borderTopStyle"
  | "borderTopColor"
  | "borderRight"
  | "borderRightWidth"
  | "borderRightStyle"
  | "borderRightColor"
  | "borderBottom"
  | "borderBottomWidth"
  | "borderBottomStyle"
  | "borderBottomColor"
  | "borderLeft"
  | "borderLeftWidth"
  | "borderLeftStyle"
  | "borderLeftColor"
  // The border shorthand also resets border-image.
  | "borderImage"
  | "borderImageSource"
  | "borderImageSlice"
  | "borderImageWidth"
  | "borderImageOutset"
  | "borderImageRepeat";

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
  | "overflow"
  | "overflowY"
  | "overflowBlock"
  | "overscrollBehavior"
  | "overscrollBehaviorY"
  | "overscrollBehaviorBlock",
  "Floating UI positions the panel and caps its height; size and scroll an element inside it."
>;

/** A Tooltip panel takes no pointer events on top of the anchored panel's inline styles. */
export type TooltipPanel = AnchoredPanel &
  Inline<"pointerEvents", "A tooltip is not interactive; put interactive content in a Popover.">;

/** Listbox, Menu and Popover, DatePicker's included, lift their trigger while the panel is open. */
export type OpenTrigger = Inline<
  "position" | "zIndex",
  "It is set only while the panel is open, so a class value would apply only while it is closed."
>;

/** The element around an anchored trigger, which this package positions. */
export type Wrapper = Functional<
  "position",
  "Inside a <dialog>, @foldkit/ui moves the backdrop next to this wrapper, so it stays positioned."
>;

/** The outside-click catcher of an anchored panel, which this package makes cover the viewport. */
export type Backdrop = Functional<
  "position" | Inset,
  "The backdrop covers the viewport to catch outside clicks; style its color and opacity."
>;

/** Popover's arrow, which this package places on the panel edge that faces the trigger. */
export type Arrow = Functional<
  "position" | Inset | "translate" | "rotate",
  "It is centred on the panel edge that faces the trigger; draw it pointing up in a square box."
>;

export type DialogElement = Inline<
  Size | Padding | Border | Background | "position" | Inset | "zIndex",
  "Style the panel inside the dialog."
>;

export type DialogBackdrop = Inline<"minHeight" | "minBlockSize", "Style its color and opacity."> &
  Functional<"position" | Inset, "The backdrop covers the viewport to catch outside clicks.">;

export type ToastContainer = Inline<
  | "position"
  | "display"
  | "flexDirection"
  | "flexFlow"
  | "gap"
  | "rowGap"
  | "columnGap"
  | Padding
  | "pointerEvents"
  | "zIndex"
  | Inset
  | "transform",
  "Style each entry instead."
>;

export type ToastEntry = Inline<
  "pointerEvents" | "touchAction" | "translate",
  "Swipe-to-dismiss moves the entry with translate; animate opacity, scale or transform instead."
>;

export type SliderTrack = Inline<"position" | "touchAction", "Style its size and color.">;

export type SliderFill = Inline<
  "position" | Inset | Size | "pointerEvents",
  "Its geometry follows the value; style its color."
>;

export type SliderThumb = Inline<
  "position" | Inset | "transform" | "touchAction",
  "Its position follows the value; use scale for press feedback."
>;

/** Meter's fill and Progress's indicator, whose width @foldkit/ui sets from the value. */
export type ValueFill = Inline<
  "width" | "inlineSize",
  "Its width follows the value; style its height and color."
>;

/** VirtualList's container, which scrolls and measures its rows. */
export type VirtualListContainer = Inline<
  | "overflow"
  | "overflowX"
  | "overflowY"
  | "overflowBlock"
  | "overflowInline"
  | "overflowAnchor"
  | "listStyle"
  | "listStyleType"
  | "listStylePosition"
  | "listStyleImage"
  | Margin
  | Padding,
  "The list scrolls and measures this element; style its size, border and background, and space rows inside itemToView."
>;

/** A DragAndDrop draggable, which takes pointer and touch input for dragging. */
export type Draggable = Inline<
  "touchAction" | "userSelect",
  "Dragging by pointer and touch relies on it; style the element's look."
>;
