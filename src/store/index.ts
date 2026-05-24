import { create } from "zustand";
import type { AppState } from "./types";
import { createScanSlice } from "./slices/scan";
import { createSelectionSlice } from "./slices/selection";
import { createBatchSlice } from "./slices/batch";
import { getSubdirs, renameFolder } from "../utils/fs";

export type { AppState, TreeItem, StatusMessage } from "./types";
export { getFoldersToProcess } from "./slices/selection";

export const useStore = create<AppState>()((...a) => ({
  ...createScanSlice(...a),
  ...createSelectionSlice(...a),
  ...createBatchSlice(...a),

  changeDirMode: false,
  showHelp: false,
  subdirs: [],
  promptKey: 0,

  renameMode: false,
  renameTarget: null,
  renameKey: 0,

  toggleHelp: () => {
    a[0]({ showHelp: !a[1]().showHelp });
  },

  openChangeDir: () => {
    const dir = a[1]().baseDir;
    getSubdirs(dir).then((dirs) => a[0]({ subdirs: dirs }));
    a[0]({ changeDirMode: true, promptKey: a[1]().promptKey + 1 });
  },

  changeDir: async (path: string) => {
    const newDir = path.trim();
    if (!newDir) {
      a[0]({ changeDirMode: false });
      return;
    }
    a[0]({ baseDir: newDir, changeDirMode: false });
    await a[1]().loadFolders(newDir);
  },

  cancelChangeDir: () => {
    a[0]({ changeDirMode: false });
  },

  refresh: async () => {
    const { baseDir } = a[1]();
    if (baseDir) {await a[1]().loadFolders(baseDir);}
  },

  openRename: () => {
    const { items, focusIndex } = a[1]();
    const item = items[focusIndex];
    if (!item || item.isZip) {return;}
    a[0]({ renameMode: true, renameTarget: item.entry?.path || null, renameKey: a[1]().renameKey + 1 });
  },

  renameSubmit: async (newName: string) => {
    const { renameTarget, baseDir } = a[1]();
    if (!renameTarget || !newName.trim()) {
      a[0]({ renameMode: false, renameTarget: null });
      return;
    }
    try {
      const result = await renameFolder(renameTarget, newName.trim());
      if (!result.success) {
        console.error("renameFolder failed:", result.message);
        a[0]({
          renameMode: false,
          renameTarget: null,
          status: { type: "error", message: `Rename failed: ${result.message}` },
        });
        return;
      }
      a[0]({
        renameMode: false,
        renameTarget: null,
        status: { type: "info", message: `Renamed to: ${newName.trim()}` },
      });
      if (baseDir) {
        await a[1]().loadFolders(baseDir);
      }
    } catch (err) {
      console.error("renameSubmit unexpected error:", err);
      a[0]({
        renameMode: false,
        renameTarget: null,
        status: { type: "error", message: `Rename error: ${(err as Error).message}` },
      });
    }
  },

  cancelRename: () => {
    a[0]({ renameMode: false, renameTarget: null });
  },
}));
