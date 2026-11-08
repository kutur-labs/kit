import type { Supported } from "./internal/supported.ts";
import type { Textarea } from "@foldkit/ui";
import type { Attribute, Html, HtmlBuilder, TextareaAttribute } from "foldkit/html";

import { appendClass, partsOf, type Layers, type PartStyle } from "./internal/part.ts";

/**
 * A textarea's state, as its config sets it; the same for each part. @foldkit/ui sets each hook on
 * the textarea.
 */
export interface State {
  /** Where @foldkit/ui sets native `disabled` and `data-disabled`; it sets no `aria-disabled`. */
  readonly isDisabled: boolean;
  /** Where @foldkit/ui sets the native `readonly` attribute and `data-readonly`. */
  readonly isReadOnly: boolean;
  /** Where @foldkit/ui sets `aria-invalid` and `data-invalid`. */
  readonly isInvalid: boolean;
}

/**
 * Styles for each part of a Textarea. Its bundle stays a `TextareaAttribute` list, so it spreads
 * into `h.textarea`.
 */
export interface Styles {
  /** The `<textarea>` element. */
  readonly textarea?: PartStyle<State>;
  /** The `<label>` that names the textarea. */
  readonly label?: PartStyle<State>;
  /** The element that describes the textarea; @foldkit/ui links it when `hasDescription` is set. */
  readonly description?: PartStyle<State>;
}

// Everything this module reads from @foldkit/ui's Textarea. `stateOf` and `view` read only
// through these types, and `Supported` checks that the installed @foldkit/ui still has them. They
// take the app's Message, so `view` reads each bundle with its own type.
type Reads<Message = never> = Readonly<{
  Config: Readonly<{
    isDisabled?: boolean;
    isReadOnly?: boolean;
    isInvalid?: boolean;
    toView: (attributes: never) => void;
  }>;
  RenderInfo: Readonly<
    Record<"label" | "description", ReadonlyArray<Attribute<Message>>> & {
      textarea: ReadonlyArray<TextareaAttribute<Message>>;
    }
  >;
}>;

type Has = Readonly<{
  Config: Textarea.ViewConfig<never>;
  RenderInfo: Textarea.TextareaAttributes<never>;
}>;

const stateOf = (config: Reads["Config"]): State => ({
  isDisabled: config.isDisabled ?? false,
  isReadOnly: config.isReadOnly ?? false,
  isInvalid: config.isInvalid ?? false,
});

/**
 * `Textarea.view` with each part's styles on the attributes `toView` gets. Pass several styles
 * objects to layer them: later ones win property by property.
 */
export const view =
  <const List extends ReadonlyArray<Styles>>(
    textareaView: Supported<"Textarea", Has, Reads, typeof Textarea.view>,
    ...layers: Layers<List, Styles, "Textarea">
  ) =>
  <Message>(config: Textarea.ViewConfig<Message>, h: HtmlBuilder<Message>): Html => {
    const part = partsOf(layers, stateOf(config));

    return textareaView(
      {
        ...config,
        toView: (attributes) => {
          const reads: Reads<Message>["RenderInfo"] = attributes;

          return config.toView({
            ...attributes,
            textarea: appendClass(
              reads.textarea,
              part((s) => s.textarea),
            ),
            label: appendClass(
              reads.label,
              part((s) => s.label),
            ),
            description: appendClass(
              reads.description,
              part((s) => s.description),
            ),
          });
        },
      },
      h,
    );
  };
