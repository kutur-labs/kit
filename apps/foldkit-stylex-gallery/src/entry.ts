import { Option } from "effect";
import { Runtime } from "foldkit";

import { programOf, screenAt } from "./main.ts";

import "./styles.css";

// The server answers only paths with a screen, so this one exists; it renders the same program.
const screen = Option.getOrThrow(screenAt(location.pathname));

Runtime.hydrate(
  Runtime.makeApplication({ ...programOf(screen), container: document.getElementById("root") }),
);
