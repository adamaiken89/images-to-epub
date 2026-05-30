import type { AppState } from "@store/types";
import { getSubdirsWithMetadata } from "@utils/fs";
import type { StateCreator } from "zustand";

export const createNavigationSlice: StateCreator<
  AppState,
  [],
  [],
  Pick<
    AppState,
    | "changeDirMode"
    | "showHelp"
    | "showConfig"
    | "browser"
    | "browserSetDir"
    | "browserConfirm"
    | "toggleHelp"
    | "toggleConfig"
    | "toggleChangeDir"
    | "changeDir"
    | "cancelChangeDir"
    | "refresh"
  >
> = (set, get, _store) => ({
  changeDirMode: false,
  showHelp: false,
  showConfig: false,

  browser: {
    dir: "",
    cursor: 0,
    items: [],
  },

  browserSetDir: async (dir: string) => {
    set((state) => ({ browser: { ...state.browser, dir, cursor: 0 } }));
    try {
      const items = await getSubdirsWithMetadata(dir);
      set((state) => ({ browser: { ...state.browser, items } }));
    } catch {
      set((state) => ({ browser: { ...state.browser, items: [] } }));
    }
  },

  browserConfirm: async () => {
    const { browser } = get();
    if (!browser.dir) {
      return;
    }
    set({ changeDirMode: false, browser: { dir: "", cursor: 0, items: [] } });
    set({ baseDir: browser.dir });
    try {
      await get().loadFolders(browser.dir);
    } catch {
      set({ status: { type: "error", message: "Failed to load folders" } });
    }
  },

  toggleHelp: () => {
    set({ showHelp: !get().showHelp });
  },

  toggleConfig: () => {
    set({ showConfig: !get().showConfig });
  },

  toggleChangeDir: () => {
    const { changeDirMode } = get();
    if (changeDirMode) {
      const { browser } = get();
      set({ changeDirMode: false, browser: { ...browser, dir: "", cursor: 0, items: [] } });
    } else {
      const { baseDir } = get();
      const dir = baseDir || "";
      set({ changeDirMode: true, browser: { ...get().browser, dir, cursor: 0 } });
      get().browserSetDir(dir);
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
    const { browser } = get();
    set({ changeDirMode: false, browser: { ...browser, dir: "", cursor: 0, items: [] } });
  },

  refresh: async () => {
    const { baseDir } = get();
    if (!baseDir) {
      return;
    }
    try {
      await get().loadFolders(baseDir);
    } catch {
      set({ status: { type: "error", message: "Failed to refresh folders" } });
    }
  },
});
