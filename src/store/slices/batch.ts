import { basename } from "path";

import type { EpubResult } from "@utils/epub";
import { createEpubFromFolder } from "@utils/epub";
import { t } from "@utils/i18n";
import { padImageFilenames } from "@utils/pad";
import { unzipFile } from "@utils/zip";
import { clampParallelism, loadConfig } from "@utils/config";

import { getFoldersToProcess } from "./selection";

import type { StateCreator } from "zustand";
import type { AppState, ProcessingMode, ProgressItem } from "@store/types";
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
  successCount: number,
  failCount: number,
  summaryResults: string[],
  summaryTotalPages: number,
  summaryTotalSize: number,
) {
  const elapsed = ((endTime - startTime) / 1000).toFixed(1);
  return {
    isProcessing: false,
    batchEndTime: endTime,
    status: {
      type: "done" as const,
      message: t("batch.done", { success: successCount, failed: failCount }) + ` (${elapsed}s)`,
    },
    showSummary: true,
    summaryResults,
    summaryTotalPages,
    summaryTotalSize,
    summaryElapsed: parseFloat(elapsed),
    summarySuccessCount: successCount,
    summaryFailCount: failCount,
  };
}

async function batchProcessParallel(
  set: (partial: Partial<AppState> | ((state: AppState) => Partial<AppState>)) => void,
  get: () => AppState,
  targets: string[],
  processor: (target: string, onPage?: (completed: number, total: number) => void) => Promise<EpubResult>,
  mode?: ProcessingMode,
): Promise<void> {
  if (targets.length === 0) {return;}

  const pConfig = await loadConfig();
  const baseParallelism = clampParallelism(pConfig.parallelism);
  const parallelism = mode === "sequential" ? 1 : baseParallelism;
  const queue = [...targets];
  const summaryResults: string[] = [];
  let summaryTotalPages = 0;
  let summaryTotalSize = 0;
  let successCount = 0;
  let failCount = 0;

  const progressItems = createProgressItems(targets);
  const startTime = Date.now();

  set({ progressItems, batchStartTime: startTime, batchEndTime: null, isProcessing: true });

  async function worker() {
    while (queue.length > 0) {
      const folder = queue.shift()!;
      const idx = targets.indexOf(folder);
      const folderName = basename(folder);

      set((state) => ({ progressItems: markProcessing(state.progressItems, idx) }));

      try {
        const result = await processor(folder, (done: number, totalP: number) => {
          set((state) => ({ progressItems: markProgress(state.progressItems, idx, done, totalP) }));
        });

        if (result.success) {
          successCount++;
          summaryTotalPages += result.pagesCompleted || 0;
          summaryTotalSize += result.outputSize || 0;
          set((state) => ({
            progressItems: markDone(state.progressItems, idx, result.pagesCompleted || 0, result.pagesTotal || 0, result.message),
          }));
          summaryResults.push(`${folderName}: ${result.pagesCompleted || 0} pages`);
        } else {
          failCount++;
          set((state) => ({ progressItems: markError(state.progressItems, idx, result.message) }));
          summaryResults.push(`${folderName}: error: ${result.message}`);
        }
      } catch (err) {
        failCount++;
        set((state) => ({ progressItems: markError(state.progressItems, idx, (err as Error).message) }));
        summaryResults.push(`${folderName}: error: ${(err as Error).message}`);
      }
    }
  }

  const workerCount = parallelism > 1 ? parallelism : 1;
  const workers = Array.from({ length: workerCount }, () => worker());
  await Promise.all(workers);

  const endTime = Date.now();

  set(computeSummary(startTime, endTime, successCount, failCount, summaryResults, summaryTotalPages, summaryTotalSize));
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
    const epubProcessor = async (target: string, onPage?: (done: number, total: number) => void) => {
      return createEpubFromFolder(target, undefined, get().outputFormat, onPage);
    };
    await batchProcessParallel(set, get, folders, epubProcessor, processingMode);
  },

  unzipSelected: async () => {
    const { selectedIds, baseDir } = get();
    const zips = Array.from(selectedIds)
      .filter((id) => id.startsWith(ID_PREFIXES.zip))
      .map((id) => id.slice(ID_PREFIXES.zip.length));
    if (zips.length === 0) {return;}
    set({ isProcessing: true });
    const unzipProcessor = (target: string) => unzipFile(target) as Promise<EpubResult>;
    await batchProcessParallel(set, get, zips, unzipProcessor);
    if (baseDir) {
      await get().loadFolders(baseDir);
    }
  },

  padSelected: async () => {
    const { selectedIds, items } = get();
    const folders = getFoldersToProcess(selectedIds, items);
    if (folders.length === 0) {return;}
    set({ isProcessing: true });
    const padProcessor = async (target: string): Promise<EpubResult> => {
      const result = await padImageFilenames(target);
      return { ...result, pagesTotal: 0, pagesCompleted: 0 };
    };
    await batchProcessParallel(set, get, folders, padProcessor);
  },
});
