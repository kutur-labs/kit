import { Option } from "effect";
import * as Scene from "foldkit/scene";
import { expect } from "vitest";

/**
 * A step asserting that each of `fields` in `state()` equals the number @foldkit/ui sets as
 * `data-<field>` on the element `selector` finds, and is `undefined` where it sets none.
 */
export const agreesNumbers = <State>(
  selector: string,
  state: () => State | undefined,
  fields: ReadonlyArray<keyof State & string>,
) =>
  Scene.tap((simulation) => {
    const element = Option.getOrThrow(Scene.find(simulation.html, selector));
    const received = state();

    expect(received, "The part's state function never ran.").toBeDefined();

    for (const field of fields) {
      expect(received?.[field], `${selector} ${field}`).toBe(
        Option.getOrUndefined(Option.map(Scene.attr(element, `data-${field}`), Number)),
      );
    }
  });
