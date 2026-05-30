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
    if (key.name === "`") {store.toggleConfig();}
    return;
  }

  if (store.changeDirMode) {
    if (key.name === "c") {
      store.toggleChangeDir();
    } else if (key.name === "up") {
      setState({ browser: { ...store.browser, cursor: Math.max(0, store.browser.cursor - 1) } });
    } else if (key.name === "down") {
      setState({ browser: { ...store.browser, cursor: Math.min(store.browser.items.length, store.browser.cursor + 1) } });
    } else if (key.name === "return") {
      if (store.browser.cursor === 0) {
        store.browserConfirm();
      } else {
        const item = store.browser.items[store.browser.cursor - 1];
        if (item) {store.browserSetDir(join(store.browser.dir, item.name));}
      }
    } else if (key.name === "backspace") {
      const parent = dirname(store.browser.dir);
      if (parent !== store.browser.dir) {store.browserSetDir(parent);}
    }
    return;
  }

  if (store.renameMode) {
    if (key.name === "n") {store.toggleRename();}
    else if (key.name === "escape") {store.cancelRename();}
    return;
  }

  if (store.authorMode) {
    if (key.name === "m") {store.toggleAuthorMode();}
    else if (key.name === "escape") {store.cancelAuthorMode();}
    return;
  }

  if (store.showHelp) {
    if (key.name === "h") {store.toggleHelp();}
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
        store.processFolders("sequential");
      } else {
        store.processFolders();
      }
      break;
    case "a":
      store.selectAll();
      break;
    case "d":
      store.deselectAll();
      break;
    case "p":
      store.padSelected();
      break;
    case "u":
      store.unzipSelected();
      break;
    case "c":
      store.toggleChangeDir();
      break;
    case "h":
      store.toggleHelp();
      break;
    case "r":
      store.refresh();
      break;
    case "n":
      store.toggleRename();
      break;
    case "`":
      store.toggleConfig();
      break;
    case "f": {
      const cycle: Record<string, "epub" | "kepub" | "both"> = { epub: "both", both: "kepub", kepub: "epub" };
      store.setOutputFormat(cycle[store.outputFormat]);
      break;
    }
    case "m":
      store.toggleAuthorMode();
      break;
    case "q":
    case "escape":
      renderer.destroy();
      break;
  }
}
