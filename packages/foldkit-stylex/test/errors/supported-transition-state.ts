// expect: "This @kutur-kit/foldkit-stylex release does not support the installed @foldkit/ui: Listbox changed Model.animation. Pin @foldkit/ui to an earlier version, or update @kutur-kit/foldkit-stylex once a release supports it."
import type { Has } from "../../src/internal/items.ts";
import type { Reads } from "../../src/internal/listbox.ts";
import type { Supported } from "../../src/internal/supported.ts";

// An installed @foldkit/ui whose Listbox renamed a transition state, against Listbox's reads.
import { Listbox } from "@foldkit/ui";

type Animation = Listbox.Model["animation"];

type Model = Omit<Listbox.Model, "animation"> &
  Readonly<{
    animation: Omit<Animation, "transitionState"> &
      Readonly<{
        transitionState: Exclude<Animation["transitionState"], "LeaveAnimating"> | "Leaving";
      }>;
  }>;

const Languages = Listbox.create<"pl">();

export const x: Supported<
  "Listbox",
  Has<Model, Listbox.ViewInputs<unknown>>,
  Reads,
  typeof Languages.view
> = Languages.view;
