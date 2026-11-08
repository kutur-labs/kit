// expect: '"Style group headings through the heading part of styles."'
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
      itemToConfig: (item) => ({ content: h.span([], [item]) }),
      itemGroupKey: () => "languages",
      groupToHeading: () => ({ content: h.span([], ["Languages"]), className: "heading" }),
    },
    h,
  );
