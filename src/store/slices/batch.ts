import { basename } from "path";
import type { StateCreator } from "zustand";
import { createEpubFromFolder } from "../../utils/epub";
import { padImageFilenames } from "../../utils/pad";
import { unzipFile } from "../../utils/zip";
import type { AppState } from "../types";
import { getFoldersToProcess } from "./selection";

function getEffectiveSelection(selectedIds: Set<string>, items: AppState["items"]): Set<string> {
  if (selectedIds.size > 0) return selectedIds;
  return new Set(items.map((i) => i.id));
}

async function batchProcess(
  set: (partial: Partial<AppState> | ((state: AppState) => Partial<AppState>)) => void,
  get: () => AppState,
  targets: string[],
  processor: (target: string) => Promise<{ success: boolean; message?: string }>,
  collectFailures = false
): Promise<void> {
  if (targets.length === 0) return;

  let successCount = 0;
  let failCount = 0;
  const failed: string[] = [];

  for (let i = 0; i < targets.length; i++) {
    set({
      status: { type: "progress", message: `${i + 1}/${targets.length}: ${basename(targets[i])}...` },
    });
    const result = await processor(targets[i]);
    if (result.success) {
      successCount++;
    } else {
      failCount++;
      if (collectFailures && result.message) {
        failed.push(`${basename(targets[i])}: ${result.message}`);
      }
    }
  }

  const suffix = failed.length > 0 ? " | " + failed.join("; ") : "";
  set({
    status: {
      type: "done",
      message: `Done! Success: ${successCount}, Failed: ${failCount}${suffix}`,
    },
    isProcessing: false,
  });
}

export const createBatchSlice: StateCreator<
  AppState,
  [],
  [],
  Pick<AppState, "status" | "isProcessing" | "processFolders" | "unzipSelected" | "padSelected">
> = (set, get) => ({
  status: { type: "info", message: "0 item(s) selected" },
  isProcessing: false,

  processFolders: async () => {
    const { selectedIds, items } = get();
    set({ isProcessing: true });
    const ids = getEffectiveSelection(selectedIds, items);
    const folders = getFoldersToProcess(ids, items);
    if (folders.length === 0) {
      set({ isProcessing: false });
      return;
    }
    await batchProcess(set, get, folders, createEpubFromFolder, true);
  },

  unzipSelected: async () => {
    const { selectedIds, items, baseDir } = get();
    const ids = getEffectiveSelection(selectedIds, items);
    const zips = Array.from(ids)
      .filter((id) => id.startsWith("zip:"))
      .map((id) => id.slice(4));
    if (zips.length === 0) return;
    set({ isProcessing: true });
    await batchProcess(set, get, zips, unzipFile);
    if (baseDir) await get().loadFolders(baseDir);
  },

  padSelected: async () => {
    const { selectedIds, items } = get();
    const ids = getEffectiveSelection(selectedIds, items);
    const folders = getFoldersToProcess(ids, items);
    if (folders.length === 0) return;
    set({ isProcessing: true });
    await batchProcess(set, get, folders, padImageFilenames);
  },
});
