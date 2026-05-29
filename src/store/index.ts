import { create } from "zustand";
import type { AppState } from "./types";
import { createScanSlice } from "./slices/scan";
import { createSelectionSlice } from "./slices/selection";
import { createBatchSlice } from "./slices/batch";
import { createNavigationSlice } from "./slices/navigation";
import { createRenameSlice } from "./slices/rename";
import { createAuthorSlice } from "./slices/author";
import { createSummarySlice } from "./slices/summary";
import { getFoldersToProcess } from "./slices/selection";
import { saveConfig } from "@utils/config";

export type { AppState, TreeItem, StatusMessage, ProgressItem } from "./types";
export { getFoldersToProcess };

export const useStore = create<AppState>()((set, get, api) => ({
  ...createScanSlice(set, get, api),
  ...createSelectionSlice(set, get, api),
  ...createBatchSlice(set, get, api),
  ...createNavigationSlice(set, get, api),
  ...createRenameSlice(set, get, api),
  ...createAuthorSlice(set, get, api),
  ...createSummarySlice(set, get, api),

  outputFormat: "epub",

  setOutputFormat: async (fmt: "epub" | "kepub" | "both") => {
    set({ outputFormat: fmt });
    try {
      await saveConfig({ outputFormat: fmt });
    } catch {}
  },
}));
