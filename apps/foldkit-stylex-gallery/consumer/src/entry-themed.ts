import { Runtime } from "foldkit";

import { Model, init, update, view } from "./app-themed.ts";

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
