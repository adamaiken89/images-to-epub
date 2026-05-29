import type { StateCreator } from "zustand";
import type { AppState } from "@store/types";

export const createSummarySlice: StateCreator<
  AppState,
  [],
  [],
  Pick<
    AppState,
    | "showSummary"
    | "summaryResults"
    | "summaryTotalPages"
    | "summaryTotalSize"
    | "summaryElapsed"
    | "summarySuccessCount"
    | "summaryFailCount"
    | "dismissSummary"
  >
> = (set, _get, _store) => ({
  showSummary: false,
  summaryResults: [],
  summaryTotalPages: 0,
  summaryTotalSize: 0,
  summaryElapsed: 0,
  summarySuccessCount: 0,
  summaryFailCount: 0,

  dismissSummary: () => {
    set({ showSummary: false });
  },
});
