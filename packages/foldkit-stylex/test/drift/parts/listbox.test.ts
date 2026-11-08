import { Listbox } from "@foldkit/ui";
import { expect, it } from "vitest";

import { styledInputs } from "../../../src/internal/listbox.ts";
import { declaredClassNames } from "./bundles.ts";

it("@foldkit/ui declares the class name inputs ListboxStyle and ListboxStyle.Multi fill", () => {
  const filled = Object.keys(
    styledInputs([], Listbox.init({ id: "language" }), {
      itemToConfig: () => ({ content: null }),
    }),
  ).filter((input) => input.endsWith("ClassName") || input === "className");

  expect(declaredClassNames("./listbox/shared.d.ts")).toEqual(filled.sort());
});
