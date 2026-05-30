import type { AppState } from "@store/types";
import { batchSetAuthorWithProgress } from "@utils/fs";
import type { StateCreator } from "zustand";

import { getFoldersToProcess } from "./selection";

export const createAuthorSlice: StateCreator<
  AppState,
  [],
  [],
  Pick<AppState, "authorMode" | "toggleAuthorMode" | "submitAuthorName" | "cancelAuthorMode">
> = (set, get, _store) => ({
  authorMode: false,

  toggleAuthorMode: () => {
    set({ authorMode: !get().authorMode });
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
});
