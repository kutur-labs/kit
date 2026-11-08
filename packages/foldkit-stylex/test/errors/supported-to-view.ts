// expect: "This @kutur-kit/foldkit-stylex release does not support the installed @foldkit/ui: Calendar changed ViewInputs.toView. Pin @foldkit/ui to an earlier version, or update @kutur-kit/foldkit-stylex once a release supports it."
import type { Has, Reads } from "../../src/internal/calendar.ts";
import type { Supported } from "../../src/internal/supported.ts";

// An installed @foldkit/ui whose Calendar renamed toView, against Calendar's reads.
import { Calendar } from "@foldkit/ui";

type Inputs = Calendar.ViewInputs;

type Renamed = Omit<Inputs, "toView"> & Readonly<{ toContent: Inputs["toView"] }>;

export const x: Supported<
  "Calendar",
  Has<Renamed>,
  Reads<"toView">,
  typeof Calendar.view
> = Calendar.view;
