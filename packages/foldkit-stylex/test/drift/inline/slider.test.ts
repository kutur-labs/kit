import type * as Own from "../../../src/internal/owned.ts";
import type { HtmlBuilder } from "foldkit/html";

import { Slider } from "@foldkit/ui";
import * as Scene from "foldkit/scene";
import { expect, it } from "vitest";

import { inline, owns, sorted } from "./inline-style.ts";

it("@foldkit/ui writes inline what Slider's track, fill and thumb own, in every orientation and alignment", () => {
  const track = owns<Own.Owns["Slider"]["track"]>()("position", "touchAction");

  const filledTrack = owns<Own.Owns["Slider"]["filledTrack"]>()(
    "position",
    "top",
    "right",
    "bottom",
    "left",
    "width",
    "height",
    "pointerEvents",
  );

  const thumb = owns<Own.Owns["Slider"]["thumb"]>()(
    "position",
    "bottom",
    "left",
    "transform",
    "touchAction",
  );

  const seen = {
    track: new Set<string>(),
    filledTrack: new Set<string>(),
    thumb: new Set<string>(),
  };

  for (const orientation of ["Horizontal", "Vertical"] as const) {
    for (const thumbAlignment of ["Center", "Edge"] as const) {
      Scene.scene(
        {
          update: (model: Slider.Model) => ({ model }),
          view: (model: Slider.Model, h: HtmlBuilder<Slider.Message>) =>
            Slider.view(
              model,
              {
                value: 1,
                orientation,
                thumbAlignment,
                toView: ({ track: trackBundle, filledTrack: fill, thumb: thumbBundle }) =>
                  h.div(
                    [...trackBundle, h.Id("track")],
                    [h.div([...fill, h.Id("fill")]), h.div([...thumbBundle])],
                  ),
              },
              h,
            ),
        },
        Scene.given(Slider.init({ id: "volume", min: 0, max: 2, step: 1 })),
        inline("#track", seen.track),
        inline("#fill", seen.filledTrack),
        inline("#volume-thumb", seen.thumb),
      );
    }
  }

  expect(sorted(seen.track)).toEqual(sorted(track));
  expect(sorted(seen.filledTrack)).toEqual(sorted(filledTrack));
  expect(sorted(seen.thumb)).toEqual(sorted(thumb));
});
