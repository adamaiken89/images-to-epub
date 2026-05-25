import { basename } from "path";

import { createEpubFromFolder } from "@utils/epub";
import { t } from "@utils/i18n";
import { padImageFilenames } from "@utils/pad";
import { unzipFile } from "@utils/zip";

import { getFoldersToProcess } from "./selection";

import type { StateCreator } from "zustand";
import type { AppState } from "@store/types";
async function batchProcess(
  set: (
    partial: Partial<AppState> | ((state: AppState) => Partial<AppState>),
  ) => void,
  get: () => AppState,
  targets: string[],
  processor: (
    target: string,
  ) => Promise<{ success: boolean; message?: string }>,
  collectFailures = false,
): Promise<void> {
  if (targets.length === 0) {
    return;
  }

  let successCount = 0;
  let failCount = 0;
  const failed: string[] = [];

  for (let i = 0; i < targets.length; i++) {
    set({
      status: {
        type: "progress",
        message: t("batch.progress", {
          current: i + 1,
          total: targets.length,
          name: basename(targets[i]),
        }),
      },
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
      message:
        t("batch.done", { success: successCount, failed: failCount }) + suffix,
    },
    isProcessing: false,
  });
}

export const createBatchSlice: StateCreator<
  AppState,
  [],
  [],
  Pick<
    AppState,
    | "status"
    | "isProcessing"
    | "processFolders"
    | "unzipSelected"
    | "padSelected"
  >
> = (set, get, _store) => ({
  status: { type: "info", message: t("selection.item", { count: 0 }) },
  isProcessing: false,

  processFolders: async () => {
    const { selectedIds, items } = get();
    set({ isProcessing: true });
    const folders = getFoldersToProcess(selectedIds, items);
    if (folders.length === 0) {
      set({ isProcessing: false });
      return;
    }
    await batchProcess(set, get, folders, createEpubFromFolder, true);
  },

  unzipSelected: async () => {
    const { selectedIds, baseDir } = get();
    const zips = Array.from(selectedIds)
      .filter((id) => id.startsWith("zip:"))
      .map((id) => id.slice(4));
    if (zips.length === 0) {
      return;
    }
    set({ isProcessing: true });
    await batchProcess(set, get, zips, unzipFile);
    if (baseDir) {
      await get().loadFolders(baseDir);
    }
  },

  padSelected: async () => {
    const { selectedIds, items } = get();
    const folders = getFoldersToProcess(selectedIds, items);
    if (folders.length === 0) {
      return;
    }
    set({ isProcessing: true });
    await batchProcess(set, get, folders, padImageFilenames);
  },
});
