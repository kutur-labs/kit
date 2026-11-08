// The themed client entry without its stylesheet: the build must fail and say why.
import { Runtime } from "foldkit";

import { Model, init, update, view } from "./app-themed.ts";

Runtime.hydrate(
  Runtime.makeApplication({
    Model,
    init,
    update,
    view,
    container: document.getElementById("root"),
  }),
);
