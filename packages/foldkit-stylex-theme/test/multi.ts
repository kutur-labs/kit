// Checked by `typecheck`: @foldkit/ui exports Multi as a namespace, which `export *` cannot spread,
// so the theme re-exports its members by name. A member it misses is named here.
import type { Combobox as UiCombobox, Listbox as UiListbox } from "@foldkit/ui";
import type { Combobox } from "@kutur-kit/foldkit-stylex-theme/combobox";
import type { Listbox } from "@kutur-kit/foldkit-stylex-theme/listbox";

type Missing<Ui, Themed> = Exclude<keyof Ui, keyof Themed>;

type ListboxMissing = Missing<typeof UiListbox.Multi, typeof Listbox.Multi>;

export const listboxMultiIsWhole: [ListboxMissing] extends [never] ? true : ListboxMissing = true;

type ComboboxMissing = Missing<typeof UiCombobox.Multi, typeof Combobox.Multi>;

export const comboboxMultiIsWhole: [ComboboxMissing] extends [never] ? true : ComboboxMissing =
  true;
