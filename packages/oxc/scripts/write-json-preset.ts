// Writes dist/foldkit-stylex.json for `.oxlintrc.json`, which extends a config by path and resolves
// its plugin specifiers from the directory of the file that declares them.
import { existsSync, writeFileSync } from "node:fs";
import { join, relative } from "node:path";
import { fileURLToPath } from "node:url";

import foldkitStylex from "../src/foldkit-stylex.ts";

const src = fileURLToPath(new URL("../src/", import.meta.url));

const dist = fileURLToPath(new URL("../dist/", import.meta.url));

// A kit module becomes a path relative to dist, where tsrs writes its JavaScript. A dependency
// becomes its package name, which the consumer's package manager links beside this package.
const specifierOf = (path: string) => {
  if (path.startsWith(src)) {
    const compiled = relative(src, path).replace(/\.ts$/, ".js");

    if (!existsSync(join(dist, compiled))) {
      throw new Error(`dist/${compiled} is missing. Run tsrs before this script.`);
    }

    return `./${compiled}`;
  }

  const name = /.*node_modules\/((?:@[^/]+\/)?[^/]+)/.exec(path)?.[1];

  if (name === undefined || fileURLToPath(import.meta.resolve(name)) !== path) {
    throw new Error(
      `${path} is not the main entry of a package, so a bare specifier cannot name it in the JSON preset.`,
    );
  }

  return name;
};

const preset = {
  ...foldkitStylex,
  jsPlugins: foldkitStylex.jsPlugins.map(({ name, specifier }) => ({
    name,
    specifier: specifierOf(specifier),
  })),
};

writeFileSync(join(dist, "foldkit-stylex.json"), `${JSON.stringify(preset, null, 2)}\n`);
