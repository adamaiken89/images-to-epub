import type { FolderEntry } from "@utils/fs";

export interface TreeItem {
  id: string;
  label: string;
  depth: number;
  isZip: boolean;
  entry: FolderEntry | null;
  checked: boolean;
}

export interface StatusMessage {
  type: "" | "info" | "progress" | "error" | "done";
  message: string;
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
  processFolders: () => Promise<void>;
  unzipSelected: () => Promise<void>;
  padSelected: () => Promise<void>;

  // Navigation
  changeDirMode: boolean;
  showHelp: boolean;
  toggleHelp: () => void;
  subdirs: string[];
  promptKey: number;
  openChangeDir: () => void;
  changeDir: (path: string) => Promise<void>;
  cancelChangeDir: () => void;
  refresh: () => Promise<void>;

  // Rename
  renameMode: boolean;
  renameTarget: string | null;
  renameKey: number;
  openRename: () => void;
  renameSubmit: (newName: string) => Promise<void>;
  cancelRename: () => void;
}
