import { expect, given, role, scene } from "foldkit/scene";
import { describe, test } from "vitest";

import { init, update, view } from "./app-themed.ts";

describe("the themed Popover demo from the packed packages", () => {
  test("renders its trigger closed", () => {
    const trigger = role("button", { name: "Details" });

    scene(
      { update, view },
      given(init().model),
      expect(trigger).toExist(),
      expect(trigger).not.toHaveAttr("data-open"),
    );
  });
});
