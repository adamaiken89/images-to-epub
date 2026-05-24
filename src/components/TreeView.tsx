import { useStore } from "../store";
import { TreeItemRow } from "./TreeItemRow";
import { colors } from "../utils/colors";
import { t } from "../utils/i18n";

export function TreeView() {
  const items = useStore((s) => s.items);
  const focusIndex = useStore((s) => s.focusIndex);

  return (
    <scrollbox flexGrow={1} border padding={1}>
      {items.length === 0 ? (
        <text fg={colors.dim}>{t("tree.noFolders")}</text>
      ) : (
        items.map((item, idx) => (
          <TreeItemRow key={item.id} item={item} isFocused={idx === focusIndex} />
        ))
      )}
    </scrollbox>
  );
}
