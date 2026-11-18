import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { test } from "node:test";
import { fileURLToPath } from "node:url";

// The README tells /base users to run plain `oxlint`: Oxlint has to find the installed
// tsrs by itself, without effect-tsgo or OXLINT_TSGOLINT_PATH.
await test("base runs its type-aware rules under plain oxlint", () => {
  const directory = mkdtempSync(join(tmpdir(), "kit-base-type-aware-"));

  try {
    const config = join(directory, "oxlint.config.ts");
    const modulePath = fileURLToPath(new URL("../src/base.ts", import.meta.url));
    writeFileSync(
      config,
      `import preset from ${JSON.stringify(modulePath)};\nexport default preset;\n`,
    );
    const good = join(directory, "good.ts");
    const bad = join(directory, "bad.ts");
    writeFileSync(good, "export const load = async () => { await Promise.resolve(1); };\n");
    writeFileSync(bad, "export const load = () => { Promise.resolve(1); };\n");

    const { OXLINT_TSGOLINT_PATH: _, ...env } = process.env;

    const lint = (file: string) =>
      spawnSync("pnpm", ["exec", "oxlint", "--config", config, file], { encoding: "utf8", env });

    const accepted = lint(good);
    const rejected = lint(bad);
    assert.equal(accepted.status, 0, accepted.stdout + accepted.stderr);
    assert.equal(rejected.status, 1, rejected.stdout + rejected.stderr);
    assert.match(rejected.stdout + rejected.stderr, /typescript\(no-floating-promises\)/);
  } finally {
    rmSync(directory, { recursive: true, force: true });
  }
});
