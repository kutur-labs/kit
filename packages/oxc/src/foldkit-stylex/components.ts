/**
 * The @foldkit/ui namespaces that @kutur-kit/foldkit-stylex wraps, as `<Name>Style` namespaces.
 * `foldkit-stylex-unstyled-view` asks for a wrapper only for these. A test compares the list with
 * the core's `src/index.ts`, so add a name in the change that adds its namespace to the core.
 */
export const components: ReadonlySet<string> = new Set([
  "Animation",
  "Button",
  "Calendar",
  "Checkbox",
  "Combobox",
  "DatePicker",
  "Dialog",
  "Disclosure",
  "DragAndDrop",
  "Fieldset",
  "FileDrop",
  "HoverIntent",
  "Input",
  "Listbox",
  "Menu",
  "Meter",
  "Nav",
  "Popover",
  "Progress",
  "RadioGroup",
  "Select",
  "Slider",
  "Switch",
  "Tabs",
  "Textarea",
  "Toast",
  "Tooltip",
  "VirtualList",
]);

/**
 * The view each `<Name>Style` namespace wraps under the same name. DragAndDrop has no `view`: its
 * styled part is the bundle `draggable` returns.
 */
export const viewOf = (component: string) => (component === "DragAndDrop" ? "draggable" : "view");
