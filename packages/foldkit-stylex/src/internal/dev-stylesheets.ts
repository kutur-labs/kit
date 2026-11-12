import type { DevEnvironment, HtmlTagDescriptor, Plugin, TransformResult } from "vite";

import * as Schema from "effect/Schema";
import { isCSSRequest, parseSync } from "vite";

/**
 * Links each stylesheet that the document's module scripts reach through static imports into the
 * head of a dev document, in the order the browser evaluates them. Vite's dev server adds a
 * script's stylesheets only once the script runs, and Foldkit's renders server documents with
 * none, so a page first paints without them. The `pre` hook puts the links before StyleX's, so
 * StyleX's rules come after the app's stylesheets, as they do in a build. It also runs before Vite
 * adds `base` to the document's URLs, so the scripts it reads and the links it writes have none.
 * Vite's client adopts a link whose `data-vite-dev-id` names the module instead of adding its rules
 * again. The walk stops at a module that does not transform, such as a script in `public/` or one
 * with an error, which the browser then loads and reports as it would without the links.
 * Stylesheets behind a virtual module are not linked.
 */
export const devStylesheets: Plugin = {
  name: "@kutur-kit/foldkit-stylex:dev-stylesheets",
  apply: "serve",
  transformIndexHtml: {
    order: "pre",
    handler: (html, { server }) =>
      server === undefined
        ? []
        : stylesheetLinks(server.environments.client, server.config.base, appScripts(html)),
  },
};

// The `src` of each module script in the document. Foldkit writes its client entry as one.
const MODULE_SCRIPT = /<script\b(?=[^>]*\btype=["']?module\b)[^>]*\bsrc=["']([^"']+)["']/g;

// `?inline`, `?raw` and `?url` import a stylesheet as a value, not as styles.
const STYLESHEET_VALUE_QUERY = /[?&](?:inline|raw|url)\b/;

// Vite's client, which modules that accept updates import, imports no stylesheet. Its module's URL,
// unlike the one it is imported by, fails to transform once the dependency optimizer has run.
const isViteClient = (url: string) => url.startsWith("/@vite/");

// Scripts from another origin, or relative ones, which Foldkit does not write, are not walked.
const appScripts = (html: string) =>
  Array.from(html.matchAll(MODULE_SCRIPT)).flatMap(([, src]) =>
    src?.startsWith("/") && !src.startsWith("//") && !isViteClient(src) ? [src] : [],
  );

const isOutdatedDependency = Schema.is(
  Schema.Struct({ code: Schema.Literal("ERR_OUTDATED_OPTIMIZED_DEP") }),
);

// Vite returns the same transform result until it invalidates the module, so each result is
// parsed once instead of on every document.
const staticImportsByTransform = new WeakMap<TransformResult, ReadonlyArray<string>>();

const staticImports = (url: string, transformed: TransformResult): ReadonlyArray<string> => {
  const cached = staticImportsByTransform.get(transformed);

  if (cached !== undefined) return cached;

  const specifiers = parseSync(url, transformed.code, { lang: "js" }).program.body.flatMap(
    (statement) =>
      (statement.type === "ImportDeclaration" ||
        statement.type === "ExportNamedDeclaration" ||
        statement.type === "ExportAllDeclaration") &&
      statement.source !== null
        ? [statement.source.value]
        : [],
  );

  staticImportsByTransform.set(transformed, specifiers);

  return specifiers;
};

// The dependency optimizer can finish while the walk runs, which outdates the pre-bundle URLs the
// walk has already read. Walking again transforms the modules with the new URLs; without it, a
// cold dependency cache can answer the first request with an error page.
const stylesheetLinks = async (
  client: DevEnvironment,
  base: string,
  scripts: ReadonlyArray<string>,
): Promise<Array<HtmlTagDescriptor>> => {
  try {
    return await walk(client, base, scripts);
  } catch (error) {
    if (!isOutdatedDependency(error)) throw error;

    return walk(client, base, scripts);
  }
};

const walk = async (
  client: DevEnvironment,
  base: string,
  scripts: ReadonlyArray<string>,
): Promise<Array<HtmlTagDescriptor>> => {
  const visited = new Set<string>();
  const links: Array<HtmlTagDescriptor> = [];

  const visit = async (url: string): Promise<void> => {
    visited.add(url);

    const transformed = await client.transformRequest(url).catch((error) => {
      if (isOutdatedDependency(error)) throw error;

      return null;
    });

    if (transformed === null) return;

    for (const specifier of staticImports(url, transformed)) {
      // Transformed code imports URLs under `base`; the module graph knows them without it.
      const unbased = specifier.startsWith(base) ? `/${specifier.slice(base.length)}` : specifier;

      if (isViteClient(unbased)) continue;

      const imported = await client.moduleGraph.getModuleByUrl(unbased);

      if (imported === undefined || visited.has(imported.url)) continue;

      if (!isCSSRequest(imported.url)) {
        await visit(imported.url);
      } else if (imported.id !== null && !STYLESHEET_VALUE_QUERY.test(imported.url)) {
        visited.add(imported.url);
        links.push({
          tag: "link",
          attrs: {
            rel: "stylesheet",
            href: imported.url,
            "data-vite-dev-id": imported.id,
          },
          injectTo: "head",
        });
      }
    }
  };

  for (const script of scripts) {
    if (!visited.has(script)) await visit(script);
  }

  return links;
};
