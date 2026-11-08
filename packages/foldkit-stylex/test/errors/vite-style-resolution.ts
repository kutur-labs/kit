// expect: Object literal may only specify known properties, and 'styleResolution' does not exist in type
import { foldkitStylex } from "../../src/vite.ts";

export const plugins = foldkitStylex({ styleResolution: "application-order" });
