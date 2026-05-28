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
      browseDir: "",
      browseCursor: 0,
      browseItems: [],
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

  it("escape closes help modal", () => {
    useStore.setState({ showHelp: true });
    handleKey(key("escape"), ctx());
    expect(useStore.getState().showHelp).toBe(false);
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

  it("escape in changeDirMode cancels", () => {
    useStore.setState({ changeDirMode: true });
    handleKey(key("escape"), ctx());
    expect(useStore.getState().changeDirMode).toBe(false);
  });

  it("escape in renameMode cancels", () => {
    useStore.setState({ renameMode: true });
    handleKey(key("escape"), ctx());
    expect(useStore.getState().renameMode).toBe(false);
  });

  it("escape in authorMode cancels", () => {
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

  it("c opens change dir", () => {
    handleKey(key("c"), ctx());
    expect(useStore.getState().changeDirMode).toBe(true);
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

  it("n opens rename", () => {
    handleKey(key("n"), ctx());
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
    useStore.setState({ changeDirMode: true, browseCursor: 2 });
    handleKey(key("up"), ctx());
    expect(useStore.getState().browseCursor).toBe(1);
  });

  it("changeDirMode up arrow does not go below 0", () => {
    useStore.setState({ changeDirMode: true, browseCursor: 0 });
    handleKey(key("up"), ctx());
    expect(useStore.getState().browseCursor).toBe(0);
  });

  it("changeDirMode handles down arrow", () => {
    useStore.setState({ changeDirMode: true, browseCursor: 0, browseItems: [{ name: "a", hasContent: true }, { name: "b", hasContent: false }] });
    handleKey(key("down"), ctx());
    expect(useStore.getState().browseCursor).toBe(1);
  });

  it("changeDirMode down arrow does not exceed items length", () => {
    useStore.setState({ changeDirMode: true, browseCursor: 2, browseItems: [{ name: "a", hasContent: true }, { name: "b", hasContent: false }] });
    handleKey(key("down"), ctx());
    expect(useStore.getState().browseCursor).toBe(2);
  });

  it("changeDirMode enter at cursor 0 calls browseConfirm", () => {
    useStore.setState({ changeDirMode: true, browseCursor: 0 });
    const state = useStore.getState();
    const orig = state.browseConfirm;
    let called = false;
    state.browseConfirm = async () => { called = true; };
    handleKey(key("return"), ctx());
    expect(called).toBe(true);
    state.browseConfirm = orig;
  });

  it("changeDirMode enter at cursor >0 calls browseSetDir with subdir name", () => {
    useStore.setState({ changeDirMode: true, browseCursor: 1, browseDir: "/base", browseItems: [{ name: "sub1", hasContent: true }] });
    const state = useStore.getState();
    const orig = state.browseSetDir;
    let calledWith = "";
    state.browseSetDir = (async (dir: string) => { calledWith = dir; }) as typeof state.browseSetDir;
    handleKey(key("return"), ctx());
    expect(calledWith).toBe("/base/sub1");
    state.browseSetDir = orig;
  });

  it("changeDirMode backspace navigates up", () => {
    useStore.setState({ changeDirMode: true, browseDir: "/base/sub", browseCursor: 1 });
    const state = useStore.getState();
    const orig = state.browseSetDir;
    let calledWith = "";
    state.browseSetDir = (async (dir: string) => { calledWith = dir; }) as typeof state.browseSetDir;
    handleKey(key("backspace"), ctx());
    expect(calledWith).toBe("/base");
    state.browseSetDir = orig;
  });

  it("changeDirMode backspace at root does nothing", () => {
    useStore.setState({ changeDirMode: true, browseDir: "/" });
    const state = useStore.getState();
    const orig = state.browseSetDir;
    let called = false;
    state.browseSetDir = (async () => { called = true; }) as typeof state.browseSetDir;
    handleKey(key("backspace"), ctx());
    expect(called).toBe(false);
    state.browseSetDir = orig;
  });

  it("renameMode blocks non-escape keys", () => {
    useStore.setState({ renameMode: true, focusIndex: 0 });
    handleKey(key("space"), ctx());
    expect(useStore.getState().selectedIds.size).toBe(0);
  });

  it("authorMode blocks non-escape keys", () => {
    useStore.setState({ authorMode: true, focusIndex: 0 });
    handleKey(key("space"), ctx());
    expect(useStore.getState().selectedIds.size).toBe(0);
  });

  it("help mode blocks non-escape/h keys", () => {
    useStore.setState({ showHelp: true, focusIndex: 0 });
    handleKey(key("space"), ctx());
    expect(useStore.getState().selectedIds.size).toBe(0);
  });

  it("does nothing for unknown keys", () => {
    const result = handleKey(key("unknown"), ctx());
    expect(result).toBeUndefined();
  });
});
