import { create } from "zustand";
import type { AppState } from "./types";
import { createScanSlice } from "./slices/scan";
import { createSelectionSlice } from "./slices/selection";
import { createBatchSlice } from "./slices/batch";

export type { AppState, TreeItem, StatusMessage } from "./types";
export { getFoldersToProcess } from "./slices/selection";

export const useStore = create<AppState>()((...a) => ({
  ...createScanSlice(...a),
  ...createSelectionSlice(...a),
  ...createBatchSlice(...a),

  changeDirMode: false,

  openChangeDir: () => {
    a[0]({ changeDirMode: true });
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
    if (baseDir) await a[1]().loadFolders(baseDir);
  },
}));
