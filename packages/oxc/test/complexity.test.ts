import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { test } from "node:test";
import { fileURLToPath } from "node:url";

for (const preset of ["base", "effect"]) {
  await test(`${preset} rejects complex and deeply nested functions while accepting simple code`, () => {
    const directory = mkdtempSync(join(tmpdir(), "kit-complexity-"));

    try {
      const config = join(directory, "oxlint.config.ts");
      const modulePath = fileURLToPath(new URL(`../src/${preset}.ts`, import.meta.url));
      writeFileSync(
        config,
        `import preset from ${JSON.stringify(modulePath)};\nexport default preset;\n`,
      );
      const good = join(directory, "good.ts");
      const bad = join(directory, "bad.ts");
      writeFileSync(
        good,
        "export function simple(value: number) { return value > 0 ? value : 0; }\n",
      );
      writeFileSync(
        bad,
        `export function complex(value: number) {\n${Array.from({ length: 16 }, (_, index) => `if (value === ${index}) return ${index};`).join("\n")}\nreturn -1;\n}\nexport function nested(value: number) {\nif (value > 0) { if (value > 1) { if (value > 2) { if (value > 3) { return 4; } } } }\nreturn 0;\n}\n`,
      );

      const lint = (file: string) =>
        spawnSync("pnpm", ["exec", "oxlint", "--config", config, file], { encoding: "utf8" });

      const accepted = lint(good);
      const rejected = lint(bad);
      assert.equal(accepted.status, 0, accepted.stdout + accepted.stderr);
      assert.equal(rejected.status, 1, rejected.stdout + rejected.stderr);
      assert.match(rejected.stdout + rejected.stderr, /sonarjs\(cognitive-complexity\)/);
      assert.match(rejected.stdout + rejected.stderr, /eslint\(max-depth\)/);
    } finally {
      rmSync(directory, { recursive: true, force: true });
    }
  });
}
