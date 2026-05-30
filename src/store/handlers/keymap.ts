import { join, dirname } from "path";
import type { KeyEvent } from "@opentui/core";
import type { CliRenderer } from "@opentui/core";
import type { AppState } from "@store/types";

export interface KeyHandlerContext {
  renderer: CliRenderer;
  getState: () => AppState;
  setState: (partial: Partial<AppState>) => void;
}

function handleSummaryKey(store: AppState): boolean {
  if (!store.showSummary) {return false;}
  store.dismissSummary();
  return true;
}

function handleConfigKey(key: KeyEvent, store: AppState): boolean {
  if (!store.showConfig) {return false;}
  if (key.name === "q") {store.toggleConfig();}
  return true;
}

function handleChangeDirKey(key: KeyEvent, store: AppState, setState: (partial: Partial<AppState>) => void): boolean {
  if (!store.changeDirMode) {return false;}
  if (key.name === "q") {
    store.cancelChangeDir();
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
  return true;
}

function handleRenameKey(key: KeyEvent, store: AppState): boolean {
  if (!store.renameMode) {return false;}
  if (key.name === "q") {store.cancelRename();}
  else if (key.name === "escape") {store.cancelRename();}
  return true;
}

function handleAuthorKey(key: KeyEvent, store: AppState): boolean {
  if (!store.authorMode) {return false;}
  if (key.name === "q") {store.cancelAuthorMode();}
  else if (key.name === "escape") {store.cancelAuthorMode();}
  return true;
}

function handleHelpKey(key: KeyEvent, store: AppState): boolean {
  if (!store.showHelp) {return false;}
  if (key.name === "q") {store.toggleHelp();}
  return true;
}

function handleDefaultKey(key: KeyEvent, store: AppState, ctx: KeyHandlerContext): void {
  const { renderer, setState } = ctx;
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

export function handleKey(key: KeyEvent, ctx: KeyHandlerContext): void {
  const { getState, setState } = ctx;
  const store = getState();

  if (store.isProcessing) {return;}
  if (handleSummaryKey(store)) {return;}
  if (handleConfigKey(key, store)) {return;}
  if (handleChangeDirKey(key, store, setState)) {return;}
  if (handleRenameKey(key, store)) {return;}
  if (handleAuthorKey(key, store)) {return;}
  if (handleHelpKey(key, store)) {return;}
  handleDefaultKey(key, store, ctx);
}
