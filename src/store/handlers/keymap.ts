import { join, dirname } from "path";
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

  if (store.showSummary) {
    store.dismissSummary();
    return;
  }

  if (store.showConfig) {
    if (key.name === "escape" || key.name === "`") {store.toggleConfig();}
    return;
  }

  if (store.changeDirMode) {
    if (key.name === "escape") {store.cancelChangeDir();}
    else if (key.name === "up") {
      setState({ browseCursor: Math.max(0, store.browseCursor - 1) });
    } else if (key.name === "down") {
      setState({ browseCursor: Math.min(store.browseItems.length, store.browseCursor + 1) });
    } else if (key.name === "return") {
      if (store.browseCursor === 0) {
        store.browseConfirm();
      } else {
        const item = store.browseItems[store.browseCursor - 1];
        if (item) {store.browseSetDir(join(store.browseDir, item.name));}
      }
    } else if (key.name === "backspace") {
      const parent = dirname(store.browseDir);
      if (parent !== store.browseDir) {store.browseSetDir(parent);}
    }
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
      if (key.shift) {
        const prev = store.processingMode;
        setState({ processingMode: "sequential" });
        store.processFolders().finally(() => setState({ processingMode: prev }));
      } else {
        store.processFolders();
      }
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
    case "`":
      store.toggleConfig();
      break;
    case "f": {
      const cycle: Array<"epub" | "kepub" | "both"> = ["epub", "kepub", "both"];
      const idx = cycle.indexOf(store.outputFormat);
      store.setOutputFormat(cycle[(idx + 1) % cycle.length]);
      break;
    }
    case "m":
      store.openAuthorMode();
      break;
    case "q":
    case "escape":
      renderer.destroy();
      break;
  }
}
