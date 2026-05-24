import type { StateCreator } from "zustand";
import { getSubfoldersWithImages } from "../../utils/fs";
import type { AppState, TreeItem } from "../types";
import { t } from "../../utils/i18n";

export function getFoldersToProcess(
  selectedSet: Set<string>,
  items: TreeItem[]
): string[] {
  const result: string[] = [];
  for (const id of selectedSet) {
    if (id.startsWith("folder:")) {
      const path = id.slice(7);
      const item = items.find((i) => i.id === id);
      if (item?.entry?.metadata.hasImages) {
        result.push(path);
      } else if (item?.entry) {
        const allFolderPaths = items
          .filter((i) => i.id.startsWith("folder:"))
          .map((i) => i.id.slice(7));
        const imageFolders = allFolderPaths.filter((p) => {
          const entry = items.find((i) => i.id === `folder:${p}`);
          return entry?.entry?.metadata.hasImages;
        });
        const subs = getSubfoldersWithImages(path, imageFolders);
        result.push(...subs);
      }
    }
  }
  return [...new Set(result)];
}

export const createSelectionSlice: StateCreator<
  AppState,
  [],
  [],
  Pick<AppState, "items" | "selectedIds" | "focusIndex" | "toggleItem" | "selectAll" | "deselectAll">
> = (set, get) => ({
  items: [],
  selectedIds: new Set(),
  focusIndex: 0,

  toggleItem: (index: number) => {
    const { items, selectedIds } = get();
    if (index < 0 || index >= items.length) return;
    const item = items[index];

    const newSelected = new Set(selectedIds);
    if (newSelected.has(item.id)) {
      newSelected.delete(item.id);
    } else {
      newSelected.add(item.id);
    }

    set({
      selectedIds: newSelected,
      items: items.map((it, i) => {
        if (i === index) return { ...it, checked: !it.checked };
        return it;
      }),
      status: { type: "info", message: `${newSelected.size} ${t("selection.itemsSelected")}` },
    });
  },

  selectAll: () => {
    const { items } = get();
    const allIds = new Set(items.map((i) => i.id));
    set({
      selectedIds: allIds,
      items: items.map((it) => ({ ...it, checked: true })),
      status: { type: "info", message: `${allIds.size} ${t("selection.itemsSelected")}` },
    });
  },

  deselectAll: () => {
    const { items } = get();
    set({
      selectedIds: new Set(),
      items: items.map((it) => ({ ...it, checked: false })),
      status: { type: "info", message: t("selection.zeroItems") },
    });
  },
});
