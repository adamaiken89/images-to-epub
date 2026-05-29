import { create } from "zustand";
import type { AppState } from "./types";
import { createScanSlice } from "./slices/scan";
import { createSelectionSlice } from "./slices/selection";
import { createBatchSlice } from "./slices/batch";
import { renameFolder, batchSetAuthorWithProgress, getSubdirsWithMetadata } from "@utils/fs";
import { getFoldersToProcess } from "./slices/selection";

export type { AppState, TreeItem, StatusMessage } from "./types";
export { getFoldersToProcess };

export const useStore = create<AppState>()((set, get, api) => ({
  ...createScanSlice(set, get, api),
  ...createSelectionSlice(set, get, api),
  ...createBatchSlice(set, get, api),

  changeDirMode: false,
  showHelp: false,

  browseDir: "",
  browseCursor: 0,
  browseItems: [],

  renameMode: false,
  renameTarget: null,

  outputFormat: "epub",

  setOutputFormat: (fmt: "epub" | "kepub" | "both") => {
    set({ outputFormat: fmt });
  },

  authorMode: false,

  toggleHelp: () => {
    set({ showHelp: !get().showHelp });
  },

  openChangeDir: () => {
    const { baseDir } = get();
    const dir = baseDir || "";
    set({ changeDirMode: true, browseDir: dir, browseCursor: 0 });
    get().browseSetDir(dir);
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
    set({ changeDirMode: false, browseDir: "", browseCursor: 0, browseItems: [] });
  },

  browseSetDir: async (dir: string) => {
    set({ browseDir: dir, browseCursor: 0 });
    try {
      const items = await getSubdirsWithMetadata(dir);
      set({ browseItems: items });
    } catch {
      set({ browseItems: [] });
    }
  },

  browseConfirm: async () => {
    const { browseDir } = get();
    if (!browseDir) {return;}
    set({ changeDirMode: false, browseDir: "", browseCursor: 0, browseItems: [] });
    set({ baseDir: browseDir });
    try {
      await get().loadFolders(browseDir);
    } catch {
      set({ status: { type: "error", message: "Failed to load folders" } });
    }
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

  openAuthorMode: () => {
    set({ authorMode: true });
  },

  submitAuthorName: async (name: string) => {
    const { baseDir, selectedIds, items } = get();
    const trimmed = name.trim();
    if (!trimmed) {
      set({ authorMode: false });
      return;
    }

    const folders = getFoldersToProcess(selectedIds, items);
    if (folders.length === 0) {
      set({ authorMode: false, status: { type: "info", message: "No folders selected" } });
      return;
    }

    set({ authorMode: false, isProcessing: true });
    const { successCount, failCount, failures } = await batchSetAuthorWithProgress(
      folders,
      trimmed,
      (current, total, name) => {
        set({ status: { type: "progress", message: `${current}/${total}: ${name}...` } });
      },
    );
    const suffix = failures.length > 0 ? " | " + failures.join("; ") : "";
    set({
      status: {
        type: "done",
        message: `Author set on ${successCount} folder(s), Failed: ${failCount}${suffix}`,
      },
      isProcessing: false,
    });
    if (baseDir) {
      await get().loadFolders(baseDir);
    }
  },

  cancelAuthorMode: () => {
    set({ authorMode: false });
  },
}));
