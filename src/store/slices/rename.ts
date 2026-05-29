import type { StateCreator } from "zustand";
import type { AppState } from "@store/types";
import { renameFolder } from "@utils/fs";

export const createRenameSlice: StateCreator<
  AppState,
  [],
  [],
  Pick<AppState, "renameMode" | "renameTarget" | "openRename" | "renameSubmit" | "cancelRename">
> = (set, get, _store) => ({
  renameMode: false,
  renameTarget: null,

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
});
