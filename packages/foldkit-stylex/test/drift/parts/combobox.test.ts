import { Combobox } from "@foldkit/ui";
import { expect, it } from "vitest";

import { styledInputs } from "../../../src/internal/combobox.ts";
import { declaredClassNames } from "./bundles.ts";

it("@foldkit/ui declares the class name inputs ComboboxStyle and ComboboxStyle.Multi fill", () => {
  const filled = Object.keys(
    styledInputs([], Combobox.init({ id: "city" }), {
      itemToConfig: () => ({ content: null }),
    }),
  ).filter((input) => input.endsWith("ClassName") || input === "className");

  expect(declaredClassNames("./combobox/shared.d.ts")).toEqual(filled.sort());
});
