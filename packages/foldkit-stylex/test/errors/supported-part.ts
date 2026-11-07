// expect: "This @kutur-kit/foldkit-stylex release does not support the installed @foldkit/ui: Popover changed RenderInfo.arrow. Pin @foldkit/ui to an earlier version, or update @kutur-kit/foldkit-stylex once a release supports it."

import type { Supported } from "../../src/internal/supported.ts";
// An installed @foldkit/ui whose Popover lost its arrow part, against Popover's reads.
import type { ChildAttribute } from "foldkit/html";

import { Popover } from "@foldkit/ui";

type Reads = Readonly<{
  RenderInfo: Readonly<
    Record<"button" | "panel" | "backdrop" | "arrow", ReadonlyArray<ChildAttribute>>
  > &
    Readonly<{ isVisible: boolean }>;
  Model: Readonly<{ animation: Readonly<{ transitionState: string }> }>;
}>;

type Has = Readonly<{ RenderInfo: Omit<Popover.RenderInfo, "arrow">; Model: Popover.Model }>;

export const x: Supported<"Popover", Has, Reads, typeof Popover.view> = Popover.view;
