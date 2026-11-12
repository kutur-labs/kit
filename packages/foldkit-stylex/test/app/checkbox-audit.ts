import { audit, recordMotion } from "@kutur-kit/foldkit-stylex/testing";
import { Runtime } from "foldkit";
import { expect, onTestFinished, test } from "vitest";
import { page } from "vitest/browser";

import { Model, init, update, view } from "./checkbox.ts";

recordMotion();

test("the terms checkbox", async () => {
  const container = document.body.appendChild(document.createElement("div"));
  container.id = "terms-app";
  const app = Runtime.embed(Runtime.makeElement({ Model, init, update, view, container }));
  onTestFinished(app.dispose);
  const checkbox = page.getByRole("checkbox", { name: "I accept the terms" });
  await checkbox.click();

  // The look the app ships has loaded, so audit measures it rather than bare markup.
  expect(getComputedStyle(checkbox.element()).blockSize).toBe("24px");
  expect(await audit({ level: "AA" })).toEqual([]);
});
