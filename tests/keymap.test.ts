import { describe, it, expect, beforeEach } from "bun:test";
import { useStore } from "@/store";
import { handleKey } from "@/store/handlers/keymap";
import type { KeyEvent } from "@opentui/core";
import type { CliRenderer } from "@opentui/core";

function key(name: string): KeyEvent {
  return { name } as KeyEvent;
}

const mockRenderer = {
  destroy: () => {},
} as unknown as CliRenderer;

function ctx(overrides: Partial<Parameters<typeof handleKey>[1]> = {}): Parameters<typeof handleKey>[1] {
  return {
    renderer: mockRenderer,
    isProcessing: false,
    changeDirMode: false,
    renameMode: false,
    showHelp: false,
    itemsLength: 2,
    focusIndex: 0,
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
    handleKey(key("down"), ctx({ focusIndex: 0 }));
    expect(useStore.getState().focusIndex).toBe(1);
  });

  it("navigates up with arrow key", () => {
    handleKey(key("up"), ctx({ focusIndex: 1 }));
    expect(useStore.getState().focusIndex).toBe(0);
  });

  it("stays at top when navigating up from index 0", () => {
    handleKey(key("up"), ctx({ focusIndex: 0 }));
    expect(useStore.getState().focusIndex).toBe(0);
  });

  it("stays at bottom when navigating down from last index", () => {
    handleKey(key("down"), ctx({ focusIndex: 1 }));
    expect(useStore.getState().focusIndex).toBe(1);
  });

  it("toggles item at focus index on space", () => {
    handleKey(key("space"), ctx({ focusIndex: 0 }));
    const state = useStore.getState();
    expect(state.items[0].checked).toBe(true);
    expect(state.selectedIds.has("folder:/test/books/manga1")).toBe(true);
  });

  it("toggles item off on second space press", () => {
    handleKey(key("space"), ctx({ focusIndex: 0 }));
    handleKey(key("space"), ctx({ focusIndex: 0 }));
    const state = useStore.getState();
    expect(state.items[0].checked).toBe(false);
    expect(state.selectedIds.has("folder:/test/books/manga1")).toBe(false);
  });

  it("selects all on 'a'", () => {
    handleKey(key("a"), ctx({ focusIndex: 0 }));
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

    handleKey(key("d"), ctx({ focusIndex: 0 }));
    const state = useStore.getState();
    expect(state.items[0].checked).toBe(false);
    expect(state.items[1].checked).toBe(false);
    expect(state.selectedIds.size).toBe(0);
  });

  it("ignores key presses when processing", () => {
    handleKey(key("down"), ctx({ isProcessing: true, focusIndex: 0 }));
    expect(useStore.getState().focusIndex).toBe(0);
  });

  it("cancels change dir mode on escape", () => {
    useStore.setState({ changeDirMode: true });
    handleKey(key("escape"), ctx({ changeDirMode: true, focusIndex: 0 }));
    expect(useStore.getState().changeDirMode).toBe(false);
  });

  it("opens change dir on 'c'", () => {
    handleKey(key("c"), ctx({ focusIndex: 0 }));
    expect(useStore.getState().changeDirMode).toBe(true);
  });

  it("quits on 'q'", () => {
    let destroyed = false;
    const r = { destroy: () => { destroyed = true; } } as unknown as CliRenderer;
    handleKey(key("q"), ctx({ renderer: r, focusIndex: 0 }));
    expect(destroyed).toBe(true);
  });

  it("triggers process on 'p'", () => {
    const { processFolders } = useStore.getState();
    const original = processFolders;
    let called = false;
    useStore.setState({ processFolders: async () => { called = true; } });
    handleKey(key("p"), ctx({ focusIndex: 0 }));
    expect(called).toBe(true);
    useStore.setState({ processFolders: original });
  });

  it("triggers unzip on 'u'", () => {
    const { unzipSelected } = useStore.getState();
    let called = false;
    useStore.setState({ unzipSelected: async () => { called = true; } });
    handleKey(key("u"), ctx({ focusIndex: 0 }));
    expect(called).toBe(true);
    useStore.setState({ unzipSelected });
  });

  it("triggers pad on 'z'", () => {
    const { padSelected } = useStore.getState();
    let called = false;
    useStore.setState({ padSelected: async () => { called = true; } });
    handleKey(key("z"), ctx({ focusIndex: 0 }));
    expect(called).toBe(true);
    useStore.setState({ padSelected });
  });

  it("triggers refresh on 'r'", () => {
    const { refresh } = useStore.getState();
    let called = false;
    useStore.setState({ refresh: async () => { called = true; } });
    handleKey(key("r"), ctx({ focusIndex: 0 }));
    expect(called).toBe(true);
    useStore.setState({ refresh });
  });
});
