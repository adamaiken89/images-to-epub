import type { KeyEvent } from "@opentui/core";
import type { CliRenderer } from "@opentui/core";
import { useStore } from "..";

export interface KeyHandlerContext {
  renderer: CliRenderer;
  isProcessing: boolean;
  changeDirMode: boolean;
  renameMode: boolean;
  showHelp: boolean;
  itemsLength: number;
  focusIndex: number;
}

export function handleKey(key: KeyEvent, ctx: KeyHandlerContext): void {
  const { renderer, isProcessing, changeDirMode, renameMode, showHelp, itemsLength, focusIndex } = ctx;
  const store = useStore.getState();

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
      useStore.setState({ focusIndex: Math.max(0, focusIndex - 1) });
      break;
    case "down":
      useStore.setState({ focusIndex: Math.min(itemsLength - 1, focusIndex + 1) });
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
