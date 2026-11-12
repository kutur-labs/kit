import type { Document, Html, HtmlBuilder } from "foldkit/html";

import { sx } from "@kutur-kit/foldkit-stylex";
import {
  color,
  fontSize,
  fontWeight,
  lineHeight,
  radius,
  size,
  space,
} from "@kutur-kit/foldkit-stylex-theme/tokens.stylex";
import * as stylex from "@stylexjs/stylex";
import { Data, Effect, Option, Schema } from "effect";
import { Command, Dom, Subscription, type Update } from "foldkit";
import { defineMessageUnion } from "foldkit/message";
import { defineView, type View } from "foldkit/submodel";

import * as ComponentsNav from "./components-nav.ts";
import { header as headerCover } from "./header.stylex.ts";
import { media } from "./media.stylex.ts";
import { groups, pageOf, type Page } from "./pages.ts";
import * as ThemePicker from "./theme-picker.ts";

/** What a path shows: `/` lists the components, `/<slug>` shows one. */
export type Screen = Data.TaggedEnum<{
  Index: {};
  Component: Readonly<{ page: Page }>;
}>;

const Screen = Data.taggedEnum<Screen>();

/** The screen at a URL path; none for a path that names no component. */
export const screenAt = (pathname: string): Option.Option<Screen> =>
  pathname === "/"
    ? Option.some(Screen.Index())
    : pageOf(pathname.slice(1)).pipe(Option.map((page) => Screen.Component({ page })));

export const Model = Schema.Struct({
  /** The demo's model on a component's page; none on the index. */
  demo: Schema.Option(Schema.Unknown),
  themePicker: ThemePicker.Model,
  componentsNav: ComponentsNav.Model,
});

export type Model = typeof Model.Type;

export const Message = defineMessageUnion({
  GotDemoMessage: { message: Schema.Unknown },
  GotThemePickerMessage: { message: ThemePicker.Message },
  GotComponentsNavMessage: { message: ComponentsNav.Message },
  CompletedRevealCurrentPage: {},
});

export type Message = typeof Message.Type;

// A demo's own Message. The page carries it back to the demo without reading it.
type DemoMessage = Extract<Message, Readonly<{ _tag: "GotDemoMessage" }>>["message"];

const liftDemo = (message: DemoMessage) => Message.GotDemoMessage({ message });

// A shade below the surface, so a canvas reads as a surface on the page without a heavy edge. Dark
// takes black rather than text, which would lighten it.
const page = `light-dark(color-mix(in oklab, ${color.text} 1.5%, ${color.surface}), color-mix(in oklab, #000 25%, ${color.surface}))`;

const mono = 'ui-monospace, "SF Mono", Menlo, monospace';

// Titles track a little tighter than text, as large type reads loose.
const titleTracking = "-0.011em";

// Where the sticky header ends, which the sidebar's offset and the document's scroll padding count
// on.
const headerSize = headerCover["--gallery-header-cover"];

const sidebarId = "sidebar";

// The sidebar lists more pages than a short screen shows, so the current one is scrolled into view
// once the page loads. `nearest` moves the sidebar alone, as the link is already in the viewport,
// and nothing moves if the link shows.
const RevealCurrentPage = Command.define("RevealCurrentPage", {
  messages: [Message.CompletedRevealCurrentPage],
  execute: Dom.scrollIntoViewIfNotVisible(`#${sidebarId} [aria-current="page"]`, {
    block: "nearest",
  }).pipe(Effect.orDie, Effect.as(Message.CompletedRevealCurrentPage())),
});

const styles = stylex.create({
  root: {
    minBlockSize: "100dvh",
    backgroundColor: page,
    color: color.text,
    fontSize: fontSize.md,
    lineHeight: lineHeight.md,
  },
  // The theme's focus ring, for the gallery's own links.
  focusRing: {
    outlineColor: color.accent,
    outlineOffset: 2,
    outlineStyle: { default: "none", ":focus-visible": "solid" },
    outlineWidth: 2,
  },
  // Below 40rem the pickers wrap to a second row, which would cover too much of a phone's screen
  // to stay in view.
  header: {
    boxSizing: "border-box",
    position: { default: "sticky", [media.narrow]: "static" },
    insetBlockStart: 0,
    zIndex: 1,
    display: "flex",
    flexWrap: "wrap",
    alignItems: "center",
    columnGap: space.md,
    rowGap: space.sm,
    minBlockSize: headerSize,
    paddingBlock: { default: space.sm, [media.narrow]: space.md },
    paddingInline: { default: space.lg, [media.narrow]: space.md },
    borderBlockEndWidth: 1,
    borderBlockEndStyle: "solid",
    borderBlockEndColor: color.border,
    backgroundColor: `color-mix(in oklab, ${page} 85%, transparent)`,
    backdropFilter: "blur(12px)",
  },
  wordmark: {
    display: "inline-flex",
    alignItems: "center",
    minBlockSize: size.target,
    marginInlineEnd: "auto",
    color: color.text,
    fontWeight: fontWeight.strong,
    letterSpacing: titleTracking,
    textDecorationLine: "none",
    borderRadius: radius.control,
  },
  // The sidebar replaces the Components popover where it fits.
  components: { display: { default: "block", [media.wide]: "none" } },
  layout: {
    display: { default: "block", [media.wide]: "grid" },
    gridTemplateColumns: { default: null, [media.wide]: "14rem minmax(0, 1fr)" },
  },
  // Below the header, scrolling on its own.
  sidebar: {
    display: { default: "none", [media.wide]: "block" },
    position: "sticky",
    insetBlockStart: headerSize,
    alignSelf: "start",
    boxSizing: "border-box",
    blockSize: `calc(100dvh - ${headerSize})`,
    overflowY: "auto",
    overscrollBehavior: "contain",
    paddingBlock: space.lg,
    paddingInline: space.md,
    borderInlineEndWidth: 1,
    borderInlineEndStyle: "solid",
    borderInlineEndColor: color.border,
  },
  // The layout stretches it to the sidebar's height; its rows keep their own heights at the top.
  main: {
    boxSizing: "border-box",
    display: "grid",
    alignContent: "start",
    gap: "2.5rem",
    // As wide as its column up to the limit: auto margins alone would shrink it to its content.
    inlineSize: "100%",
    maxInlineSize: "52rem",
    marginInline: "auto",
    paddingBlock: { default: "2.5rem 4rem", [media.narrow]: `${space.xl} 3rem` },
    paddingInline: { default: "2rem", [media.narrow]: space.md },
  },
  pageHeader: { display: "grid", gap: space.xs },
  title: {
    margin: 0,
    fontSize: "1.5rem",
    fontWeight: fontWeight.strong,
    letterSpacing: titleTracking,
    lineHeight: "2rem",
  },
  summary: { margin: 0, color: color.muted, textWrap: "pretty" },
  section: { display: "grid", gap: space.md },
  sectionHeader: { display: "grid", gap: space.xs },
  heading: { margin: 0, fontSize: fontSize.md, fontWeight: fontWeight.strong },
  caption: { margin: 0, color: color.muted, fontSize: fontSize.sm, textWrap: "pretty" },
  figure: { display: "grid", gap: space.sm, margin: 0 },
  // One column as wide as the canvas, so a demo's `inlineSize: 100%` resolves against it. Below
  // 40rem its fill bleeds to the viewport's edges while its content keeps the page's gutter, which
  // a 308px calendar of 44px cells overhangs into the padding to fit a 320px phone. Nothing clips
  // it, so hit areas and panels that hang outside a demo stay whole. Its corners are a step rounder
  // than a panel's, and follow radius.panel to square in Paper.
  canvas: {
    boxSizing: "border-box",
    display: "grid",
    gridTemplateColumns: "minmax(0, 1fr)",
    placeItems: "center",
    minBlockSize: "10rem",
    marginInline: { default: null, [media.narrow]: `calc(-1 * ${space.md})` },
    padding: { default: "2rem", [media.narrow]: space.lg },
    paddingInline: { default: null, [media.narrow]: space.md },
    borderWidth: 1,
    borderInlineWidth: { default: null, [media.narrow]: 0 },
    borderStyle: "solid",
    borderColor: color.border,
    borderRadius: { default: `calc(${radius.panel} * 1.2)`, [media.narrow]: 0 },
    backgroundColor: color.surface,
  },
  code: {
    color: color.muted,
    fontFamily: mono,
    fontSize: fontSize.xs,
    lineHeight: lineHeight.xs,
    overflowWrap: "anywhere",
  },
  cards: {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fill, minmax(min(15rem, 100%), 1fr))",
    gap: space.sm,
    margin: 0,
    padding: 0,
    listStyle: "none",
  },
  card: {
    boxSizing: "border-box",
    display: "grid",
    alignContent: "start",
    gap: space.xs,
    blockSize: "100%",
    paddingBlock: space.md,
    paddingInline: space.lg,
    borderWidth: 1,
    borderStyle: "solid",
    borderColor: color.border,
    borderRadius: radius.panel,
    backgroundColor: {
      default: color.surface,
      ":hover": { default: null, "@media (hover: hover)": color.subtle },
    },
    color: color.text,
    textDecorationLine: "none",
  },
  cardName: { fontWeight: fontWeight.medium },
  cardSummary: { color: color.muted, fontSize: fontSize.sm, lineHeight: lineHeight.sm },
});

/** The gallery for one screen, as `Runtime.makeApplication` and `Server.renderToString` take it. */
export const programOf = (screen: Screen) => {
  const maybePage = Screen.$match(screen, {
    Index: () => Option.none<Page>(),
    Component: ({ page }) => Option.some(page),
  });

  // Branded once per program: `h.submodel` takes a view built with defineView.
  const canvases = Option.map(maybePage, ({ demo }) => ({
    view: defineView<unknown, DemoMessage>(demo.view),
    examples: (demo.examples ?? []).map((example) => ({
      ...example,
      view: defineView<unknown, DemoMessage>(example.view),
    })),
  }));

  const init = (): Update.Return<Model, Message> => {
    const started = Option.map(maybePage, ({ demo }) => demo.init());

    return {
      model: {
        demo: Option.map(started, ({ model }) => model),
        themePicker: ThemePicker.init(),
        componentsNav: ComponentsNav.init(),
      },
      commands: Option.match(started, {
        onNone: () => [],
        onSome: ({ commands }) => [...Command.mapMessages(commands, liftDemo), RevealCurrentPage()],
      }),
    };
  };

  const subscriptions = Subscription.lift(
    Option.match(maybePage, { onNone: () => ({}), onSome: ({ demo }) => demo.subscriptions ?? {} }),
  )<Model, Message>({ read: (model) => model.demo, toParentMessage: liftDemo });

  const update = (model: Model, message: Message): Update.Return<Model, Message> =>
    Message.match<Update.Return<Model, Message>>(message, {
      GotDemoMessage: ({ message }) =>
        Option.match(Option.all({ page: maybePage, demo: model.demo }), {
          // Only a component's page renders a demo, which sends it.
          onNone: () => ({ model }),
          onSome: ({ page, demo }) => {
            const next = page.demo.update(demo, message);

            return {
              model: { ...model, demo: Option.some(next.model) },
              commands: Command.mapMessages(next.commands, liftDemo),
            };
          },
        }),
      GotThemePickerMessage: ({ message }) => {
        const next = ThemePicker.update(model.themePicker, message);

        return {
          model: { ...model, themePicker: next.model },
          commands: Command.mapMessages(next.commands, (message) =>
            Message.GotThemePickerMessage({ message }),
          ),
        };
      },
      GotComponentsNavMessage: ({ message }) => {
        const next = ComponentsNav.update(model.componentsNav, message);

        return {
          model: { ...model, componentsNav: next.model },
          commands: Command.mapMessages(next.commands, (message) =>
            Message.GotComponentsNavMessage({ message }),
          ),
        };
      },
      CompletedRevealCurrentPage: () => ({ model }),
    });

  const isCurrent = (slug: string) => Option.exists(maybePage, (page) => page.slug === slug);

  const header = (model: Model, h: HtmlBuilder<Message>): Html =>
    h.header(
      [sx(styles.header)],
      [
        h.a([h.Href("/"), sx(styles.wordmark, styles.focusRing)], ["foldkit-stylex"]),
        h.div(
          [sx(styles.components)],
          [
            h.submodel({
              slotId: "components-nav",
              model: model.componentsNav,
              view: ComponentsNav.view,
              viewInputs: { isItemCurrent: isCurrent },
              toParentMessage: (message) => Message.GotComponentsNavMessage({ message }),
            }),
          ],
        ),
        h.submodel({
          slotId: "theme-picker",
          model: model.themePicker,
          view: ThemePicker.view,
          toParentMessage: (message) => Message.GotThemePickerMessage({ message }),
        }),
      ],
    );

  const sidebar = (h: HtmlBuilder<Message>): Html =>
    h.aside(
      [h.Id(sidebarId), sx(styles.sidebar)],
      [ComponentsNav.links({ isItemCurrent: isCurrent }, h)],
    );

  const pageHeader = (title: string, summary: string, h: HtmlBuilder<Message>): Html =>
    h.div(
      [sx(styles.pageHeader)],
      [h.h1([sx(styles.title)], [title]), h.p([sx(styles.summary)], [summary])],
    );

  const index = (h: HtmlBuilder<Message>): ReadonlyArray<Html> => [
    pageHeader("Components", "Every @foldkit/ui component, styled by the theme.", h),
    ...groups.map((group) =>
      h.section(
        [sx(styles.section)],
        [
          h.h2([sx(styles.heading)], [group.heading]),
          h.ul(
            [sx(styles.cards)],
            group.pages.map((page) =>
              h.li(
                [],
                [
                  h.a(
                    [h.Href(`/${page.slug}`), sx(styles.card, styles.focusRing)],
                    [
                      h.span([sx(styles.cardName)], [page.component]),
                      h.span([sx(styles.cardSummary)], [page.demo.summary]),
                    ],
                  ),
                ],
              ),
            ),
          ),
        ],
      ),
    ),
  ];

  const component = (page: Page, model: Model, h: HtmlBuilder<Message>): ReadonlyArray<Html> => [
    pageHeader(page.component, page.demo.summary, h),
    ...Option.toArray(Option.all({ canvases, demo: model.demo })).flatMap(({ canvases, demo }) => {
      const canvas = (id: string, view: View<unknown, DemoMessage>) =>
        h.div(
          [h.Id(id), sx(styles.canvas)],
          [h.submodel({ slotId: id, model: demo, view, toParentMessage: liftDemo })],
        );

      return [
        canvas("demo", canvases.view),
        ...canvases.examples.map(({ heading, caption, code, view }, index) =>
          h.section(
            [sx(styles.section)],
            [
              h.div(
                [sx(styles.sectionHeader)],
                [h.h2([sx(styles.heading)], [heading]), h.p([sx(styles.caption)], [caption])],
              ),
              h.figure(
                [sx(styles.figure)],
                [
                  canvas(`example-${index + 1}`, view),
                  h.figcaption([], [h.code([sx(styles.code)], [code])]),
                ],
              ),
            ],
          ),
        ),
      ];
    }),
  ];

  const title = Option.match(maybePage, {
    onNone: () => "Components",
    onSome: (page) => page.component,
  });

  const view = (model: Model, h: HtmlBuilder<Message>): Document => ({
    title: `${title} · @kutur-kit/foldkit-stylex gallery`,
    body: h.div(
      [sx(styles.root)],
      [
        header(model, h),
        h.div(
          [sx(styles.layout)],
          [
            sidebar(h),
            h.main(
              [sx(styles.main)],
              Option.match(maybePage, {
                onNone: () => index(h),
                onSome: (page) => component(page, model, h),
              }),
            ),
          ],
        ),
      ],
    ),
  });

  return { Model, init, update, view, subscriptions };
};
