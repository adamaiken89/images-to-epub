import { useMemo } from "react";
import { useStore } from "@store";
import { TreeItemRow } from "./TreeItemRow";
import { colors } from "@utils/colors";
import { t } from "@utils/i18n";

export function TreeView() {
  const items = useStore((s) => s.items);
  const focusIndex = useStore((s) => s.focusIndex);
  const changeDirMode = useStore((s) => s.changeDirMode);
  const showHelp = useStore((s) => s.showHelp);
  const showConfig = useStore((s) => s.showConfig);
  const parentSelectedMap = useMemo(() => {
    return items.reduce<{
      map: Record<string, boolean>;
      ancestorChecked: boolean;
      ancestorCheckDepth: number;
    }>(
      (acc, item) => {
        const ancestorChecked =
          item.depth <= acc.ancestorCheckDepth ? false : acc.ancestorChecked;
        const ancestorCheckDepth =
          item.depth <= acc.ancestorCheckDepth ? -1 : acc.ancestorCheckDepth;
        const value =
          !item.isZip && !item.checked && !item.excluded && ancestorChecked;
        if (item.checked) {
          return {
            map: { ...acc.map, [item.id]: value },
            ancestorChecked: true,
            ancestorCheckDepth: item.depth,
          };
        }
        return {
          map: { ...acc.map, [item.id]: value },
          ancestorChecked,
          ancestorCheckDepth,
        };
      },
      { map: {}, ancestorChecked: false, ancestorCheckDepth: -1 },
    ).map;
  }, [items]);

  if (changeDirMode || showHelp || showConfig) {
    return null;
  }

  return (
    <scrollbox flexGrow={1} border padding={1}>
      {items.length === 0 ? (
        <text fg={colors.dim}>{t("tree.noFolders")}</text>
      ) : (
        items.map((item, idx) => (
          <TreeItemRow key={item.id} item={item} isFocused={idx === focusIndex} parentSelected={!!parentSelectedMap[item.id]} />
        ))
      )}
    </scrollbox>
  );
}
