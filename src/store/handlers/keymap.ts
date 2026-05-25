import type { KeyEvent } from "@opentui/core";
import type { CliRenderer } from "@opentui/core";
import type { AppState } from "@store/types";

export interface KeyHandlerContext {
  renderer: CliRenderer;
  getState: () => AppState;
  setState: (partial: Partial<AppState>) => void;
}

export function handleKey(key: KeyEvent, ctx: KeyHandlerContext): void {
  const { renderer, getState, setState } = ctx;
  const store = getState();

  if (store.isProcessing) {return;}

  if (store.changeDirMode) {
    if (key.name === "escape") {store.cancelChangeDir();}
    return;
  }

  if (store.renameMode) {
    if (key.name === "escape") {store.cancelRename();}
    return;
  }

  if (store.authorMode) {
    if (key.name === "escape") {store.cancelAuthorMode();}
    return;
  }

  if (store.showHelp) {
    if (key.name === "escape" || key.name === "h") {store.toggleHelp();}
    return;
  }

  switch (key.name) {
    case "up":
      setState({ focusIndex: Math.max(0, store.focusIndex - 1) });
      break;
    case "down":
      setState({ focusIndex: Math.min(store.items.length - 1, store.focusIndex + 1) });
      break;
    case "space":
      store.toggleItem(store.focusIndex);
      break;
    case "return":
      store.processFolders();
      break;
    case "a":
      store.selectAll();
      break;
    case "p":
      store.padSelected();
      break;
    case "u":
      store.unzipSelected();
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
    case "m":
      store.openAuthorMode();
      break;
    case "q":
    case "escape":
      renderer.destroy();
      break;
  }
}
