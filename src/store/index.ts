import { create } from "zustand";
import type { AppState } from "./types";
import { createScanSlice } from "./slices/scan";
import { createSelectionSlice } from "./slices/selection";
import { createBatchSlice } from "./slices/batch";
import { renameFolder } from "@utils/fs";

export type { AppState, TreeItem, StatusMessage } from "./types";
export { getFoldersToProcess } from "./slices/selection";

export const useStore = create<AppState>()((set, get, api) => ({
  ...createScanSlice(set, get, api),
  ...createSelectionSlice(set, get, api),
  ...createBatchSlice(set, get, api),

  changeDirMode: false,
  showHelp: false,

  renameMode: false,
  renameTarget: null,

  toggleHelp: () => {
    set({ showHelp: !get().showHelp });
  },

  openChangeDir: () => {
    set({ changeDirMode: true });
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
    set({ renameMode: true, renameTarget: item.entry?.path || null });
  },

  renameSubmit: async (newName: string) => {
    const { renameTarget, baseDir } = get();
    if (!renameTarget || !newName.trim()) {
      set({ renameMode: false, renameTarget: null });
      return;
    }
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
      await get().loadFolders(baseDir);
    }
  },

  cancelRename: () => {
    set({ renameMode: false, renameTarget: null });
  },
}));
