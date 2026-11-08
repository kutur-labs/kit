// expect: Property 'maybeFocusSelector' is missing
import { Dialog } from "@foldkit/ui";
import { PopoverStyle } from "@kutur-kit/foldkit-stylex";

export const x = PopoverStyle.view(Dialog.view);
