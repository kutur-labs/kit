import { foldkitStylex } from "@kutur-kit/foldkit-stylex/vite";
import { defineConfig } from "vitest/config";

// The core's helper, so the tests compile the looks the way an app's build does.
export default defineConfig({ plugins: [foldkitStylex()] });
