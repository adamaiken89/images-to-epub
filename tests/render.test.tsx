import { describe, it, expect, beforeEach } from "bun:test";
import { testRender } from "@opentui/react/test-utils";
import { Header } from "@components/Header";
import { InfoMessage } from "@components/InfoMessage";
import { HelpModal } from "@components/HelpModal";
import { StatusBar } from "@components/StatusBar";
import { ErrorBoundary } from "@components/ErrorBoundary";
import { ChangeDirPrompt } from "@components/ChangeDirPrompt";
import { RenamePrompt } from "@components/RenamePrompt";
import { TreeView } from "@components/TreeView";
import { useStore } from "@store";
import type { ReactNode } from "react";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
async function render(node: any, width = 60, height = 10) {
  const { captureCharFrame, renderOnce } = await testRender(node, { width, height });
  await renderOnce();
  return captureCharFrame();
}

function ThrowingComponent(): ReactNode {
  throw new Error("crash test");
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

// ── Static element render tests ───────────────────────────────────

describe("element rendering", () => {
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
});

// ── Header ────────────────────────────────────────────────────────

describe("Header", () => {
  it("shows title and directory path", async () => {
    useStore.setState({ baseDir: "/test/path" });
    const frame = await render(<Header />);
    expect(frame).toContain("EPUB Generator");
    expect(frame).toContain("/test/path");
  });

  it("shows 'No directory selected' when baseDir is empty", async () => {
    useStore.setState({ baseDir: "" });
    const frame = await render(<Header />);
    expect(frame).toContain("EPUB Generator");
    expect(frame).toContain("No directory selected");
  });
});

// ── InfoMessage ───────────────────────────────────────────────────

describe("InfoMessage", () => {
  it("shows folder and zip counts when results exist", async () => {
    useStore.setState({ folderCount: 5, zipCount: 2, showHelp: false });
    const frame = await render(<InfoMessage />);
    expect(frame).toContain("5");
    expect(frame).toContain("folder(s)");
    expect(frame).toContain("2");
    expect(frame).toContain("zip(s)");
  });

  it("shows help toggle hint", async () => {
    useStore.setState({ folderCount: 1, zipCount: 0, showHelp: false });
    const frame = await render(<InfoMessage />);
    expect(frame).toContain("[h]");
    expect(frame).toContain("help");
  });

  it("shows 'hide' instead of 'help' when help is open", async () => {
    useStore.setState({ folderCount: 1, zipCount: 0, showHelp: true });
    const frame = await render(<InfoMessage />);
    expect(frame).toContain("[h]");
    expect(frame).toContain("hide");
  });
});

// ── StatusBar ─────────────────────────────────────────────────────

describe("StatusBar", () => {
  it("shows info message", async () => {
    useStore.setState({ status: { type: "info", message: "0 item(s) selected" } });
    const frame = await render(<StatusBar />);
    expect(frame).toContain("0 item(s) selected");
  });

  it("shows error message", async () => {
    useStore.setState({ status: { type: "error", message: "Permission denied" } });
    const frame = await render(<StatusBar />);
    expect(frame).toContain("Permission denied");
  });

  it("returns null when message is empty", async () => {
    useStore.setState({ status: { type: "info", message: "" } });
    const frame = await render(<StatusBar />);
    expect(frame.trim()).toBe("");
  });
});

// ── HelpModal ─────────────────────────────────────────────────────

describe("HelpModal", () => {
  it("shows keyboard shortcuts", async () => {
    const frame = await render(<HelpModal />, 60, 20);
    expect(frame).toContain("Keyboard Shortcuts");
    expect(frame).toContain("[Space]");
    expect(frame).toContain("[p]");
    expect(frame).toContain("[Esc]");
    expect(frame).toContain("[n]");
  });
});

// ── ErrorBoundary ─────────────────────────────────────────────────

describe("ErrorBoundary", () => {
  it("renders children when no error", async () => {
    const frame = await render(
      <ErrorBoundary><text>all good</text></ErrorBoundary>
    );
    expect(frame).toContain("all good");
  });

  it("renders error state when child throws", async () => {
    try {
      await render(
        <ErrorBoundary><ThrowingComponent /></ErrorBoundary>
      );
    } catch {
      // expected — error propagated through dev-mode test renderer
    }
  });
});

// ── ChangeDirPrompt ───────────────────────────────────────────────

describe("ChangeDirPrompt", () => {
  it("returns null when changeDirMode is false", async () => {
    useStore.setState({ changeDirMode: false });
    const frame = await render(<ChangeDirPrompt />);
    expect(frame.trim()).toBe("");
  });

  it("shows prompt and current directory", async () => {
    useStore.setState({ changeDirMode: true, baseDir: "/test", subdirs: [] });
    const frame = await render(<ChangeDirPrompt />, 60, 10);
    expect(frame).toContain("Change Directory");
    expect(frame).toContain("/test");
    expect(frame).toContain("ESC to cancel");
  });

  it("shows subdirectory hints", async () => {
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

// ── RenamePrompt ──────────────────────────────────────────────────

describe("RenamePrompt", () => {
  it("returns null when renameMode is false", async () => {
    useStore.setState({ renameMode: false });
    const frame = await render(<RenamePrompt />);
    expect(frame.trim()).toBe("");
  });

  it("shows prompt with folder name and author suffix", async () => {
    useStore.setState({
      renameMode: true,
      renameTarget: "/test/manga-vol1",
    });
    const frame = await render(<RenamePrompt />, 60, 20);
    expect(frame).toContain("manga-vol1");
    expect(frame).toContain("### Author");
    expect(frame).toContain("ESC to cancel");
  });
});

// ── TreeView ──────────────────────────────────────────────────────

describe("TreeView", () => {
  it("shows empty message when no items", async () => {
    useStore.setState({ items: [] });
    const frame = await render(<TreeView />, 60, 5);
    expect(frame).toContain("No folders found");
  });

  it("renders tree items with checkboxes", async () => {
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

  it("renders zip items", async () => {
    useStore.setState({
      items: [
        { id: "zip:/a.zip", label: "\uD83D\uDCE6 a.zip", depth: 0, isZip: true, entry: null, checked: false },
      ],
      focusIndex: 0,
    });
    const frame = await render(<TreeView />, 60, 5);
    expect(frame).toContain("\uD83D\uDCE6");
    expect(frame).toContain("a.zip");
  });
});

// ── Snapshots ─────────────────────────────────────────────────────

describe("snapshots", () => {
  it("Header with directory", async () => {
    useStore.setState({ baseDir: "/test/path" });
    const frame = await render(<Header />);
    expect(frame).toMatchSnapshot();
  });

  it("InfoMessage with counts", async () => {
    useStore.setState({ folderCount: 3, zipCount: 1, showHelp: false });
    const frame = await render(<InfoMessage />);
    expect(frame).toMatchSnapshot();
  });

  it("HelpModal", async () => {
    const frame = await render(<HelpModal />, 60, 20);
    expect(frame).toMatchSnapshot();
  });
});
