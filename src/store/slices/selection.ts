import { ID_PREFIXES } from "@store/constants";
import type { AppState, TreeItem } from "@store/types";
import { getSubfoldersWithImages } from "@utils/fs";
import { t } from "@utils/i18n";
import type { StateCreator } from "zustand";

export function getFoldersToProcess(selectedSet: Set<string>, items: TreeItem[]): string[] {
  const allFolderPaths = items
    .filter((i) => i.id.startsWith(ID_PREFIXES.folder))
    .map((i) => i.id.slice(ID_PREFIXES.folder.length));

  const imageFolders = allFolderPaths.filter((p) => {
    const entry = items.find((i) => i.id === `${ID_PREFIXES.folder}${p}`);
    return entry?.entry?.metadata.hasImages;
  });

  const results = Array.from(selectedSet).flatMap((id) => {
    if (!id.startsWith(ID_PREFIXES.folder)) {
      return [];
    }
    const path = id.slice(ID_PREFIXES.folder.length);
    const item = items.find((i) => i.id === id);
    if (!item?.entry) {
      return [];
    }
    if (item.entry.metadata.hasImages) {
      return item.excluded ? [] : [path];
    }
    const subs = getSubfoldersWithImages(path, imageFolders);
    return subs.filter((sub) => {
      const subItem = items.find((i) => i.id === `${ID_PREFIXES.folder}${sub}`);
      return !subItem?.excluded;
    });
  });

  return [...new Set(results)];
}

function collectDescendantIds(items: TreeItem[], parentIndex: number): string[] {
  const parentDepth = items[parentIndex].depth;
  const ids: string[] = [];
  for (let i = parentIndex + 1; i < items.length; i++) {
    if (items[i].depth <= parentDepth) {
      break;
    }
    ids.push(items[i].id);
  }
  return ids;
}

function hasCheckedAncestor(items: TreeItem[], targetId: string, targetDepth: number): boolean {
  let checked = false;
  let checkDepth = -1;
  for (const it of items) {
    if (it.id === targetId) {
      break;
    }
    if (it.depth <= checkDepth) {
      checked = false;
      checkDepth = -1;
    }
    if (it.depth < targetDepth && it.checked) {
      checked = true;
      checkDepth = it.depth;
    }
  }
  return checked;
}

export const createSelectionSlice: StateCreator<
  AppState,
  [],
  [],
  Pick<
    AppState,
    "items" | "selectedIds" | "focusIndex" | "toggleItem" | "selectAll" | "deselectAll"
  >
> = (set, get, _store) => ({
  items: [],
  selectedIds: new Set(),
  focusIndex: 0,

  toggleItem: (index: number) => {
    const { items, selectedIds } = get();
    if (index < 0 || index >= items.length) {
      return;
    }
    const item = items[index];

    const branch = item.checked ? "checked" : item.excluded ? "excluded" : "default";

    const dispatch: Record<string, () => { newSelected: Set<string>; newItems: TreeItem[] }> = {
      checked: () => {
        const descendantIds = collectDescendantIds(items, index);
        const newSelected = new Set(selectedIds);
        newSelected.delete(item.id);
        descendantIds.forEach((id) => newSelected.delete(id));
        const descendantSet = new Set(descendantIds);

        return {
          newSelected,
          newItems: items.map((it, i) => {
            if (i === index) {
              return { ...it, checked: false, excluded: false };
            }
            if (descendantSet.has(it.id)) {
              return { ...it, excluded: false };
            }
            return it;
          }),
        };
      },
      excluded: () => {
        const newSelected = new Set(selectedIds);
        newSelected.delete(item.id);
        return {
          newSelected,
          newItems: items.map((it, i) => (i === index ? { ...it, excluded: false } : it)),
        };
      },
      default: () => {
        const ancestorChecked = hasCheckedAncestor(items, item.id, item.depth);
        const newSelected = new Set(selectedIds);
        newSelected.add(item.id);

        return {
          newSelected,
          newItems: items.map((it, i) =>
            i === index ? { ...it, [ancestorChecked ? "excluded" : "checked"]: true } : it,
          ),
        };
      },
    };

    const result = dispatch[branch]();
    set({
      selectedIds: result.newSelected,
      items: result.newItems,
      status: { type: "info", message: t("selection.item", { count: result.newSelected.size }) },
    });
  },

  selectAll: () => {
    const { items, selectedIds } = get();
    if (selectedIds.size === items.length && items.length > 0) {
      set({
        selectedIds: new Set(),
        items: items.map((it) => ({ ...it, checked: false, excluded: false })),
        status: { type: "info", message: t("selection.item", { count: 0 }) },
      });
    } else {
      const allIds = new Set(items.map((i) => i.id));
      set({
        selectedIds: allIds,
        items: items.map((it) => ({ ...it, checked: true, excluded: false })),
        status: { type: "info", message: t("selection.item", { count: allIds.size }) },
      });
    }
  },

  deselectAll: () => {
    set({
      selectedIds: new Set(),
      items: get().items.map((it) => ({ ...it, checked: false, excluded: false })),
      status: { type: "info" as const, message: t("selection.item", { count: 0 }) },
    });
  },
});
