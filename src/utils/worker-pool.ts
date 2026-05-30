import type { EpubResult } from "@utils/epub";
import { basename } from "path";

export interface WorkerPoolResult {
  results: string[];
  totalPages: number;
  totalSize: number;
  successCount: number;
  failCount: number;
}

export async function runWorkerPool(
  targets: string[],
  processor: (target: string, folderName: string) => Promise<EpubResult>,
  parallelism: number,
): Promise<WorkerPoolResult> {
  if (targets.length === 0) {
    return { results: [], totalPages: 0, totalSize: 0, successCount: 0, failCount: 0 };
  }

  const queue = [...targets];
  let successCount = 0;
  let failCount = 0;
  let totalPages = 0;
  let totalSize = 0;
  const results: string[] = [];

  async function worker() {
    while (queue.length > 0) {
      const folder = queue.shift()!;
      const folderName = basename(folder);

      try {
        const result = await processor(folder, folderName);

        if (result.success) {
          successCount++;
          totalPages += result.pagesCompleted || 0;
          totalSize += result.outputSize || 0;
          results.push(`${folderName}: ${result.pagesCompleted || 0} pages`);
        } else {
          failCount++;
          results.push(`${folderName}: error: ${result.message}`);
        }
      } catch (err) {
        failCount++;
        const msg = err instanceof Error ? err.message : String(err);
        results.push(`${folderName}: error: ${msg}`);
      }
    }
  }

  const workerCount = parallelism > 1 ? parallelism : 1;
  const workers = Array.from({ length: workerCount }, () => worker());
  await Promise.all(workers);

  return { results, totalPages, totalSize, successCount, failCount };
}
