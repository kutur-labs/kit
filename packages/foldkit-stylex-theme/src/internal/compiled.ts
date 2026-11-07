import * as stylex from "@stylexjs/stylex";

// Imported first by tokens.stylex.ts, which every look imports, so it runs before any style of
// this package is defined. `sideEffects` in package.json keeps bundlers from dropping it.
try {
  const probe = stylex.create({ compiled: { boxSizing: "border-box" } });
  stylex.props(probe.compiled);
} catch {
  throw new Error(
    'StyleX did not compile @kutur-kit/foldkit-stylex-theme in this Vite or Vitest run. Add foldkitStylex() from "@kutur-kit/foldkit-stylex/vite" to the plugins of the config that ran it, vitest.config.ts included, in place of any other StyleX plugin.',
  );
}
