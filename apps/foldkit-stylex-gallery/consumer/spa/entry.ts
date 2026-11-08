// create-foldkit-app's single-page shape: index.html links the stylesheet.
import { Runtime } from "foldkit";

import { Model, init, update, view } from "../src/app-core.ts";

Runtime.run(
  Runtime.makeApplication({
    Model,
    init,
    update,
    view,
    container: document.getElementById("root"),
  }),
);
