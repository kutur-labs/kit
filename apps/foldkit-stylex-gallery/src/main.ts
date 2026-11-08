import type { Document, Html, HtmlBuilder } from "foldkit/html";

import { sx, type SxStyles } from "@kutur-kit/foldkit-stylex";
import { color } from "@kutur-kit/foldkit-stylex-theme/tokens.stylex";
import * as stylex from "@stylexjs/stylex";
import { Array, Data, Option, Record, Schema } from "effect";
import { Command, Subscription, type Update } from "foldkit";
import { defineMessageUnion } from "foldkit/message";
import { defineView, type View } from "foldkit/submodel";

import { pageOf, pages, type AnyDemo, type Page } from "./pages.ts";
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
  /** Each demo's model, in the order of `sectionsOf(screen)`. */
  demos: Schema.Array(Schema.Unknown),
  themePicker: ThemePicker.Model,
});

export type Model = typeof Model.Type;

export const Message = defineMessageUnion({
  GotDemoMessage: { index: Schema.Int, message: Schema.Unknown },
  GotThemePickerMessage: { message: ThemePicker.Message },
});

export type Message = typeof Message.Type;

// A demo's own Message. The page carries it back to that demo without reading it.
type DemoMessage = Extract<Message, Readonly<{ _tag: "GotDemoMessage" }>>["message"];

const liftDemo = (index: number) => (message: DemoMessage) =>
  Message.GotDemoMessage({ index, message });

const styles = stylex.create({
  body: { display: "grid", gap: 24, padding: 24 },
  header: { display: "flex", flexWrap: "wrap", alignItems: "center", gap: 16 },
  nav: { display: "flex", flexWrap: "wrap", gap: 4, margin: 0, padding: 0, listStyle: "none" },
  link: { display: "inline-flex", alignItems: "center", minBlockSize: 44, paddingInline: 8 },
  sections: { display: "grid", gap: 24 },
  section: { display: "grid", gap: 16, padding: 24, borderRadius: 8 },
  core: { borderWidth: 1, borderStyle: "dashed", borderColor: "GrayText" },
  // The themed demo sits on the theme's canvas, so the contrast checks measure the theme's pairs.
  themed: { backgroundColor: color.surface, color: color.text },
  heading: { margin: 0, fontSize: 16 },
});

type Section = Readonly<{
  heading: string;
  slotId: string;
  style: SxStyles;
  demo: AnyDemo;
  // Branded once per program: `h.submodel` takes a view built with defineView.
  view: View<unknown, DemoMessage>;
}>;

const sectionOf = (heading: string, slotId: string, style: SxStyles, demo: AnyDemo): Section => ({
  heading,
  slotId,
  style,
  demo,
  view: defineView<unknown, DemoMessage>(demo.view),
});

const sectionsOf = Screen.$match({
  Index: (): ReadonlyArray<Section> => [],
  Component: ({ page }) => [
    sectionOf("@kutur-kit/foldkit-stylex", "core", styles.core, page.core),
    ...Option.toArray(page.themed).map((demo) =>
      sectionOf("With @kutur-kit/foldkit-stylex-theme", "themed", styles.themed, demo),
    ),
  ],
});

/** The gallery for one screen, as `Runtime.makeApplication` and `Server.renderToString` take it. */
export const programOf = (screen: Screen) => {
  const sections = sectionsOf(screen);

  const init = (): Update.Return<Model, Message> => {
    const demos = sections.map(({ demo }, index) => {
      const { model, commands } = demo.init();

      return { model, commands: Command.mapMessages(commands, liftDemo(index)) };
    });

    return {
      model: { demos: demos.map(({ model }) => model), themePicker: ThemePicker.init() },
      commands: demos.flatMap(({ commands }) => commands),
    };
  };

  // Prefixed with each demo's slot: Subscription.aggregate throws on a key that two demos share.
  const subscriptions = Subscription.aggregate<Model, Message>()(
    ...sections.map(({ demo, slotId }, index) =>
      Record.mapKeys(
        Subscription.lift(demo.subscriptions ?? {})<Model, Message>({
          read: (model) => Array.get(model.demos, index),
          toParentMessage: liftDemo(index),
        }),
        (key) => `${slotId}-${key}`,
      ),
    ),
  );

  const update = (model: Model, message: Message): Update.Return<Model, Message> =>
    Message.match<Update.Return<Model, Message>>(message, {
      GotDemoMessage: ({ index, message }) =>
        Option.match(
          Option.all({ section: Array.get(sections, index), demo: Array.get(model.demos, index) }),
          {
            // Only the views of these sections send it, each with its own index.
            onNone: () => ({ model }),
            onSome: ({ section, demo }) => {
              const next = section.demo.update(demo, message);

              return {
                model: {
                  ...model,
                  demos: model.demos.map((current, at) => (at === index ? next.model : current)),
                },
                commands: Command.mapMessages(next.commands, liftDemo(index)),
              };
            },
          },
        ),
      GotThemePickerMessage: ({ message }) => {
        const next = ThemePicker.update(model.themePicker, message);

        return {
          model: { ...model, themePicker: next.model },
          commands: Command.mapMessages(next.commands, (message) =>
            Message.GotThemePickerMessage({ message }),
          ),
        };
      },
    });

  const componentList = (h: HtmlBuilder<Message>): Html =>
    h.ul(
      [sx(styles.nav)],
      pages.map((page) =>
        h.li([], [h.a([h.Href(`/${page.slug}`), sx(styles.link)], [page.component])]),
      ),
    );

  const demoSections = (model: Model, h: HtmlBuilder<Message>): Html =>
    h.div(
      [sx(styles.sections)],
      sections.flatMap(({ heading, slotId, style, view }, index) =>
        Option.toArray(Array.get(model.demos, index)).map((demo) =>
          h.section(
            [h.Id(`${slotId}-demo`), sx(styles.section, style)],
            [
              h.h2([sx(styles.heading)], [heading]),
              h.submodel({ slotId, model: demo, view, toParentMessage: liftDemo(index) }),
            ],
          ),
        ),
      ),
    );

  const title = Screen.$match(screen, {
    Index: () => "Components",
    Component: ({ page }) => page.component,
  });

  const view = (model: Model, h: HtmlBuilder<Message>): Document => ({
    title: `${title} · @kutur-kit/foldkit-stylex gallery`,
    body: h.div(
      [sx(styles.body)],
      [
        h.header(
          [sx(styles.header)],
          [
            h.a([h.Href("/"), sx(styles.link)], ["All components"]),
            h.submodel({
              slotId: "theme-picker",
              model: model.themePicker,
              view: ThemePicker.view,
              toParentMessage: (message) => Message.GotThemePickerMessage({ message }),
            }),
          ],
        ),
        h.main(
          [],
          [
            h.h1([], [title]),
            Screen.$match(screen, {
              Index: () => componentList(h),
              Component: () => demoSections(model, h),
            }),
          ],
        ),
      ],
    ),
  });

  return { Model, init, update, view, subscriptions };
};
