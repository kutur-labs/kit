import { Checkbox } from "@kutur-kit/foldkit-stylex-theme/checkbox";
import { expect, test } from "vitest";

// This Vitest config runs no Foldkit plugin, so the identity comes from the packed theme, whose
// build brands its dist as @foldkit/ui's does.
test("the packed theme's marks carry Foldkit's view identity", () => {
  expect(Checkbox.mark({ isChecked: true })).toHaveProperty(
    "identity",
    expect.stringMatching(/^@kutur-kit\/foldkit-stylex-theme\//),
  );
});
