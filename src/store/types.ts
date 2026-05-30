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

export interface BrowserState {
  dir: string;
  cursor: number;
  items: SubdirInfo[];
}

export interface SummaryData {
  results: string[];
  totalPages: number;
  totalSize: number;
  elapsed: number;
  successCount: number;
  failCount: number;
}

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
  deselectAll: () => void;

  // Batch
  status: StatusMessage;
  isProcessing: boolean;
  progressItems: ProgressItem[];
  batchStartTime: number | null;
  batchEndTime: number | null;
  processingMode: ProcessingMode;
  processFolders: (mode?: ProcessingMode) => Promise<void>;
  unzipSelected: () => Promise<void>;
  padSelected: () => Promise<void>;

  // Navigation
  changeDirMode: boolean;
  showHelp: boolean;
  toggleHelp: () => void;
  toggleChangeDir: () => void;
  changeDir: (path: string) => Promise<void>;
  cancelChangeDir: () => void;
  refresh: () => Promise<void>;

  // Directory browser
  browser: BrowserState;
  browserSetDir: (dir: string) => Promise<void>;
  browserConfirm: () => Promise<void>;

  // Rename
  renameMode: boolean;
  renameTarget: string | null;
  toggleRename: () => void;
  renameSubmit: (newName: string) => Promise<void>;
  cancelRename: () => void;

  // Output format
  outputFormat: "epub" | "kepub" | "both";
  setOutputFormat: (fmt: "epub" | "kepub" | "both") => void;

  // Batch author
  authorMode: boolean;
  toggleAuthorMode: () => void;
  submitAuthorName: (name: string) => Promise<void>;
  cancelAuthorMode: () => void;

  // Config modal
  showConfig: boolean;
  toggleConfig: () => void;

  // Summary
  showSummary: boolean;
  summary: SummaryData;
  dismissSummary: () => void;
}
