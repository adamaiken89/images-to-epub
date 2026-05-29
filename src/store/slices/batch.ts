import { basename } from "path";

import type { EpubResult } from "@utils/epub";
import { createEpubFromFolder } from "@utils/epub";
import { t } from "@utils/i18n";
import { padImageFilenames } from "@utils/pad";
import { unzipFile } from "@utils/zip";
import { clampParallelism, loadConfig } from "@utils/config";
import { runWorkerPool, type WorkerPoolResult } from "@utils/worker-pool";

import { getFoldersToProcess } from "./selection";

import type { StateCreator } from "zustand";
import type { AppState, ProgressItem } from "@store/types";
import { ID_PREFIXES } from "@store/constants";

function createProgressItems(targets: string[]): ProgressItem[] {
  return targets.map((p) => ({
    folderName: basename(p),
    folderPath: p,
    status: "queued" as const,
    pagesCompleted: 0,
    pagesTotal: 0,
  }));
}

function markProcessing(items: ProgressItem[], idx: number): ProgressItem[] {
  return items.map((p, i) =>
    i === idx ? { ...p, status: "processing" as const } : p,
  );
}

function markProgress(items: ProgressItem[], idx: number, done: number, total: number): ProgressItem[] {
  return items.map((p, i) =>
    i === idx ? { ...p, pagesCompleted: done, pagesTotal: total } : p,
  );
}

function markDone(items: ProgressItem[], idx: number, pagesCompleted: number, pagesTotal: number, message?: string): ProgressItem[] {
  return items.map((p, i) =>
    i === idx
      ? { ...p, status: "done" as const, pagesCompleted, pagesTotal, message }
      : p,
  );
}

function markError(items: ProgressItem[], idx: number, message: string): ProgressItem[] {
  return items.map((p, i) =>
    i === idx ? { ...p, status: "error" as const, message } : p,
  );
}

function computeSummary(
  startTime: number,
  endTime: number,
  poolResult: WorkerPoolResult,
) {
  const elapsed = ((endTime - startTime) / 1000).toFixed(1);
  return {
    isProcessing: false,
    batchEndTime: endTime,
    status: {
      type: "done" as const,
      message: t("batch.done", { success: poolResult.successCount, failed: poolResult.failCount }) + ` (${elapsed}s)`,
    },
    showSummary: true,
    summary: {
      show: true,
      results: poolResult.results,
      totalPages: poolResult.totalPages,
      totalSize: poolResult.totalSize,
      elapsed: parseFloat(elapsed),
      successCount: poolResult.successCount,
      failCount: poolResult.failCount,
    },
  };
}

export const createBatchSlice: StateCreator<
  AppState,
  [],
  [],
  Pick<
    AppState,
    | "status"
    | "isProcessing"
    | "progressItems"
    | "batchStartTime"
    | "batchEndTime"
    | "processingMode"
    | "processFolders"
    | "unzipSelected"
    | "padSelected"
  >
> = (set, get, _store) => ({
  status: { type: "info", message: t("selection.item", { count: 0 }) },
  isProcessing: false,
  progressItems: [],
  batchStartTime: null,
  batchEndTime: null,
  processingMode: "parallel",

  processFolders: async () => {
    const { selectedIds, items, processingMode } = get();
    const folders = getFoldersToProcess(selectedIds, items);
    if (folders.length === 0) {
      set({ isProcessing: false });
      return;
    }

    const progressItems = createProgressItems(folders);
    const startTime = Date.now();
    set({ progressItems, batchStartTime: startTime, isProcessing: true });

    const pConfig = await loadConfig();
    const parallelism = processingMode === "sequential" ? 1 : clampParallelism(pConfig.parallelism);

    const wrappedProcessor = async (folder: string, _folderName: string) => {
      const idx = folders.indexOf(folder);
      set((state) => ({ progressItems: markProcessing(state.progressItems, idx) }));
      const result = await createEpubFromFolder(folder, undefined, get().outputFormat, (done, total) => {
        set((state) => ({ progressItems: markProgress(state.progressItems, idx, done, total) }));
      });
      if (result.success) {
        set((state) => ({
          progressItems: markDone(state.progressItems, idx, result.pagesCompleted || 0, result.pagesTotal || 0, result.message),
        }));
      } else {
        set((state) => ({ progressItems: markError(state.progressItems, idx, result.message) }));
      }
      return result;
    };

    const poolResult = await runWorkerPool(folders, wrappedProcessor, parallelism);
    set(computeSummary(startTime, Date.now(), poolResult));
  },

  unzipSelected: async () => {
    const { selectedIds, baseDir } = get();
    const zips = Array.from(selectedIds)
      .filter((id) => id.startsWith(ID_PREFIXES.zip))
      .map((id) => id.slice(ID_PREFIXES.zip.length));
    if (zips.length === 0) {return;}

    const progressItems = createProgressItems(zips);
    const startTime = Date.now();
    set({ progressItems, batchStartTime: startTime, isProcessing: true });

    const pConfig = await loadConfig();
    const parallelism = clampParallelism(pConfig.parallelism);

    const wrappedProcessor = async (target: string, _folderName: string) => {
      const idx = zips.indexOf(target);
      set((state) => ({ progressItems: markProcessing(state.progressItems, idx) }));
      const result = await unzipFile(target) as EpubResult;
      if (result.success) {
        set((state) => ({ progressItems: markDone(state.progressItems, idx, 0, 0, result.message) }));
      } else {
        set((state) => ({ progressItems: markError(state.progressItems, idx, result.message) }));
      }
      return { ...result, pagesTotal: 0, pagesCompleted: 0 };
    };

    const poolResult = await runWorkerPool(zips, wrappedProcessor, parallelism);
    set(computeSummary(startTime, Date.now(), poolResult));
    if (baseDir) {
      await get().loadFolders(baseDir);
    }
  },

  padSelected: async () => {
    const { selectedIds, items } = get();
    const folders = getFoldersToProcess(selectedIds, items);
    if (folders.length === 0) {return;}

    const progressItems = createProgressItems(folders);
    const startTime = Date.now();
    set({ progressItems, batchStartTime: startTime, isProcessing: true });

    const pConfig = await loadConfig();
    const parallelism = clampParallelism(pConfig.parallelism);

    const wrappedProcessor = async (target: string, _folderName: string) => {
      const idx = folders.indexOf(target);
      set((state) => ({ progressItems: markProcessing(state.progressItems, idx) }));
      const result = await padImageFilenames(target);
      if (result.success) {
        set((state) => ({ progressItems: markDone(state.progressItems, idx, 0, 0, result.message) }));
      } else {
        set((state) => ({ progressItems: markError(state.progressItems, idx, result.message) }));
      }
      return { ...result, pagesTotal: 0, pagesCompleted: 0 };
    };

    const poolResult = await runWorkerPool(folders, wrappedProcessor, parallelism);
    set(computeSummary(startTime, Date.now(), poolResult));
  },
});
