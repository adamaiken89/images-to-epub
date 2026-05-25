import type { KeyEvent } from "@opentui/core";
import type { CliRenderer } from "@opentui/core";
import type { AppState } from "@store/types";

export interface KeyHandlerContext {
  renderer: CliRenderer;
  isProcessing: boolean;
  changeDirMode: boolean;
  renameMode: boolean;
  showHelp: boolean;
  itemsLength: number;
  focusIndex: number;
  getState: () => AppState;
  setState: (partial: Partial<AppState>) => void;
}

export function handleKey(key: KeyEvent, ctx: KeyHandlerContext): void {
  const { renderer, isProcessing, changeDirMode, renameMode, showHelp, itemsLength, focusIndex, getState, setState } = ctx;
  const store = getState();

  if (isProcessing) {return;}

  if (changeDirMode) {
    if (key.name === "escape") {store.cancelChangeDir();}
    return;
  }

  if (renameMode) {
    if (key.name === "escape") {store.cancelRename();}
    return;
  }

  if (showHelp) {
    if (key.name === "escape" || key.name === "h") {store.toggleHelp();}
    return;
  }

  switch (key.name) {
    case "up":
      setState({ focusIndex: Math.max(0, focusIndex - 1) });
      break;
    case "down":
      setState({ focusIndex: Math.min(itemsLength - 1, focusIndex + 1) });
      break;
    case "space":
      store.toggleItem(focusIndex);
      break;
    case "return":
    case "p":
      store.processFolders();
      break;
    case "a":
      store.selectAll();
      break;
    case "d":
      store.deselectAll();
      break;
    case "u":
      store.unzipSelected();
      break;
    case "z":
      store.padSelected();
      break;
    case "c":
      store.openChangeDir();
      break;
    case "h":
      store.toggleHelp();
      break;
    case "r":
      store.refresh();
      break;
    case "n":
      store.openRename();
      break;
    case "q":
    case "escape":
      renderer.destroy();
      break;
  }
}
