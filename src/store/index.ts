import { create } from "zustand";
import type { AppState } from "./types";
import { createScanSlice } from "./slices/scan";
import { createSelectionSlice } from "./slices/selection";
import { createBatchSlice } from "./slices/batch";
import { getSubdirs, renameFolder } from "@utils/fs";

export type { AppState, TreeItem, StatusMessage } from "./types";
export { getFoldersToProcess } from "./slices/selection";

export const useStore = create<AppState>()((set, get, api) => ({
  ...createScanSlice(set, get, api),
  ...createSelectionSlice(set, get, api),
  ...createBatchSlice(set, get, api),

  changeDirMode: false,
  showHelp: false,
  subdirs: [],
  promptKey: 0,

  renameMode: false,
  renameTarget: null,
  renameKey: 0,

  toggleHelp: () => {
    set({ showHelp: !get().showHelp });
  },

  openChangeDir: () => {
    const dir = get().baseDir;
    getSubdirs(dir).then((dirs) => set({ subdirs: dirs }));
    set({ changeDirMode: true, promptKey: get().promptKey + 1 });
  },

  changeDir: async (path: string) => {
    const newDir = path.trim();
    if (!newDir) {
      set({ changeDirMode: false });
      return;
    }
    set({ baseDir: newDir, changeDirMode: false });
    try {
      await get().loadFolders(newDir);
    } catch {
      set({ status: { type: "error", message: "Failed to load folders" } });
    }
  },

  cancelChangeDir: () => {
    set({ changeDirMode: false });
  },

  refresh: async () => {
    const { baseDir } = get();
    if (!baseDir) {return;}
    try {
      await get().loadFolders(baseDir);
    } catch {
      set({ status: { type: "error", message: "Failed to refresh folders" } });
    }
  },

  openRename: () => {
    const { items, focusIndex } = get();
    const item = items[focusIndex];
    if (!item || item.isZip) {return;}
    set({ renameMode: true, renameTarget: item.entry?.path || null, renameKey: get().renameKey + 1 });
  },

  renameSubmit: async (newName: string) => {
    const { renameTarget, baseDir } = get();
    if (!renameTarget || !newName.trim()) {
      set({ renameMode: false, renameTarget: null });
      return;
    }
    try {
      const result = await renameFolder(renameTarget, newName.trim());
      if (!result.success) {
        console.error("renameFolder failed:", result.message);
        set({
          renameMode: false,
          renameTarget: null,
          status: { type: "error", message: `Rename failed: ${result.message}` },
        });
        return;
      }
      set({
        renameMode: false,
        renameTarget: null,
        status: { type: "info", message: `Renamed to: ${newName.trim()}` },
      });
      if (baseDir) {
        try {
          await get().loadFolders(baseDir);
        } catch {
          /* loadFolders error already sets status */
        }
      }
    } catch (err) {
      console.error("renameSubmit unexpected error:", err);
      set({
        renameMode: false,
        renameTarget: null,
        status: { type: "error", message: `Rename error: ${(err as Error).message}` },
      });
    }
  },

  cancelRename: () => {
    set({ renameMode: false, renameTarget: null });
  },
}));
