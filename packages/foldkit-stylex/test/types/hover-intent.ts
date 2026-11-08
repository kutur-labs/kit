import type { Html, HtmlBuilder } from "foldkit/html";

import { HoverIntent } from "@foldkit/ui";
import { HoverIntentStyle } from "@kutur-kit/foldkit-stylex";
import * as stylex from "@stylexjs/stylex";
import { defineMessageUnion } from "foldkit/message";

const Message = defineMessageUnion({ GotProfileMessage: { message: HoverIntent.Message } });

type Message = typeof Message.Type;

// `toParentMessage` compiles only while the styled view keeps HoverIntent's Message.
export const profile = (model: HoverIntent.Model, h: HtmlBuilder<Message>): Html =>
  h.submodel({
    slotId: "profile",
    model,
    view: hoverIntentView,
    viewInputs: {
      focusTriggerSelector: "#profile-trigger",
      toView: ({ trigger, panel }) =>
        h.div(
          [],
          [
            h.a([...trigger, h.Id("profile-trigger"), h.Href("/profil")], ["Profil"]),
            h.div([...panel], ["Zalogowano"]),
          ],
        ),
    },
    toParentMessage: (message) => Message.GotProfileMessage({ message }),
  });

const styles = stylex.create({
  // The panel stays rendered, so it hides with visibility, which also keeps it from taking hover.
  panel: { transitionProperty: "opacity, visibility", transitionDuration: "150ms" },
  panelHidden: { opacity: 0, visibility: "hidden" },
});

const hoverIntentView = HoverIntentStyle.view(HoverIntent.view, {
  panel: (state) => [styles.panel, !state.isVisible && styles.panelHidden],
});
