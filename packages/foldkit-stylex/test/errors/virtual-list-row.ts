// expect: "VirtualList's rows take no class: style the element itemToView returns, which fills its row."
import { VirtualList } from "@foldkit/ui";
import { VirtualListStyle } from "@kutur-kit/foldkit-stylex";
import * as stylex from "@stylexjs/stylex";

const styles = stylex.create({ row: { paddingInline: 12 } });

export const x = VirtualListStyle.view(VirtualList.view<string>(), { row: styles.row });
