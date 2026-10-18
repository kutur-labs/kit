import { mkdir, readFile, writeFile } from "node:fs/promises";

import { z } from "zod";

// Descriptions come from each package's `package.json`, so the docs, the home
// page and npm show the same text.
const packages = [
  { name: "access", group: "libraries" },
  { name: "assets", group: "libraries" },
  { name: "audit", group: "libraries" },
  { name: "oxc", group: "tools" },
  { name: "tsconfig", group: "tools" },
] as const;

const root = new URL("../../../", import.meta.url);

const content = new URL("../content/", import.meta.url);

const generated = new URL("docs/", content);

const demos = new URL("../src/demos/", import.meta.url);

const Manifest = z.object({ name: z.string(), description: z.string() });

const pages = await Promise.all(
  packages.map(async ({ name, group }) => {
    const manifest = Manifest.parse(
      JSON.parse(await readFile(new URL(`packages/${name}/package.json`, root), "utf8")),
    );

    return { name, group, title: manifest.name, description: manifest.description };
  }),
);

const packageOutput = new URL("packages/", generated);

await mkdir(packageOutput, { recursive: true });

for (const { name, title, description } of pages) {
  const readme = await readFile(new URL(`packages/${name}/README.md`, root), "utf8");

  await writeFile(
    new URL(`${name}.md`, packageOutput),
    // JSON strings are valid YAML scalars, so titles such as `@kutur-kit/access` need no escaping.
    `---\ntitle: ${JSON.stringify(title)}\ndescription: ${JSON.stringify(description)}\n---\n${readme.replace(/^# [^\n]+\n/, "")}`,
  );
}

await writeFile(
  new URL("meta.json", packageOutput),
  JSON.stringify({ title: "Package reference", pages: pages.map(({ name }) => name) }),
);

const cards = (group: string) =>
  [
    "<Cards>",
    ...pages
      .filter((page) => page.group === group)
      .map(
        ({ name, title, description }) =>
          `  <Card title="${title}" href="/docs/packages/${name}">\n    ${description}\n  </Card>`,
      ),
    "</Cards>",
  ].join("\n");

const index = await readFile(new URL("index.mdx", content), "utf8");

await writeFile(
  new URL("index.mdx", generated),
  index
    .replace("<!-- packages:libraries -->", cards("libraries"))
    .replace("<!-- packages:tools -->", cards("tools")),
);

const guideOutput = new URL("guides/", generated);

await mkdir(guideOutput, { recursive: true });

for (const [slug, demo, invocation] of [
  [
    "permissions",
    "permission",
    'permissionDemo({ userId: "ada", mode: "require", restricted: false })',
  ],
  ["storage", "storage", 'storageDemo("Hello from Kit")'],
]) {
  const template = await readFile(new URL(`guides/${slug}.mdx`, content), "utf8");
  const code = await readFile(new URL(`${demo}.ts`, demos), "utf8");

  const snippet =
    "\n```ts\n" + code + "\nEffect.runPromise(" + invocation + ").then(console.log);\n```\n";

  await writeFile(
    new URL(`${slug}.mdx`, guideOutput),
    template.replace(`<!-- demo:${demo} -->`, snippet),
  );
}

await writeFile(
  new URL("meta.json", guideOutput),
  JSON.stringify({ title: "Hands-on guides", pages: ["permissions", "storage"] }),
);
