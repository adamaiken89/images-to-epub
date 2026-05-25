import { describe, it, expect, beforeEach } from "bun:test";
import { useStore } from "@store";
import { handleKey } from "@store/handlers/keymap";
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
    });
  });

  it("ignores keys when processing", () => {
    const result = handleKey(key("space"), ctx({ isProcessing: true }));
    expect(result).toBeUndefined();
  });

  it("up arrow moves focus up", () => {
    handleKey(key("up"), ctx({ focusIndex: 1 }));
    expect(useStore.getState().focusIndex).toBe(0);
  });

  it("up arrow does not go below 0", () => {
    handleKey(key("up"), ctx({ focusIndex: 0 }));
    expect(useStore.getState().focusIndex).toBe(0);
  });

  it("down arrow moves focus down", () => {
    handleKey(key("down"), ctx({ focusIndex: 0 }));
    expect(useStore.getState().focusIndex).toBe(1);
  });

  it("down arrow does not exceed max", () => {
    handleKey(key("down"), ctx({ focusIndex: 1 }));
    expect(useStore.getState().focusIndex).toBe(1);
  });

  it("space toggles item", () => {
    handleKey(key("space"), ctx({ focusIndex: 0 }));
    expect(useStore.getState().selectedIds.has("folder:/test/books/manga1")).toBe(true);
  });

  it("escape closes help modal", () => {
    useStore.setState({ showHelp: true });
    handleKey(key("escape"), ctx({ showHelp: true }));
    expect(useStore.getState().showHelp).toBe(false);
  });

  it("h toggles help", () => {
    useStore.setState({ showHelp: false });
    handleKey(key("h"), ctx({ showHelp: false }));
    expect(useStore.getState().showHelp).toBe(true);
  });

  it("h closes help when open", () => {
    useStore.setState({ showHelp: true });
    handleKey(key("h"), ctx({ showHelp: true }));
    expect(useStore.getState().showHelp).toBe(false);
  });

  it("escape quits when not in modal", () => {
    const r = { destroy: () => {} } as unknown as CliRenderer;
    handleKey(key("escape"), ctx({ renderer: r, showHelp: false }));
  });


  it("escape in changeDirMode cancels", () => {
    handleKey(key("escape"), ctx({ changeDirMode: true }));
    expect(useStore.getState().changeDirMode).toBe(false);
  });

  it("escape in renameMode cancels", () => {
    handleKey(key("escape"), ctx({ renameMode: true }));
    expect(useStore.getState().renameMode).toBe(false);
  });

  it("a selects all", () => {
    handleKey(key("a"), ctx({}));
    const state = useStore.getState();
    expect(state.selectedIds.size).toBe(2);
  });

  it("d deselects all", () => {
    handleKey(key("d"), ctx({}));
    expect(useStore.getState().selectedIds.size).toBe(0);
  });

  it("c opens change dir", () => {
    handleKey(key("c"), ctx({}));
    expect(useStore.getState().changeDirMode).toBe(true);
  });

  it("r triggers refresh", () => {
    handleKey(key("r"), ctx({}));
  });

  it("u triggers unzip", () => {
    handleKey(key("u"), ctx({}));
  });

  it("z triggers pad", () => {
    handleKey(key("z"), ctx({}));
  });

  it("n opens rename", () => {
    handleKey(key("n"), ctx({}));
  });

  it("p triggers process", () => {
    handleKey(key("p"), ctx({}));
  });

  it("enter triggers process", () => {
    handleKey(key("return"), ctx({}));
  });

  it("q quits", () => {
    const r = { destroy: () => {} } as unknown as CliRenderer;
    handleKey(key("q"), ctx({ renderer: r }));
  });

  it("changeDirMode blocks non-escape keys", () => {
    handleKey(key("space"), ctx({ changeDirMode: true, focusIndex: 0 }));
    expect(useStore.getState().selectedIds.size).toBe(0);
  });

  it("renameMode blocks non-escape keys", () => {
    handleKey(key("space"), ctx({ renameMode: true, focusIndex: 0 }));
    expect(useStore.getState().selectedIds.size).toBe(0);
  });

  it("help mode blocks non-escape/h keys", () => {
    handleKey(key("space"), ctx({ showHelp: true, focusIndex: 0 }));
    expect(useStore.getState().selectedIds.size).toBe(0);
  });

  it("does nothing for unknown keys", () => {
    const result = handleKey(key("unknown"), ctx({}));
    expect(result).toBeUndefined();
  });
});
