// expect: "This @kutur-kit/foldkit-stylex release does not support the installed @foldkit/ui: Slider changed Model.dragState. Pin @foldkit/ui to an earlier version, or update @kutur-kit/foldkit-stylex once a release supports it."

import type { Supported } from "../../src/internal/supported.ts";

// An installed @foldkit/ui whose Slider keeps dragState under a type this package cannot read,
// against Slider's reads.
import { Slider } from "@foldkit/ui";

type Reads = Readonly<{ Model: Readonly<{ dragState: Readonly<{ _tag: string }> }> }>;

type Has = Readonly<{ Model: Omit<Slider.Model, "dragState"> & Readonly<{ dragState: string }> }>;

export const x: Supported<"Slider", Has, Reads, typeof Slider.view> = Slider.view;
