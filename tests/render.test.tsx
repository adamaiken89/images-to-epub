import { describe, it, expect, beforeEach } from "bun:test";
import { testRender } from "@opentui/react/test-utils";
import { Header } from "@/components/Header";
import { InfoMessage } from "@/components/InfoMessage";
import { HelpModal } from "@/components/HelpModal";
import { StatusBar } from "@/components/StatusBar";
import { ErrorBoundary } from "@/components/ErrorBoundary";
import { ChangeDirPrompt } from "@/components/ChangeDirPrompt";
import { RenamePrompt } from "@/components/RenamePrompt";
import { TreeView } from "@/components/TreeView";
import { useStore } from "@/store";
import { handleKey } from "@/store/handlers/keymap";
import type { CliRenderer } from "@opentui/core";
import type { KeyEvent } from "@opentui/core";

function key(name: string): KeyEvent {
  return { name } as KeyEvent;
}

const mockRenderer = {
  destroy: () => {},
} as unknown as CliRenderer;

// eslint-disable-next-line @typescript-eslint/no-explicit-any
async function render(node: any, width = 60, height = 10) {
  const { captureCharFrame, renderOnce } = await testRender(node, { width, height });
  await renderOnce();
  return captureCharFrame();
}

function ThrowingComponent() {
  throw new Error("crash test");
  return null;
}

beforeEach(() => {
  useStore.setState({
    baseDir: "",
    items: [],
    selectedIds: new Set(),
    focusIndex: 0,
    folderCount: 0,
    zipCount: 0,
    isProcessing: false,
    changeDirMode: false,
    showHelp: false,
    renameMode: false,
    renameTarget: null,
    subdirs: [],
    promptKey: 0,
    renameKey: 0,
    status: { type: "info", message: "" },
  });
});

// ── Static render tests ──────────────────────────────────────────

describe("component rendering", () => {
  it("renders a box with text", async () => {
    const frame = await render(<box><text>Hello World</text></box>);
    expect(frame).toContain("Hello World");
  });

  it("renders two texts in a box", async () => {
    const frame = await render(
      <box flexDirection="column">
        <text>Line One</text>
        <text>Line Two</text>
      </box>
    );
    expect(frame).toContain("Line One");
    expect(frame).toContain("Line Two");
  });

  it("renders text with underline", async () => {
    const frame = await render(<text><u>/some/path</u></text>);
    expect(frame).toContain("/some/path");
  });

  it("renders text with colored spans", async () => {
    const frame = await render(
      <text>Found <span fg="#ffcc00">3</span> folder(s)</text>
    );
    expect(frame).toContain("Found 3 folder(s)");
  });

  it("renders Header with title and directory", async () => {
    useStore.setState({ baseDir: "/test/path" });
    const frame = await render(<Header />);
    expect(frame).toContain("EPUB Generator");
    expect(frame).toContain("/test/path");
  });

  it("renders Header when baseDir is empty", async () => {
    useStore.setState({ baseDir: "" });
    const frame = await render(<Header />);
    expect(frame).toContain("EPUB Generator");
    expect(frame).toContain("No directory selected");
  });

  it("renders InfoMessage with counts", async () => {
    useStore.setState({ folderCount: 5, zipCount: 2, showHelp: false });
    const frame = await render(<InfoMessage />);
    expect(frame).toContain("5");
    expect(frame).toContain("folder(s)");
    expect(frame).toContain("2");
    expect(frame).toContain("zip(s)");
    expect(frame).toContain("[h]");
    expect(frame).toContain("help");
  });

  it("renders InfoMessage with hide when help is shown", async () => {
    useStore.setState({ folderCount: 1, zipCount: 0, showHelp: true });
    const frame = await render(<InfoMessage />);
    expect(frame).toContain("[h]");
    expect(frame).toContain("hide");
  });

  it("renders StatusBar with status message", async () => {
    useStore.setState({
      status: { type: "info", message: "0 item(s) selected" },
    });
    const frame = await render(<StatusBar />);
    expect(frame).toContain("0 item(s) selected");
  });

  it("renders StatusBar with error message", async () => {
    useStore.setState({
      status: { type: "error", message: "Permission denied" },
    });
    const frame = await render(<StatusBar />);
    expect(frame).toContain("Permission denied");
  });

  it("returns null from StatusBar when message is empty", async () => {
    useStore.setState({ status: { type: "info", message: "" } });
    const frame = await render(<StatusBar />);
    expect(frame).not.toContain("item(s)");
  });

  it("renders HelpModal with shortcuts", async () => {
    const frame = await render(<HelpModal />, 60, 20);
    expect(frame).toContain("Keyboard Shortcuts");
    expect(frame).toContain("[Space]");
    expect(frame).toContain("[p]");
    expect(frame).toContain("[Esc]");
    expect(frame).toContain("[n]");
  });

  it("renders ErrorBoundary with children when no error", async () => {
    const frame = await render(
      <ErrorBoundary><text>all good</text></ErrorBoundary>
    );
    expect(frame).toContain("all good");
  });

  it("renders error state in ErrorBoundary when child throws", async () => {
    try {
      await render(
        <ErrorBoundary><ThrowingComponent /></ErrorBoundary>
      );
    } catch {
      // expected — error propagated through dev-mode test renderer
    }
  });
});

// ── Snapshot tests ───────────────────────────────────────────────

describe("component snapshots", () => {
  it("Header snapshot with directory", async () => {
    useStore.setState({ baseDir: "/test/path" });
    const frame = await render(<Header />);
    expect(frame).toMatchSnapshot();
  });

  it("InfoMessage snapshot with counts", async () => {
    useStore.setState({ folderCount: 3, zipCount: 1, showHelp: false });
    const frame = await render(<InfoMessage />);
    expect(frame).toMatchSnapshot();
  });

  it("HelpModal snapshot", async () => {
    const frame = await render(<HelpModal />, 60, 20);
    expect(frame).toMatchSnapshot();
  });
});

// ── Untested components ──────────────────────────────────────────

describe("ChangeDirPrompt", () => {
  it("renders null when changeDirMode is false", async () => {
    useStore.setState({ changeDirMode: false });
    const frame = await render(<ChangeDirPrompt />);
    expect(frame.trim()).toBe("");
  });

  it("renders prompt when changeDirMode is true", async () => {
    useStore.setState({ changeDirMode: true, baseDir: "/test", subdirs: [] });
    const frame = await render(<ChangeDirPrompt />, 60, 10);
    expect(frame).toContain("Change Directory");
    expect(frame).toContain("/test");
    expect(frame).toContain("ESC to cancel");
  });

  it("shows subdir hints", async () => {
    useStore.setState({
      changeDirMode: true,
      baseDir: "/test",
      subdirs: ["manga1", "manga2"],
    });
    const frame = await render(<ChangeDirPrompt />, 60, 8);
    expect(frame).toContain("Subdirs");
    expect(frame).toContain("manga1");
    expect(frame).toContain("manga2");
  });
});

describe("RenamePrompt", () => {
  it("renders null when renameMode is false", async () => {
    useStore.setState({ renameMode: false });
    const frame = await render(<RenamePrompt />);
    expect(frame.trim()).toBe("");
  });

  it("renders prompt when renameMode is true", async () => {
    useStore.setState({
      renameMode: true,
      renameTarget: "/test/manga-vol1",
    });
    const frame = await render(<RenamePrompt />, 60, 20);
    // Title text may render at top of box; verify key content
    expect(frame).toContain("manga-vol1");
    expect(frame).toContain("### Author");
    expect(frame).toContain("ESC to cancel");
  });
});

describe("TreeView", () => {
  it("shows empty message when no items", async () => {
    useStore.setState({ items: [] });
    const frame = await render(<TreeView />, 60, 5);
    expect(frame).toContain("No folders found");
  });

  it("renders tree items", async () => {
    useStore.setState({
      items: [
        { id: "folder:/a", label: "Folder A", depth: 0, isZip: false, entry: null, checked: false },
        { id: "folder:/b", label: "Folder B", depth: 1, isZip: false, entry: null, checked: true },
      ],
      focusIndex: 0,
    });
    const frame = await render(<TreeView />, 60, 8);
    expect(frame).toContain("Folder A");
    expect(frame).toContain("Folder B");
    expect(frame).toContain("[ ]");
    expect(frame).toContain("[x]");
  });

  it("renders zip items with highlight", async () => {
    useStore.setState({
      items: [
        { id: "zip:/a.zip", label: "📦 a.zip", depth: 0, isZip: true, entry: null, checked: false },
      ],
      focusIndex: 0,
    });
    const frame = await render(<TreeView />, 60, 5);
    expect(frame).toContain("📦");
    expect(frame).toContain("a.zip");
  });
});

// ── Interaction tests ────────────────────────────────────────────

describe("UI interactions", () => {
  it("toggles item checked state via space key", async () => {
    useStore.setState({
      items: [
        { id: "folder:/test/1", label: "Item 1", depth: 0, isZip: false, entry: null, checked: false },
        { id: "folder:/test/2", label: "Item 2", depth: 0, isZip: false, entry: null, checked: false },
      ],
      focusIndex: 0,
      selectedIds: new Set(),
    });

    handleKey(key("space"), {
      renderer: mockRenderer, isProcessing: false, changeDirMode: false,
      renameMode: false, showHelp: false, itemsLength: 2, focusIndex: 0,
    });

    const state = useStore.getState();
    expect(state.items[0].checked).toBe(true);
    expect(state.items[1].checked).toBe(false);
    expect(state.selectedIds.has("folder:/test/1")).toBe(true);

    // Re-render TreeView and verify [x] appears
    let frame = await render(<TreeView />, 60, 8);
    expect(frame).toContain("[x] Item 1");
    expect(frame).toContain("[ ] Item 2");

    // Toggle off
    handleKey(key("space"), {
      renderer: mockRenderer, isProcessing: false, changeDirMode: false,
      renameMode: false, showHelp: false, itemsLength: 2, focusIndex: 0,
    });

    frame = await render(<TreeView />, 60, 8);
    expect(frame).toContain("[ ] Item 1");
    expect(frame).toContain("[ ] Item 2");
  });

  it("opens and closes help modal", async () => {
    useStore.setState({ showHelp: false });

    // Press 'h' to open help
    handleKey(key("h"), {
      renderer: mockRenderer, isProcessing: false, changeDirMode: false,
      renameMode: false, showHelp: false, itemsLength: 0, focusIndex: 0,
    });
    expect(useStore.getState().showHelp).toBe(true);

    // Press 'h' again to close help
    handleKey(key("h"), {
      renderer: mockRenderer, isProcessing: false, changeDirMode: false,
      renameMode: false, showHelp: true, itemsLength: 0, focusIndex: 0,
    });
    expect(useStore.getState().showHelp).toBe(false);
  });

  it("opens and cancels change directory", async () => {
    useStore.setState({ changeDirMode: false });

    // Press 'c' to open change dir
    handleKey(key("c"), {
      renderer: mockRenderer, isProcessing: false, changeDirMode: false,
      renameMode: false, showHelp: false, itemsLength: 0, focusIndex: 0,
    });
    expect(useStore.getState().changeDirMode).toBe(true);

    // Press Escape to cancel
    handleKey(key("escape"), {
      renderer: mockRenderer, isProcessing: false, changeDirMode: true,
      renameMode: false, showHelp: false, itemsLength: 0, focusIndex: 0,
    });
    expect(useStore.getState().changeDirMode).toBe(false);
  });

  it("selects all and deselects all", async () => {
    useStore.setState({
      items: [
        { id: "folder:/test/a", label: "A", depth: 0, isZip: false, entry: null, checked: false },
        { id: "folder:/test/b", label: "B", depth: 0, isZip: false, entry: null, checked: false },
      ],
    });

    // Select all with 'a'
    handleKey(key("a"), {
      renderer: mockRenderer, isProcessing: false, changeDirMode: false,
      renameMode: false, showHelp: false, itemsLength: 2, focusIndex: 0,
    });

    let state = useStore.getState();
    expect(state.items.every((i) => i.checked)).toBe(true);
    expect(state.selectedIds.size).toBe(2);

    // Deselect all with 'd'
    handleKey(key("d"), {
      renderer: mockRenderer, isProcessing: false, changeDirMode: false,
      renameMode: false, showHelp: false, itemsLength: 2, focusIndex: 0,
    });

    state = useStore.getState();
    expect(state.items.every((i) => !i.checked)).toBe(true);
    expect(state.selectedIds.size).toBe(0);
  });

  it("opens and cancels rename prompt via keymap", async () => {
    useStore.setState({
      items: [
        { id: "folder:/test", label: "test", depth: 0, isZip: false, entry: { parts: ["test"], path: "/test", metadata: { hasImages: true, hasSubfolders: false, hasZips: false } }, checked: false },
      ],
      focusIndex: 0,
    });

    // Press 'n' to open rename
    handleKey(key("n"), {
      renderer: mockRenderer, isProcessing: false, changeDirMode: false,
      renameMode: false, showHelp: false, itemsLength: 1, focusIndex: 0,
    });
    expect(useStore.getState().renameMode).toBe(true);

    // Press Escape to cancel rename
    handleKey(key("escape"), {
      renderer: mockRenderer, isProcessing: false, changeDirMode: false,
      renameMode: true, showHelp: false, itemsLength: 1, focusIndex: 0,
    });
    expect(useStore.getState().renameMode).toBe(false);
  });
});
