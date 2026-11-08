// expect: "This part has one class in every state, so pass its styles, not a function of state."
import { VirtualList } from "@foldkit/ui";
import { VirtualListStyle } from "@kutur-kit/foldkit-stylex";

import { s } from "./_styles.ts";

export const x = VirtualListStyle.view(VirtualList.view<string>(), { container: () => s.base });
