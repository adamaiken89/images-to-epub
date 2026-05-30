import type { StateCreator } from "zustand";
import type { AppState } from "@store/types";

export const createSummarySlice: StateCreator<
  AppState,
  [],
  [],
  Pick<AppState, "showSummary" | "summary" | "dismissSummary">
> = (set, _get, _store) => ({
  showSummary: false,
  summary: {
    results: [],
    totalPages: 0,
    totalSize: 0,
    elapsed: 0,
    successCount: 0,
    failCount: 0,
  },

  dismissSummary: () => {
    set({ showSummary: false });
  },
});
