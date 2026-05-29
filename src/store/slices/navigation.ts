import type { StateCreator } from "zustand";
import type { AppState } from "@store/types";
import { getSubdirsWithMetadata } from "@utils/fs";

export const createNavigationSlice: StateCreator<
  AppState,
  [],
  [],
  Pick<
    AppState,
    | "changeDirMode"
    | "showHelp"
    | "showConfig"
    | "browseDir"
    | "browseCursor"
    | "browseItems"
    | "toggleHelp"
    | "toggleConfig"
    | "toggleChangeDir"
    | "changeDir"
    | "cancelChangeDir"
    | "browseSetDir"
    | "browseConfirm"
    | "refresh"
  >
> = (set, get, _store) => ({
  changeDirMode: false,
  showHelp: false,
  showConfig: false,

  browseDir: "",
  browseCursor: 0,
  browseItems: [],

  toggleHelp: () => {
    set({ showHelp: !get().showHelp });
  },

  toggleConfig: () => {
    set({ showConfig: !get().showConfig });
  },

  toggleChangeDir: () => {
    const { changeDirMode } = get();
    if (changeDirMode) {
      set({ changeDirMode: false, browseDir: "", browseCursor: 0, browseItems: [] });
    } else {
      const { baseDir } = get();
      const dir = baseDir || "";
      set({ changeDirMode: true, browseDir: dir, browseCursor: 0 });
      get().browseSetDir(dir);
    }
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
});
