import { create } from "zustand";
import type { AppState } from "./types";
import { createScanSlice } from "./slices/scan";
import { createSelectionSlice } from "./slices/selection";
import { createBatchSlice } from "./slices/batch";
import { getSubdirs } from "../utils/fs";

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
}));
