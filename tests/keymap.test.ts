import { describe, it, expect, beforeEach } from "bun:test";
import { useStore } from "../src/store";
import { handleKey } from "../src/store/handlers/keymap";
import type { KeyEvent } from "@opentui/core";
import type { CliRenderer } from "@opentui/core";

function key(name: string): KeyEvent {
  return { name } as KeyEvent;
}

const mockRenderer = {
  destroy: () => {},
} as unknown as CliRenderer;

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
        },
        {
          id: "folder:/test/books/manga2",
          label: "manga2",
          depth: 1,
          isZip: false,
          entry: null,
          checked: false,
        },
      ],
      selectedIds: new Set(),
      focusIndex: 0,
      isProcessing: false,
      changeDirMode: false,
    });
  });

  it("navigates down with arrow key", () => {
    handleKey(key("down"), {
      renderer: mockRenderer,
      isProcessing: false,
      changeDirMode: false,
      showHelp: false,
      itemsLength: 2,
      focusIndex: 0,
    });
    expect(useStore.getState().focusIndex).toBe(1);
  });

  it("navigates up with arrow key", () => {
    handleKey(key("up"), {
      renderer: mockRenderer,
      isProcessing: false,
      changeDirMode: false,
      showHelp: false,
      itemsLength: 2,
      focusIndex: 1,
    });
    expect(useStore.getState().focusIndex).toBe(0);
  });

  it("stays at top when navigating up from index 0", () => {
    handleKey(key("up"), {
      renderer: mockRenderer,
      isProcessing: false,
      changeDirMode: false,
      showHelp: false,
      itemsLength: 2,
      focusIndex: 0,
    });
    expect(useStore.getState().focusIndex).toBe(0);
  });

  it("stays at bottom when navigating down from last index", () => {
    handleKey(key("down"), {
      renderer: mockRenderer,
      isProcessing: false,
      changeDirMode: false,
      showHelp: false,
      itemsLength: 2,
      focusIndex: 1,
    });
    expect(useStore.getState().focusIndex).toBe(1);
  });

  it("toggles item at focus index on space", () => {
    handleKey(key("space"), {
      renderer: mockRenderer,
      isProcessing: false,
      changeDirMode: false,
      showHelp: false,
      itemsLength: 2,
      focusIndex: 0,
    });
    const state = useStore.getState();
    expect(state.items[0].checked).toBe(true);
    expect(state.selectedIds.has("folder:/test/books/manga1")).toBe(true);
  });

  it("toggles item off on second space press", () => {
    handleKey(key("space"), {
      renderer: mockRenderer,
      isProcessing: false,
      changeDirMode: false,
      showHelp: false,
      itemsLength: 2,
      focusIndex: 0,
    });
    handleKey(key("space"), {
      renderer: mockRenderer,
      isProcessing: false,
      changeDirMode: false,
      showHelp: false,
      itemsLength: 2,
      focusIndex: 0,
    });
    const state = useStore.getState();
    expect(state.items[0].checked).toBe(false);
    expect(state.selectedIds.has("folder:/test/books/manga1")).toBe(false);
  });

  it("selects all on 'a'", () => {
    handleKey(key("a"), {
      renderer: mockRenderer,
      isProcessing: false,
      changeDirMode: false,
      showHelp: false,
      itemsLength: 2,
      focusIndex: 0,
    });
    const state = useStore.getState();
    expect(state.items[0].checked).toBe(true);
    expect(state.items[1].checked).toBe(true);
    expect(state.selectedIds.size).toBe(2);
  });

  it("deselects all on 'd'", () => {
    useStore.setState({
      selectedIds: new Set(["folder:/test/books/manga1", "folder:/test/books/manga2"]),
      items: useStore.getState().items.map((it) => ({ ...it, checked: true })),
    });

    handleKey(key("d"), {
      renderer: mockRenderer,
      isProcessing: false,
      changeDirMode: false,
      showHelp: false,
      itemsLength: 2,
      focusIndex: 0,
    });
    const state = useStore.getState();
    expect(state.items[0].checked).toBe(false);
    expect(state.items[1].checked).toBe(false);
    expect(state.selectedIds.size).toBe(0);
  });

  it("ignores key presses when processing", () => {
    handleKey(key("down"), {
      renderer: mockRenderer,
      isProcessing: true,
      changeDirMode: false,
      showHelp: false,
      itemsLength: 2,
      focusIndex: 0,
    });
    expect(useStore.getState().focusIndex).toBe(0);
  });

  it("cancels change dir mode on escape", () => {
    useStore.setState({ changeDirMode: true });
    handleKey(key("escape"), {
      renderer: mockRenderer,
      isProcessing: false,
      changeDirMode: true,
      showHelp: false,
      itemsLength: 2,
      focusIndex: 0,
    });
    expect(useStore.getState().changeDirMode).toBe(false);
  });

  it("opens change dir on 'c'", () => {
    handleKey(key("c"), {
      renderer: mockRenderer,
      isProcessing: false,
      changeDirMode: false,
      showHelp: false,
      itemsLength: 2,
      focusIndex: 0,
    });
    expect(useStore.getState().changeDirMode).toBe(true);
  });

  it("quits on 'q'", () => {
    let destroyed = false;
    const r = { destroy: () => { destroyed = true; } } as unknown as CliRenderer;
    handleKey(key("q"), {
      renderer: r,
      isProcessing: false,
      changeDirMode: false,
      showHelp: false,
      itemsLength: 2,
      focusIndex: 0,
    });
    expect(destroyed).toBe(true);
  });
});
