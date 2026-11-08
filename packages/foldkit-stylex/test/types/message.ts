import { Dialog, Listbox, Popover, Slider, Tabs } from "@foldkit/ui";
import { Schema } from "effect";
import { defineMessageUnion } from "foldkit/message";

import { Toast } from "./toast-module.ts";

export const Message = defineMessageUnion({
  ToggledTerms: { isChecked: Schema.Boolean },
  GotInfoMessage: { message: Popover.Message },
  GotLanguageMessage: { message: Listbox.Message },
  GotConfirmMessage: { message: Dialog.Message },
  GotSectionsMessage: { message: Tabs.Message },
  GotVolumeMessage: { message: Slider.Message },
  GotToastMessage: { message: Toast.Message },
});

export type Message = typeof Message.Type;
