import type { StateCreator } from "zustand";
import {
  findDefaultBaseDir,
  findFoldersWithImages,
  findZipFiles,
  organizeFoldersByHierarchy,
} from "../../utils/fs";
import type { AppState, TreeItem } from "../types";

function getInitialDir(): string | null {
  const arg = process.argv[2];
  return arg ?? null;
}

export const createScanSlice: StateCreator<AppState, [], [], Pick<AppState, "baseDir" | "folderCount" | "zipCount" | "loadFolders" | "init">> = (set, get) => ({
  baseDir: "",
  folderCount: 0,
  zipCount: 0,

  loadFolders: async (dir: string) => {
    set({ status: { type: "progress", message: "Scanning folders..." } });
    const { allFolders } = await findFoldersWithImages(dir);
    const hierarchy = organizeFoldersByHierarchy(allFolders, dir);
    const zips = await findZipFiles(dir);

    const newItems: TreeItem[] = [];
    const hasEntries = hierarchy.size > 0 || zips.length > 0;

    if (hasEntries) {
      newItems.push({
        id: "select-all",
        label: "Select All",
        depth: 0,
        isZip: false,
        isSelectAll: true,
        entry: null,
        checked: false,
      });
    }

    const sortedEntries = Array.from(hierarchy.entries()).sort((a, b) =>
      a[1].parts.join("/").localeCompare(b[1].parts.join("/"))
    );

    for (const [, entry] of sortedEntries) {
      newItems.push({
        id: `folder:${entry.path}`,
        label: entry.parts[entry.parts.length - 1],
        depth: Math.max(0, entry.parts.length - 1),
        isZip: false,
        isSelectAll: false,
        entry,
        checked: false,
      });
    }

    for (const zipPath of zips) {
      const rel = zipPath.slice(dir.length + 1);
      const parts = rel.split(/[/\\]/);
      newItems.push({
        id: `zip:${zipPath}`,
        label: "\u{1F4E6} " + parts[parts.length - 1],
        depth: Math.max(0, parts.length - 1),
        isZip: true,
        isSelectAll: false,
        entry: null,
        checked: false,
      });
    }

    const tail = newItems.slice(1).sort((a, b) => {
      if (a.depth !== b.depth) return a.depth - b.depth;
      return a.label.localeCompare(b.label);
    });
    const finalItems = hasEntries ? [newItems[0], ...tail] : [];

    const folderCount = sortedEntries.length;
    const zipCount = zips.length;

    set({
      items: finalItems,
      selectedIds: new Set(),
      focusIndex: 0,
      folderCount,
      zipCount,
      status:
        folderCount === 0 && zipCount === 0
          ? { type: "info", message: "No folders with images or zips found." }
          : { type: "", message: "" },
    });
  },

  init: async () => {
    const cliDir = getInitialDir();
    const defaultDir = cliDir || (await findDefaultBaseDir());
    set({ baseDir: defaultDir });
    await get().loadFolders(defaultDir);
  },
});
