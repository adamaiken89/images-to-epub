import type { FolderEntry, SubdirInfo } from "@utils/fs";

export interface TreeItem {
  id: string;
  label: string;
  depth: number;
  isZip: boolean;
  entry: FolderEntry | null;
  checked: boolean;
  excluded: boolean;
}

export interface StatusMessage {
  type: "info" | "progress" | "error" | "done" | null;
  message: string;
}

export interface ProgressItem {
  folderName: string;
  folderPath: string;
  status: "queued" | "processing" | "done" | "error";
  pagesCompleted: number;
  pagesTotal: number;
  message?: string;
}

export type ProcessingMode = "sequential" | "parallel";

export interface AppState {
  // Scan
  baseDir: string;
  folderCount: number;
  zipCount: number;
  loadFolders: (dir: string) => Promise<void>;
  init: () => Promise<void>;

  // Selection
  items: TreeItem[];
  selectedIds: Set<string>;
  focusIndex: number;
  toggleItem: (index: number) => void;
  selectAll: () => void;

  // Batch
  status: StatusMessage;
  isProcessing: boolean;
  progressItems: ProgressItem[];
  batchStartTime: number | null;
  batchEndTime: number | null;
  processingMode: ProcessingMode;
  processFolders: () => Promise<void>;
  unzipSelected: () => Promise<void>;
  padSelected: () => Promise<void>;

  // Navigation
  changeDirMode: boolean;
  showHelp: boolean;
  toggleHelp: () => void;
  openChangeDir: () => void;
  changeDir: (path: string) => Promise<void>;
  cancelChangeDir: () => void;
  refresh: () => Promise<void>;

  // Directory browser
  browseDir: string;
  browseCursor: number;
  browseItems: SubdirInfo[];
  browseSetDir: (dir: string) => Promise<void>;
  browseConfirm: () => Promise<void>;

  // Rename
  renameMode: boolean;
  renameTarget: string | null;
  openRename: () => void;
  renameSubmit: (newName: string) => Promise<void>;
  cancelRename: () => void;

  // Output format
  outputFormat: "epub" | "kepub" | "both";
  setOutputFormat: (fmt: "epub" | "kepub" | "both") => void;

  // Batch author
  authorMode: boolean;
  openAuthorMode: () => void;
  submitAuthorName: (name: string) => Promise<void>;
  cancelAuthorMode: () => void;

  // Config modal
  showConfig: boolean;
  toggleConfig: () => void;

  // Summary
  showSummary: boolean;
  summaryResults: string[];
  summaryTotalPages: number;
  summaryTotalSize: number;
  summaryElapsed: number;
  summarySuccessCount: number;
  summaryFailCount: number;
  dismissSummary: () => void;
}
