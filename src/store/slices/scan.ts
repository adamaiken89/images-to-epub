import type { StateCreator } from "zustand";
import {
  findDefaultBaseDir,
  findFoldersWithImages,
  findZipFiles,
  organizeFoldersByHierarchy,
} from "../../utils/fs";
import type { AppState, TreeItem } from "../types";
import { text } from "../../utils/text";

function getInitialDir(): string | null {
  const arg = process.argv[2];
  return arg ?? null;
}

export const createScanSlice: StateCreator<AppState, [], [], Pick<AppState, "baseDir" | "folderCount" | "zipCount" | "loadFolders" | "init">> = (set, get) => ({
  baseDir: "",
  folderCount: 0,
  zipCount: 0,

  loadFolders: async (dir: string) => {
    set({ status: { type: "progress", message: text.scan.scanning } });
    const { allFolders } = await findFoldersWithImages(dir);
    const hierarchy = organizeFoldersByHierarchy(allFolders, dir);
    const zips = await findZipFiles(dir);

    const newItems: TreeItem[] = [];

    const sortedEntries = Array.from(hierarchy.entries()).sort((a, b) =>
      a[1].parts.join("/").localeCompare(b[1].parts.join("/"))
    );

    for (const [, entry] of sortedEntries) {
      newItems.push({
        id: `folder:${entry.path}`,
        label: entry.parts[entry.parts.length - 1],
        depth: Math.max(0, entry.parts.length - 1),
        isZip: false,
        entry,
        checked: false,
      });
    }

    for (const zipPath of zips) {
      const rel = zipPath.slice(dir.length + 1);
      const parts = rel.split(/[/\\]/);
      newItems.push({
        id: `zip:${zipPath}`,
        label: text.tree.zipPrefix + parts[parts.length - 1],
        depth: Math.max(0, parts.length - 1),
        isZip: true,
        entry: null,
        checked: false,
      });
    }

    newItems.sort((a, b) => {
      if (a.depth !== b.depth) return a.depth - b.depth;
      return a.label.localeCompare(b.label);
    });

    const folderCount = sortedEntries.length;
    const zipCount = zips.length;

    set({
      items: newItems,
      selectedIds: new Set(),
      focusIndex: 0,
      folderCount,
      zipCount,
      status:
        folderCount === 0 && zipCount === 0
          ? { type: "info", message: text.scan.noResults }
          : { type: "info", message: text.selection.zeroItems },
    });
  },

  init: async () => {
    const cliDir = getInitialDir();
    const defaultDir = cliDir || (await findDefaultBaseDir());
    set({ baseDir: defaultDir });
    await get().loadFolders(defaultDir);
  },
});
