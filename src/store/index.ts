import { saveConfig } from "@utils/config";
import { create } from "zustand";

import { createAuthorSlice } from "./slices/author";
import { createBatchSlice } from "./slices/batch";
import { createNavigationSlice } from "./slices/navigation";
import { createRenameSlice } from "./slices/rename";
import { createScanSlice } from "./slices/scan";
import { createSelectionSlice } from "./slices/selection";
import { getFoldersToProcess } from "./slices/selection";
import { createSummarySlice } from "./slices/summary";
import type { AppState } from "./types";

export type { AppState, TreeItem } from "./types";
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
