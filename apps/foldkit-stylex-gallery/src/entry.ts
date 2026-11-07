import { Runtime } from "foldkit";

import { Model, init, update, view } from "./main.ts";

import "./styles.css";

Runtime.hydrate(
  Runtime.makeApplication({
    Model,
    init,
    update,
    view,
    container: document.getElementById("root"),
  }),
);
