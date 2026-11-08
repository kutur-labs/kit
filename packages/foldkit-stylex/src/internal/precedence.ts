// For each property, the properties StyleX applies over it on an element where both set the same
// longhand, whatever order the styles come in. StyleX ranks a property by how specific it is, not
// by where it comes: a longhand beats its shorthand, a physical property its logical alias, and
// between equal ranks the later property name wins. So a later styles object's `padding` loses to
// an earlier one's `paddingInline`. test/precedence.test.ts derives this table from StyleX's
// compiler.
export type BeatenBy = Readonly<{
  animationRange: "animationRangeEnd" | "animationRangeStart";
  backgroundPosition: "backgroundPositionX" | "backgroundPositionY";
  borderBlockColor:
    | "borderBlockEndColor"
    | "borderBlockStartColor"
    | "borderBottomColor"
    | "borderTopColor";
  borderBlockStyle:
    | "borderBlockEndStyle"
    | "borderBlockStartStyle"
    | "borderBottomStyle"
    | "borderTopStyle";
  borderBlockWidth:
    | "borderBlockEndWidth"
    | "borderBlockStartWidth"
    | "borderBottomWidth"
    | "borderTopWidth";
  borderColor:
    | "borderBlockColor"
    | "borderBlockEndColor"
    | "borderBlockStartColor"
    | "borderBottomColor"
    | "borderInlineColor"
    | "borderInlineEndColor"
    | "borderInlineStartColor"
    | "borderLeftColor"
    | "borderRightColor"
    | "borderTopColor";
  borderEndEndRadius: "borderBottomLeftRadius" | "borderBottomRightRadius";
  borderEndStartRadius: "borderBottomLeftRadius" | "borderBottomRightRadius";
  borderImage:
    | "borderImageOutset"
    | "borderImageRepeat"
    | "borderImageSlice"
    | "borderImageSource"
    | "borderImageWidth";
  borderInlineColor:
    | "borderInlineEndColor"
    | "borderInlineStartColor"
    | "borderLeftColor"
    | "borderRightColor";
  borderInlineEndColor: "borderLeftColor" | "borderRightColor";
  borderInlineEndStyle: "borderLeftStyle" | "borderRightStyle";
  borderInlineEndWidth: "borderLeftWidth" | "borderRightWidth";
  borderInlineStartColor: "borderLeftColor" | "borderRightColor";
  borderInlineStartStyle: "borderLeftStyle" | "borderRightStyle";
  borderInlineStartWidth: "borderLeftWidth" | "borderRightWidth";
  borderInlineStyle:
    | "borderInlineEndStyle"
    | "borderInlineStartStyle"
    | "borderLeftStyle"
    | "borderRightStyle"
    | "borderStyle";
  borderInlineWidth:
    | "borderInlineEndWidth"
    | "borderInlineStartWidth"
    | "borderLeftWidth"
    | "borderRightWidth"
    | "borderWidth";
  borderRadius:
    | "borderBottomLeftRadius"
    | "borderBottomRightRadius"
    | "borderEndEndRadius"
    | "borderEndStartRadius"
    | "borderStartEndRadius"
    | "borderStartStartRadius"
    | "borderTopLeftRadius"
    | "borderTopRightRadius";
  borderStartEndRadius: "borderTopLeftRadius" | "borderTopRightRadius";
  borderStartStartRadius: "borderTopLeftRadius" | "borderTopRightRadius";
  borderStyle:
    | "borderBlockEndStyle"
    | "borderBlockStartStyle"
    | "borderBlockStyle"
    | "borderBottomStyle"
    | "borderInlineEndStyle"
    | "borderInlineStartStyle"
    | "borderLeftStyle"
    | "borderRightStyle"
    | "borderTopStyle";
  borderWidth:
    | "borderBlockEndWidth"
    | "borderBlockStartWidth"
    | "borderBlockWidth"
    | "borderBottomWidth"
    | "borderInlineEndWidth"
    | "borderInlineStartWidth"
    | "borderLeftWidth"
    | "borderRightWidth"
    | "borderTopWidth";
  columnGap: "gridColumnGap";
  columnRule: "columnRuleColor" | "columnRuleStyle" | "columnRuleWidth";
  columns: "columnCount" | "columnWidth";
  containIntrinsicSize:
    | "containIntrinsicBlockSize"
    | "containIntrinsicHeight"
    | "containIntrinsicInlineSize"
    | "containIntrinsicWidth";
  container: "containerName" | "containerType";
  cornerShape:
    | "cornerBottomLeftShape"
    | "cornerBottomRightShape"
    | "cornerEndEndShape"
    | "cornerEndStartShape"
    | "cornerStartEndShape"
    | "cornerStartStartShape"
    | "cornerTopLeftShape"
    | "cornerTopRightShape";
  end: "left" | "right";
  flex: "flexBasis" | "flexGrow" | "flexShrink";
  flexFlow: "flexDirection" | "flexWrap";
  font:
    | "fontFamily"
    | "fontSize"
    | "fontStretch"
    | "fontStyle"
    | "fontVariant"
    | "fontVariantAlternates"
    | "fontVariantCaps"
    | "fontVariantEastAsian"
    | "fontVariantLigatures"
    | "fontVariantNumeric"
    | "fontVariantPosition"
    | "fontWeight"
    | "lineHeight";
  fontVariant:
    | "fontVariantAlternates"
    | "fontVariantCaps"
    | "fontVariantEastAsian"
    | "fontVariantLigatures"
    | "fontVariantNumeric"
    | "fontVariantPosition";
  gap: "columnGap" | "gridColumnGap" | "gridGap" | "gridRowGap" | "rowGap";
  grid:
    | "gridAutoColumns"
    | "gridAutoFlow"
    | "gridAutoRows"
    | "gridTemplate"
    | "gridTemplateAreas"
    | "gridTemplateColumns"
    | "gridTemplateRows";
  gridArea:
    | "gridColumn"
    | "gridColumnEnd"
    | "gridColumnStart"
    | "gridRow"
    | "gridRowEnd"
    | "gridRowStart";
  gridColumn: "gridColumnEnd" | "gridColumnStart";
  gridGap: "columnGap" | "gridColumnGap" | "gridRowGap" | "rowGap";
  gridRow: "gridRowEnd" | "gridRowStart";
  gridRowGap: "rowGap";
  gridTemplate: "gridTemplateAreas" | "gridTemplateColumns" | "gridTemplateRows";
  inset:
    | "bottom"
    | "end"
    | "insetBlock"
    | "insetBlockEnd"
    | "insetBlockStart"
    | "insetInline"
    | "insetInlineEnd"
    | "insetInlineStart"
    | "left"
    | "right"
    | "start"
    | "top";
  insetBlock: "bottom" | "insetBlockEnd" | "insetBlockStart" | "top";
  insetInline: "end" | "insetInlineEnd" | "insetInlineStart" | "left" | "right" | "start";
  insetInlineEnd: "left" | "right";
  insetInlineStart: "left" | "right";
  listStyle: "listStyleImage" | "listStylePosition" | "listStyleType";
  margin:
    | "marginBlock"
    | "marginBlockEnd"
    | "marginBlockStart"
    | "marginBottom"
    | "marginInline"
    | "marginInlineEnd"
    | "marginInlineStart"
    | "marginLeft"
    | "marginRight"
    | "marginTop";
  marginBlock: "marginBlockEnd" | "marginBlockStart" | "marginBottom" | "marginTop";
  marginInline: "marginInlineEnd" | "marginInlineStart" | "marginLeft" | "marginRight";
  marginInlineEnd: "marginLeft" | "marginRight";
  marginInlineStart: "marginLeft" | "marginRight";
  mask:
    | "maskClip"
    | "maskComposite"
    | "maskImage"
    | "maskMode"
    | "maskOrigin"
    | "maskPosition"
    | "maskRepeat"
    | "maskSize";
  maskBorder:
    | "maskBorderMode"
    | "maskBorderOutset"
    | "maskBorderRepeat"
    | "maskBorderSlice"
    | "maskBorderSource"
    | "maskBorderWidth";
  offset: "offsetAnchor" | "offsetDistance" | "offsetPath" | "offsetPosition" | "offsetRotate";
  outline: "outlineColor" | "outlineOffset" | "outlineStyle" | "outlineWidth";
  overflow: "overflowBlock" | "overflowX" | "overflowY";
  overscrollBehavior:
    | "overscrollBehaviorBlock"
    | "overscrollBehaviorInline"
    | "overscrollBehaviorX"
    | "overscrollBehaviorY";
  overscrollBehaviorBlock: "overscrollBehaviorY";
  overscrollBehaviorInline: "overscrollBehaviorX";
  padding:
    | "paddingBlock"
    | "paddingBlockEnd"
    | "paddingBlockStart"
    | "paddingBottom"
    | "paddingInline"
    | "paddingInlineEnd"
    | "paddingInlineStart"
    | "paddingLeft"
    | "paddingRight"
    | "paddingTop";
  paddingBlock: "paddingBlockEnd" | "paddingBlockStart" | "paddingBottom" | "paddingTop";
  paddingInline: "paddingInlineEnd" | "paddingInlineStart" | "paddingLeft" | "paddingRight";
  paddingInlineEnd: "paddingLeft" | "paddingRight";
  paddingInlineStart: "paddingLeft" | "paddingRight";
  placeContent: "alignContent" | "justifyContent";
  placeItems: "alignItems" | "justifyItems";
  placeSelf: "alignSelf" | "justifySelf";
  scrollMargin:
    | "scrollMarginBlock"
    | "scrollMarginBlockEnd"
    | "scrollMarginBlockStart"
    | "scrollMarginBottom"
    | "scrollMarginInline"
    | "scrollMarginInlineEnd"
    | "scrollMarginInlineStart"
    | "scrollMarginLeft"
    | "scrollMarginRight"
    | "scrollMarginTop";
  scrollMarginBlock:
    | "scrollMarginBlockEnd"
    | "scrollMarginBlockStart"
    | "scrollMarginBottom"
    | "scrollMarginTop";
  scrollMarginInline:
    | "scrollMarginInlineEnd"
    | "scrollMarginInlineStart"
    | "scrollMarginLeft"
    | "scrollMarginRight";
  scrollPadding:
    | "scrollPaddingBlock"
    | "scrollPaddingBottom"
    | "scrollPaddingInline"
    | "scrollPaddingInlineEnd"
    | "scrollPaddingInlineStart"
    | "scrollPaddingLeft"
    | "scrollPaddingRight"
    | "scrollPaddingTop";
  scrollPaddingBlock: "scrollPaddingBottom" | "scrollPaddingTop";
  scrollPaddingInline:
    | "scrollPaddingInlineEnd"
    | "scrollPaddingInlineStart"
    | "scrollPaddingLeft"
    | "scrollPaddingRight";
  scrollTimeline: "scrollTimelineAxis" | "scrollTimelineName";
  start: "left" | "right";
  textDecoration:
    | "textDecorationColor"
    | "textDecorationLine"
    | "textDecorationStyle"
    | "textDecorationThickness";
  textEmphasis: "textEmphasisColor" | "textEmphasisStyle";
  transition:
    | "transitionDelay"
    | "transitionDuration"
    | "transitionProperty"
    | "transitionTimingFunction";
}>;
