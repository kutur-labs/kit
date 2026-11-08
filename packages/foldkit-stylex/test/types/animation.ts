import type { Html, HtmlBuilder } from "foldkit/html";

import { Animation } from "@foldkit/ui";
import { AnimationStyle } from "@kutur-kit/foldkit-stylex";
import * as stylex from "@stylexjs/stylex";
import { defineMessageUnion } from "foldkit/message";

const Message = defineMessageUnion({ GotNoticeMessage: { message: Animation.Message } });

type Message = typeof Message.Type;

const fadeIn = stylex.keyframes({ from: { opacity: 0 } });

const fadeOut = stylex.keyframes({ to: { opacity: 0 } });

const styles = stylex.create({
  notice: { padding: 16, transitionProperty: "opacity", transitionDuration: "200ms" },
  closed: { opacity: 0 },
  enter: { animationName: fadeIn, animationDuration: "200ms" },
  leave: { animationName: fadeOut, animationDuration: "200ms", animationFillMode: "forwards" },
});

// A transition on isClosed.
const noticeView = AnimationStyle.view(Animation.view, {
  element: (state) => [styles.notice, state.isClosed && styles.closed],
});

// Keyframe animations on isShowing.
const toastView = AnimationStyle.view(Animation.view, {
  element: (state) => (state.isShowing ? styles.enter : styles.leave),
});

const viewInputs = (h: HtmlBuilder<Message>): AnimationStyle.ViewInputs => ({
  content: h.p([], ["Zapisano."]),
  element: "section",
  animateSize: true,
});

export const notice = (model: Animation.Model, h: HtmlBuilder<Message>): Html =>
  h.submodel({
    slotId: model.id,
    model,
    view: noticeView,
    viewInputs: viewInputs(h),
    toParentMessage: (message) => Message.GotNoticeMessage({ message }),
  });

export const toast = (model: Animation.Model, h: HtmlBuilder<Message>): Html =>
  h.submodel({
    slotId: model.id,
    model,
    view: toastView,
    viewInputs: viewInputs(h),
    toParentMessage: (message) => Message.GotNoticeMessage({ message }),
  });
