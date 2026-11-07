// expect: Type '{ readonly _tag: "Class"; readonly value: string; }' is missing the following properties from type
import type { HtmlBuilder } from "foldkit/html";

import { Listbox } from "@foldkit/ui";
import { ListboxStyle } from "@kutur-kit/foldkit-stylex";
import { Option } from "effect";

const Languages = Listbox.create<"pl" | "en">();

const languagesView = ListboxStyle.view(Languages.view);

export const x = (model: Listbox.Model, h: HtmlBuilder<Listbox.Message>) =>
  languagesView(
    model,
    {
      items: ["pl"],
      maybeSelectedValue: Option.none(),
      buttonContent: h.span([], []),
      buttonAttributes: [h.Class("trigger")],
      itemToConfig: (item) => ({ content: h.span([], [item]) }),
    },
    h,
  );
