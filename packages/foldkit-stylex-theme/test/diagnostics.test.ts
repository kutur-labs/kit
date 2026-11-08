import path from "node:path";

import { describeDiagnostics } from "@kutur-kit/diagnostics/vitest";

describeDiagnostics(path.join(import.meta.dirname, ".."));
