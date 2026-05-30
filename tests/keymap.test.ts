import { describe, it, expect, beforeEach } from "bun:test";
import { useStore } from "@store";
import { handleKey } from "@store/handlers/keymap";
import type { KeyHandlerContext } from "@store/handlers/keymap";
import type { KeyEvent } from "@opentui/core";
import type { CliRenderer } from "@opentui/core";

function key(name: string): KeyEvent {
  return { name } as KeyEvent;
}

const mockRenderer = {
  destroy: () => {},
} as unknown as CliRenderer;

function ctx(overrides: Partial<KeyHandlerContext> = {}): KeyHandlerContext {
  return {
    renderer: mockRenderer,
    getState: useStore.getState,
    setState: useStore.setState,
    ...overrides,
  };
}

describe("handleKey", () => {
  beforeEach(() => {
    useStore.setState({
      items: [
        {
          id: "folder:/test/books/manga1",
          label: "manga1",
          depth: 0,
          isZip: false,
          entry: null,
          checked: false,
          excluded: false,
        },
        {
          id: "folder:/test/books/manga2",
          label: "manga2",
          depth: 1,
          isZip: false,
          entry: null,
          checked: false,
          excluded: false,
        },
      ],
      focusIndex: 0,
      authorMode: false,
      renameMode: false,
      changeDirMode: false,
      showHelp: false,
      browser: (() => {
        const { browser } = useStore.getState();
        return { ...browser, dir: "", cursor: 0, items: [] };
      })(),
    });
  });

  it("ignores keys when processing", () => {
    useStore.setState({ isProcessing: true });
    const result = handleKey(key("space"), ctx());
    expect(result).toBeUndefined();
    useStore.setState({ isProcessing: false });
  });

  it("up arrow moves focus up", () => {
    useStore.setState({ focusIndex: 1 });
    handleKey(key("up"), ctx());
    expect(useStore.getState().focusIndex).toBe(0);
  });

  it("up arrow does not go below 0", () => {
    handleKey(key("up"), ctx());
    expect(useStore.getState().focusIndex).toBe(0);
  });

  it("down arrow moves focus down", () => {
    handleKey(key("down"), ctx());
    expect(useStore.getState().focusIndex).toBe(1);
  });

  it("down arrow does not exceed max", () => {
    useStore.setState({ focusIndex: 1 });
    handleKey(key("down"), ctx());
    expect(useStore.getState().focusIndex).toBe(1);
  });

  it("space toggles item", () => {
    handleKey(key("space"), ctx());
    expect(useStore.getState().selectedIds.has("folder:/test/books/manga1")).toBe(true);
  });

  it("escape does not close help modal", () => {
    useStore.setState({ showHelp: true });
    handleKey(key("escape"), ctx());
    expect(useStore.getState().showHelp).toBe(true);
  });

  it("h toggles help", () => {
    useStore.setState({ showHelp: false });
    handleKey(key("h"), ctx());
    expect(useStore.getState().showHelp).toBe(true);
  });

  it("h closes help when open", () => {
    useStore.setState({ showHelp: true });
    handleKey(key("h"), ctx());
    expect(useStore.getState().showHelp).toBe(false);
  });

  it("escape quits when not in modal", () => {
    const r = { destroy: () => {} } as unknown as CliRenderer;
    handleKey(key("escape"), ctx({ renderer: r }));
  });

  it("escape in changeDirMode does nothing", () => {
    useStore.setState({ changeDirMode: true });
    handleKey(key("escape"), ctx());
    expect(useStore.getState().changeDirMode).toBe(true);
  });

  it("escape cancels rename mode", () => {
    useStore.setState({ renameMode: true });
    handleKey(key("escape"), ctx());
    expect(useStore.getState().renameMode).toBe(false);
  });

  it("escape cancels author mode", () => {
    useStore.setState({ authorMode: true });
    handleKey(key("escape"), ctx());
    expect(useStore.getState().authorMode).toBe(false);
  });

  it("a selects all", () => {
    handleKey(key("a"), ctx());
    const state = useStore.getState();
    expect(state.selectedIds.size).toBe(2);
  });

  it("a deselects all when all already selected", () => {
    useStore.setState({ selectedIds: new Set(["folder:/test/books/manga1", "folder:/test/books/manga2"]) });
    handleKey(key("a"), ctx());
    expect(useStore.getState().selectedIds.size).toBe(0);
  });

  it("c toggles change dir on", () => {
    handleKey(key("c"), ctx());
    expect(useStore.getState().changeDirMode).toBe(true);
  });

  it("c toggles change dir off", () => {
    useStore.setState({ changeDirMode: true });
    handleKey(key("c"), ctx());
    expect(useStore.getState().changeDirMode).toBe(false);
  });

  it("r triggers refresh", () => {
    handleKey(key("r"), ctx());
  });

  it("u triggers unzip", () => {
    handleKey(key("u"), ctx());
  });

  it("p triggers pad", () => {
    handleKey(key("p"), ctx());
  });

  it("n toggles rename on", () => {
    handleKey(key("n"), ctx());
    expect(useStore.getState().renameMode).toBe(true);
  });

  it("n toggles rename off", () => {
    useStore.setState({ renameMode: true });
    handleKey(key("n"), ctx());
    expect(useStore.getState().renameMode).toBe(false);
  });

  it("f cycles epub -> both -> kepub -> epub", () => {
    useStore.setState({ outputFormat: "epub" });
    handleKey(key("f"), ctx());
    expect(useStore.getState().outputFormat).toBe("both");
    handleKey(key("f"), ctx());
    expect(useStore.getState().outputFormat).toBe("kepub");
    handleKey(key("f"), ctx());
    expect(useStore.getState().outputFormat).toBe("epub");
  });

  it("f cycles kepub -> epub -> both -> kepub", () => {
    useStore.setState({ outputFormat: "kepub" });
    handleKey(key("f"), ctx());
    expect(useStore.getState().outputFormat).toBe("epub");
    handleKey(key("f"), ctx());
    expect(useStore.getState().outputFormat).toBe("both");
    handleKey(key("f"), ctx());
    expect(useStore.getState().outputFormat).toBe("kepub");
  });

  it("m opens author mode", () => {
    handleKey(key("m"), ctx());
    expect(useStore.getState().authorMode).toBe(true);
  });

  it("enter triggers process", () => {
    handleKey(key("return"), ctx());
  });

  it("q quits", () => {
    const r = { destroy: () => {} } as unknown as CliRenderer;
    handleKey(key("q"), ctx({ renderer: r }));
  });

  it("changeDirMode blocks non-navigation keys", () => {
    useStore.setState({ changeDirMode: true, focusIndex: 0 });
    handleKey(key("space"), ctx());
    expect(useStore.getState().selectedIds.size).toBe(0);
  });

  it("changeDirMode handles up arrow", () => {
    useStore.setState({ changeDirMode: true, browser: { dir: "", cursor: 2, items: [] } });
    handleKey(key("up"), ctx());
    expect(useStore.getState().browser.cursor).toBe(1);
  });

  it("changeDirMode up arrow does not go below 0", () => {
    useStore.setState({ changeDirMode: true, browser: { dir: "", cursor: 0, items: [] } });
    handleKey(key("up"), ctx());
    expect(useStore.getState().browser.cursor).toBe(0);
  });

  it("changeDirMode handles down arrow", () => {
    useStore.setState({ changeDirMode: true, browser: { dir: "", cursor: 0, items: [{ name: "a", hasContent: true }, { name: "b", hasContent: false }] } });
    handleKey(key("down"), ctx());
    expect(useStore.getState().browser.cursor).toBe(1);
  });

  it("changeDirMode down arrow does not exceed items length", () => {
    useStore.setState({ changeDirMode: true, browser: { dir: "", cursor: 2, items: [{ name: "a", hasContent: true }, { name: "b", hasContent: false }] } });
    handleKey(key("down"), ctx());
    expect(useStore.getState().browser.cursor).toBe(2);
  });

  it("changeDirMode enter at cursor 0 calls browserConfirm", () => {
    useStore.setState({ changeDirMode: true, browser: { dir: "", cursor: 0, items: [] } });
    const orig = useStore.getState().browserConfirm;
    let called = false;
    useStore.setState({ browserConfirm: async () => { called = true; } });
    handleKey(key("return"), ctx());
    expect(called).toBe(true);
    useStore.setState({ browserConfirm: orig });
  });

  it("changeDirMode enter at cursor >0 calls browserSetDir with subdir name", () => {
    useStore.setState({ changeDirMode: true, browser: { dir: "/base", cursor: 1, items: [{ name: "sub1", hasContent: true }] } });
    const orig = useStore.getState().browserSetDir;
    let calledWith = "";
    useStore.setState({ browserSetDir: (async (dir: string) => { calledWith = dir; }) as typeof orig });
    handleKey(key("return"), ctx());
    expect(calledWith).toBe("/base/sub1");
    useStore.setState({ browserSetDir: orig });
  });

  it("changeDirMode backspace navigates up", () => {
    useStore.setState({ changeDirMode: true, browser: { dir: "/base/sub", cursor: 1, items: [] } });
    const orig = useStore.getState().browserSetDir;
    let calledWith = "";
    useStore.setState({ browserSetDir: (async (dir: string) => { calledWith = dir; }) as typeof orig });
    handleKey(key("backspace"), ctx());
    expect(calledWith).toBe("/base");
    useStore.setState({ browserSetDir: orig });
  });

  it("changeDirMode backspace at root does nothing", () => {
    useStore.setState({ changeDirMode: true, browser: { dir: "/", cursor: 1, items: [] } });
    const orig = useStore.getState().browserSetDir;
    let called = false;
    useStore.setState({ browserSetDir: (async () => { called = true; }) as typeof orig });
    handleKey(key("backspace"), ctx());
    expect(called).toBe(false);
    useStore.setState({ browserSetDir: orig });
  });

  it("renameMode blocks non-n keys", () => {
    useStore.setState({ renameMode: true, focusIndex: 0 });
    handleKey(key("space"), ctx());
    expect(useStore.getState().selectedIds.size).toBe(0);
  });

  it("authorMode blocks non-m keys", () => {
    useStore.setState({ authorMode: true, focusIndex: 0 });
    handleKey(key("space"), ctx());
    expect(useStore.getState().selectedIds.size).toBe(0);
  });

  it("help mode blocks non-escape/h keys", () => {
    useStore.setState({ showHelp: true, focusIndex: 0 });
    handleKey(key("space"), ctx());
    expect(useStore.getState().selectedIds.size).toBe(0);
  });

  it("` toggles config", () => {
    useStore.setState({ showConfig: false });
    handleKey(key("`"), ctx());
    expect(useStore.getState().showConfig).toBe(true);
  });

  it("` closes config when open", () => {
    useStore.setState({ showConfig: true });
    handleKey(key("`"), ctx());
    expect(useStore.getState().showConfig).toBe(false);
  });

  it("does nothing for unknown keys", () => {
    const result = handleKey(key("unknown"), ctx());
    expect(result).toBeUndefined();
  });
});
