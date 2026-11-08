// expect: "@foldkit/ui sets padding inline on this part. The list scrolls and measures this element; style its size, border and background, and space rows inside itemToView."
import { VirtualList } from "@foldkit/ui";
import { VirtualListStyle } from "@kutur-kit/foldkit-stylex";
import * as stylex from "@stylexjs/stylex";

const styles = stylex.create({ padded: { padding: 8 } });

export const x = VirtualListStyle.view(VirtualList.view<string>(), { container: styles.padded });
