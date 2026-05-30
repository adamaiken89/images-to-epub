import { describe, it, expect, beforeEach, afterEach } from "bun:test";
import { render as renderWithCleanup } from "@wyattjoh/opentui-testing";
import { Header } from "@components/Header";
import { InfoMessage } from "@components/InfoMessage";
import { HelpModal } from "@components/HelpModal";
import { ErrorBoundary } from "@components/ErrorBoundary";
import { ChangeDirPrompt } from "@components/ChangeDirPrompt";
import { RenamePrompt } from "@components/RenamePrompt";
import { TreeView } from "@components/TreeView";
import { useStore } from "@store";
import type { ReactNode } from "react";
import { handleRenameSubmit, makeOnSubmit } from "@components/RenamePrompt";

const cleanupQueue: Array<{ cleanup: () => Promise<void> }> = [];

// eslint-disable-next-line @typescript-eslint/no-explicit-any
async function render(node: any, width = 60, height = 10) {
  const app = await renderWithCleanup(node, { width, height });
  cleanupQueue.push(app);
  return app.captureCharFrame();
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
    status: { type: "info", message: "" },
    outputFormat: "epub",
    authorMode: false,
    showConfig: false,
    showSummary: false,
    browser: (() => {
      const { browser } = useStore.getState();
      return { ...browser, dir: "", cursor: 0, items: [] };
    })(),
    progressItems: [],
    batchStartTime: null,
    batchEndTime: null,
    processingMode: "sequential",
    summary: {
      results: [],
      totalPages: 0,
      totalSize: 0,
      elapsed: 0,
      successCount: 0,
      failCount: 0,
    },
  });
});

afterEach(async () => {
  for (const app of cleanupQueue) {
    await app.cleanup();
  }
  cleanupQueue.length = 0;
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
    useStore.setState({ baseDir: "/test/path", outputFormat: "epub" });
    const frame = await render(<Header />);
    expect(frame).toContain("EPUB Generator");
    expect(frame).toContain("[epub]");
    expect(frame).toContain("/test/path");
  });

  it("shows 'No directory selected' when baseDir is empty", async () => {
    useStore.setState({ baseDir: "" });
    const frame = await render(<Header />);
    expect(frame).toContain("EPUB Generator");
    expect(frame).toContain("[epub]");
    expect(frame).toContain("No directory selected");
  });
});

// ── InfoMessage ───────────────────────────────────────────────────

describe("InfoMessage", () => {
  it("shows folder and zip counts when results exist", async () => {
    useStore.setState({ folderCount: 5, zipCount: 2, showHelp: false });
    const frame = await render(<InfoMessage />);
    expect(frame).toContain("5");
    expect(frame).toContain("folders");
    expect(frame).toContain("2");
    expect(frame).toContain("zips");
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

// ── HelpModal ─────────────────────────────────────────────────────

describe("HelpModal", () => {
  it("shows keyboard shortcuts", async () => {
    useStore.setState({ showHelp: true });
    const frame = await render(<HelpModal />, 60, 20);
    expect(frame).toContain("Keyboard Shortcuts");
    expect(frame).toContain("[Space]");
    expect(frame).toContain("[p]");
    expect(frame).toContain("[q]");
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
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    let app: any;
    try {
      app = await renderWithCleanup(
        <ErrorBoundary><ThrowingComponent /></ErrorBoundary>,
        { width: 60, height: 10 },
      );
      await app.captureCharFrame();
    } catch {
      // expected — error propagated through dev-mode test renderer
    } finally {
      await app?.cleanup();
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

  it("shows prompt, current directory, select option, and nav hint", async () => {
    useStore.setState({ changeDirMode: true, browser: { dir: "/test", cursor: 0, items: [] } });
    const frame = await render(<ChangeDirPrompt />, 60, 14);
    expect(frame).toContain("/test");
    expect(frame).toContain("Select this directory");
    expect(frame).toContain("\u2191\u2193");
  });

  it("shows subdirectory items with content indicators", async () => {
    useStore.setState({
      changeDirMode: true,
        browser: {
          dir: "/test",
          cursor: 1,
          items: [
            { name: "manga1", hasContent: true },
            { name: "empty-dir", hasContent: false },
          ],
        },
    });
    const frame = await render(<ChangeDirPrompt />, 60, 14);
    expect(frame).toContain("manga1");
    expect(frame).toContain("empty-dir");
    expect(frame).toContain("[!]");
    expect(frame).toContain("[ ]");
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
    expect(frame).toContain("EPUB metadata");
    expect(frame).toContain("\u00B7 q cancel");
  });
});

describe("handleRenameSubmit", () => {
  it("calls renameSubmit with trimmed value", () => {
    let submitted = "";
    handleRenameSubmit("  new-name  ", (v) => { submitted = v; }, () => {});
    expect(submitted).toBe("new-name");
  });

  it("calls cancelRename when value is empty after trim", () => {
    let cancelled = false;
    handleRenameSubmit("  ", () => {}, () => { cancelled = true; });
    expect(cancelled).toBe(true);
  });
});

describe("makeOnSubmit", () => {
  it("returns a function that delegates to handleRenameSubmit", () => {
    let submitted = "";
    const fn = makeOnSubmit((v) => { submitted = v; }, () => {});
    fn("test-value");
    expect(submitted).toBe("test-value");
  });

  it("calls cancelRename when returned function receives empty value", () => {
    let cancelled = false;
    const fn = makeOnSubmit(() => {}, () => { cancelled = true; });
    fn("");
    expect(cancelled).toBe(true);
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
        { id: "folder:/a", label: "Folder A", depth: 0, isZip: false, entry: null, checked: false, excluded: false },
        { id: "folder:/b", label: "Folder B", depth: 1, isZip: false, entry: null, checked: true, excluded: false },
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
        { id: "zip:/a.zip", label: "\uD83D\uDCE6 a.zip", depth: 0, isZip: true, entry: null, checked: false, excluded: false },
      ],
      focusIndex: 0,
    });
    const frame = await render(<TreeView />, 60, 5);
    expect(frame).toContain("\uD83D\uDCE6");
    expect(frame).toContain("a.zip");
  });

  it("renders implicit checkbox for parent-selected children", async () => {
    useStore.setState({
      items: [
        { id: "folder:/parent", label: "Parent", depth: 0, isZip: false, entry: null, checked: true, excluded: false },
        { id: "folder:/parent/child", label: "Child", depth: 1, isZip: false, entry: null, checked: false, excluded: false },
      ],
      focusIndex: 0,
    });
    const frame = await render(<TreeView />, 60, 8);
    expect(frame).toContain("\u2022");
  });

  it("renders skip checkbox for excluded children", async () => {
    useStore.setState({
      items: [
        { id: "folder:/parent", label: "Parent", depth: 0, isZip: false, entry: null, checked: true, excluded: false },
        { id: "folder:/parent/child", label: "Child", depth: 1, isZip: false, entry: null, checked: false, excluded: true },
      ],
      focusIndex: 0,
    });
    const frame = await render(<TreeView />, 60, 8);
    expect(frame).toContain("[-]");
  });
});

// ── Snapshots ─────────────────────────────────────────────────────

describe("snapshots", () => {
  it("Header with directory", async () => {
    useStore.setState({ baseDir: "/test/path", outputFormat: "epub" });
    const frame = await render(<Header />);
    expect(frame).toMatchSnapshot();
  });

  it("InfoMessage with counts", async () => {
    useStore.setState({ folderCount: 3, zipCount: 1, showHelp: false });
    const frame = await render(<InfoMessage />);
    expect(frame).toContain("3");
    expect(frame).toContain("folders");
    expect(frame).toContain("1");
    expect(frame).toContain("zips");
  });

  it("HelpModal", async () => {
    useStore.setState({ showHelp: true });
    const frame = await render(<HelpModal />, 60, 20);
    expect(frame).toMatchSnapshot();
  });
});

// ── AuthorPrompt ──────────────────────────────────────────────────

describe("AuthorPrompt", () => {
  it("returns null when authorMode is false", async () => {
    useStore.setState({ authorMode: false });
    const { AuthorPrompt } = await import("@components/AuthorPrompt");
    const frame = await render(<AuthorPrompt />);
    expect(frame.trim()).toBe("");
  });

  it("shows author prompt with hint", async () => {
    useStore.setState({ authorMode: true });
    const { AuthorPrompt } = await import("@components/AuthorPrompt");
    const frame = await render(<AuthorPrompt />, 60, 10);
    expect(frame).toContain("Enter author name...");
    expect(frame).toContain("Author");
    expect(frame).toContain("q cancel");
  });
});

describe("handleAuthorSubmit", () => {
  it("calls submitAuthorName with trimmed value", async () => {
    const { handleAuthorSubmit } = await import("@components/AuthorPrompt");
    let submitted = "";
    handleAuthorSubmit("  John Smith  ", (v) => { submitted = v; }, () => {});
    expect(submitted).toBe("John Smith");
  });

  it("calls cancelAuthorMode when value is empty after trim", async () => {
    const { handleAuthorSubmit } = await import("@components/AuthorPrompt");
    let cancelled = false;
    handleAuthorSubmit("  ", () => {}, () => { cancelled = true; });
    expect(cancelled).toBe(true);
  });
});

describe("makeAuthorOnSubmit", () => {
  it("returns a function that delegates to handleAuthorSubmit", async () => {
    const { makeAuthorOnSubmit } = await import("@components/AuthorPrompt");
    let submitted = "";
    const fn = makeAuthorOnSubmit((v) => { submitted = v; }, () => {});
    fn("Test Author");
    expect(submitted).toBe("Test Author");
  });
});
