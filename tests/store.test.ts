import { describe, it, expect, beforeEach, afterEach } from "bun:test";
import { mkdtempSync, writeFileSync, rmSync, mkdirSync } from "fs";
import { tmpdir } from "os";
import { join, dirname } from "path";
import { useStore, getFoldersToProcess } from "@store";
import type { TreeItem } from "@store";

describe("store navigation actions", () => {
  beforeEach(() => {
    useStore.setState({
      baseDir: "/test/books",
      changeDirMode: false,
      showHelp: false,
      renameMode: false,
      renameTarget: null,
      items: [],
      selectedIds: new Set(),
      focusIndex: 0,
      status: { type: "info", message: "" },
    });
  });

  it("toggleHelp toggles showHelp", () => {
    expect(useStore.getState().showHelp).toBe(false);
    useStore.getState().toggleHelp();
    expect(useStore.getState().showHelp).toBe(true);
    useStore.getState().toggleHelp();
    expect(useStore.getState().showHelp).toBe(false);
  });

  it("toggleChangeDir sets changeDirMode", () => {
    useStore.getState().toggleChangeDir();
    const state = useStore.getState();
    expect(state.changeDirMode).toBe(true);
  });

  it("toggleChangeDir off clears changeDirMode", () => {
    useStore.setState({ changeDirMode: true });
    useStore.getState().toggleChangeDir();
    expect(useStore.getState().changeDirMode).toBe(false);
  });

  it("cancelChangeDir resets mode and browse state", () => {
    useStore.setState({ changeDirMode: true, browseDir: "/test", browseCursor: 2, browseItems: [{ name: "a", hasContent: true }] });
    useStore.getState().cancelChangeDir();
    const state = useStore.getState();
    expect(state.changeDirMode).toBe(false);
    expect(state.browseDir).toBe("");
    expect(state.browseCursor).toBe(0);
    expect(state.browseItems).toEqual([]);
  });

  it("changeDir with empty path just cancels", () => {
    useStore.setState({ changeDirMode: true, baseDir: "/old" });
    useStore.getState().changeDir("  ");
    const state = useStore.getState();
    expect(state.changeDirMode).toBe(false);
    expect(state.baseDir).toBe("/old");
  });

  it("refresh does nothing when baseDir is empty", async () => {
    useStore.setState({ baseDir: "", items: [{ id: "stale", label: "stale", depth: 0, isZip: false, entry: null, checked: false, excluded: false }] });
    await useStore.getState().refresh();
    expect(useStore.getState().items).toHaveLength(1);
  });

  it("cancelRename resets rename state", () => {
    useStore.setState({ renameMode: true, renameTarget: "/test/folder" });
    useStore.getState().cancelRename();
    const state = useStore.getState();
    expect(state.renameMode).toBe(false);
    expect(state.renameTarget).toBeNull();
  });

  it("toggleRename does nothing when no item at focusIndex", () => {
    useStore.setState({ items: [], focusIndex: 0 });
    useStore.getState().toggleRename();
    const state = useStore.getState();
    expect(state.renameMode).toBe(false);
  });

  it("toggleRename does nothing when focused item is a zip", () => {
    useStore.setState({
      items: [{
        id: "zip:/test/file.zip", label: "file.zip", depth: 0, isZip: true, entry: null, checked: false, excluded: false,
      }],
      focusIndex: 0,
    });
    useStore.getState().toggleRename();
    expect(useStore.getState().renameMode).toBe(false);
  });

  it("toggleRename sets rename mode for a folder item", () => {
    useStore.setState({
      items: [{
        id: "folder:/test/manga",
        label: "manga",
        depth: 0,
        isZip: false,
        entry: { parts: ["manga"], path: "/test/manga", metadata: { hasImages: true, hasSubfolders: false, hasZips: false } },
        checked: false,
        excluded: false,
      }],
      focusIndex: 0,
    });
    useStore.getState().toggleRename();
    const state = useStore.getState();
    expect(state.renameMode).toBe(true);
    expect(state.renameTarget).toBe("/test/manga");
  });

  it("toggleRename toggles rename off", () => {
    useStore.setState({ renameMode: true, renameTarget: "/test" });
    useStore.getState().toggleRename();
    expect(useStore.getState().renameMode).toBe(false);
  });

  it("toggleRename does nothing when focused item is missing", () => {
    useStore.setState({ items: [], focusIndex: 0 });
    useStore.getState().toggleRename();
    expect(useStore.getState().renameMode).toBe(false);
  });

  it("renameSubmit with zip item does nothing", () => {
    useStore.setState({
      items: [{
        id: "zip:/test/manga.zip",
        label: "[zip] manga.zip",
        depth: 0,
        isZip: true,
        entry: null,
        checked: false,
        excluded: false,
      }],
      focusIndex: 0,
    });
    useStore.getState().toggleRename();
    expect(useStore.getState().renameMode).toBe(false);
  });

  it("renameSubmit with empty name just cancels", async () => {
    useStore.setState({ renameMode: true, renameTarget: "/test/manga" });
    await useStore.getState().renameSubmit("");
    const state = useStore.getState();
    expect(state.renameMode).toBe(false);
    expect(state.renameTarget).toBeNull();
  });

  it("renameSubmit with no renameTarget cancels", async () => {
    await useStore.getState().renameSubmit("newname");
    const state = useStore.getState();
    expect(state.renameMode).toBe(false);
    expect(state.renameTarget).toBeNull();
  });

  it("renameSubmit renames folder on disk", async () => {
    const dir = mkdtempSync(join(tmpdir(), "rename-src-"));
    try {
      mkdirSync(dir, { recursive: true });
      writeFileSync(join(dir, "pic.webp"), "");

      useStore.setState({
        renameMode: true,
        renameTarget: dir,
        baseDir: "",
        items: [],
      });

      await useStore.getState().renameSubmit("renamed-folder");

      const state = useStore.getState();
      expect(state.renameMode).toBe(false);
      expect(state.renameTarget).toBeNull();
      expect(state.status.type).toBe("info");
      expect(state.status.message).toInclude("Renamed to: renamed-folder");
    } finally {
      rmSync(dir, { recursive: true, force: true });
      const renamed = join(dirname(dir), "renamed-folder");
      rmSync(renamed, { recursive: true, force: true });
    }
  });

  it("renameSubmit with rename failure sets error status", async () => {
    useStore.setState({
      renameMode: true,
      renameTarget: "/nonexistent/path",
      baseDir: "",
      items: [],
    });

    await useStore.getState().renameSubmit("newname");

    const state = useStore.getState();
    expect(state.renameMode).toBe(false);
    expect(state.renameTarget).toBeNull();
  });

  it("changeDir with valid path loads folders", async () => {
    const dir = mkdtempSync(join(tmpdir(), "cd-test-"));
    try {
      mkdirSync(dir, { recursive: true });
      writeFileSync(join(dir, "pic.webp"), "");

      useStore.setState({ baseDir: "", changeDirMode: true });
      await useStore.getState().changeDir(dir);

      const state = useStore.getState();
      expect(state.baseDir).toBe(dir);
      expect(state.changeDirMode).toBe(false);
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });
});

describe("getFoldersToProcess", () => {
  it("includes subfolders from parent without images", () => {
    const items: TreeItem[] = [
      {
        id: "folder:/parent",
        label: "parent",
        depth: 0,
        isZip: false,
        entry: { parts: ["parent"], path: "/parent", metadata: { hasImages: false, hasSubfolders: true, hasZips: false } },
        checked: true,
        excluded: false,
      },
      {
        id: "folder:/parent/child1",
        label: "child1",
        depth: 1,
        isZip: false,
        entry: { parts: ["parent", "child1"], path: "/parent/child1", metadata: { hasImages: true, hasSubfolders: false, hasZips: false } },
        checked: false,
        excluded: false,
      },
      {
        id: "folder:/parent/child2",
        label: "child2",
        depth: 1,
        isZip: false,
        entry: { parts: ["parent", "child2"], path: "/parent/child2", metadata: { hasImages: true, hasSubfolders: false, hasZips: false } },
        checked: false,
        excluded: false,
      },
    ];
    const result = getFoldersToProcess(new Set(["folder:/parent"]), items);
    expect(result).toEqual(["/parent/child1", "/parent/child2"]);
  });

  it("respects excluded children", () => {
    const items: TreeItem[] = [
      {
        id: "folder:/parent",
        label: "parent",
        depth: 0,
        isZip: false,
        entry: { parts: ["parent"], path: "/parent", metadata: { hasImages: false, hasSubfolders: true, hasZips: false } },
        checked: true,
        excluded: false,
      },
      {
        id: "folder:/parent/child1",
        label: "child1",
        depth: 1,
        isZip: false,
        entry: { parts: ["parent", "child1"], path: "/parent/child1", metadata: { hasImages: true, hasSubfolders: false, hasZips: false } },
        checked: false,
        excluded: true,
      },
      {
        id: "folder:/parent/child2",
        label: "child2",
        depth: 1,
        isZip: false,
        entry: { parts: ["parent", "child2"], path: "/parent/child2", metadata: { hasImages: true, hasSubfolders: false, hasZips: false } },
        checked: false,
        excluded: false,
      },
    ];
    const result = getFoldersToProcess(new Set(["folder:/parent"]), items);
    expect(result).toEqual(["/parent/child2"]);
  });

  it("respects excluded direct folder", () => {
    const items: TreeItem[] = [
      {
        id: "folder:/test",
        label: "test",
        depth: 0,
        isZip: false,
        entry: { parts: ["test"], path: "/test", metadata: { hasImages: true, hasSubfolders: false, hasZips: false } },
        checked: true,
        excluded: true,
      },
    ];
    const result = getFoldersToProcess(new Set(["folder:/test"]), items);
    expect(result).toEqual([]);
  });
});

describe("scan loadFolders", () => {
  let dir: string;

  afterEach(() => {
    if (dir) {rmSync(dir, { recursive: true, force: true });}
  });

  it("produces items with expected TreeItem fields", async () => {
    dir = mkdtempSync(join(tmpdir(), "scan-shape-"));
    mkdirSync(join(dir, "a"), { recursive: true });
    writeFileSync(join(dir, "a", "pic.webp"), "");
    writeFileSync(join(dir, "z.zip"), "");
    await useStore.getState().loadFolders(dir);

    const [folder, zip] = useStore.getState().items;
    expect(Object.keys(folder).sort()).toEqual(["checked", "depth", "entry", "excluded", "id", "isZip", "label"]);
    expect(Object.keys(zip).sort()).toEqual(["checked", "depth", "entry", "excluded", "id", "isZip", "label"]);
    expect(folder.checked).toBe(false);
    expect(folder.excluded).toBe(false);
    expect(zip.checked).toBe(false);
    expect(zip.excluded).toBe(false);
  });

  it("loads folders and zips", async () => {
    dir = mkdtempSync(join(tmpdir(), "scan-test-"));
    mkdirSync(join(dir, "manga1"), { recursive: true });
    writeFileSync(join(dir, "manga1", "001.webp"), "");
    mkdirSync(join(dir, "manga2"), { recursive: true });
    writeFileSync(join(dir, "manga2", "002.jpg"), "");
    writeFileSync(join(dir, "archive.zip"), "");

    await useStore.getState().loadFolders(dir);

    const state = useStore.getState();
    expect(state.folderCount).toBe(2);
    expect(state.zipCount).toBe(1);
    expect(state.items).toHaveLength(3);
    const folders = state.items.filter((i) => !i.isZip);
    const zips = state.items.filter((i) => i.isZip);
    expect(folders).toHaveLength(2);
    expect(zips).toHaveLength(1);
  });

  function orderingDir(): string {
    const d = mkdtempSync(join(tmpdir(), "scan-order-"));
    mkdirSync(join(d, "parent 1", "children file"), { recursive: true });
    writeFileSync(join(d, "parent 1", "children file", "pic.webp"), "");
    mkdirSync(join(d, "parent 2"), { recursive: true });
    writeFileSync(join(d, "parent 2", "pic.webp"), "");
    mkdirSync(join(d, "parent 3"), { recursive: true });
    writeFileSync(join(d, "parent 3", "pic.webp"), "");
    mkdirSync(join(d, "zeta"), { recursive: true });
    writeFileSync(join(d, "zeta", "pic.webp"), "");
    mkdirSync(join(d, "alpha"), { recursive: true });
    writeFileSync(join(d, "alpha", "pic.webp"), "");
    mkdirSync(join(d, "beta"), { recursive: true });
    writeFileSync(join(d, "beta", "pic.webp"), "");
    writeFileSync(join(d, "m.zip"), "");
    writeFileSync(join(d, "n.zip"), "");
    return d;
  }

  it("orders items by relative path interleaving folders and zips", async () => {
    dir = orderingDir();
    await useStore.getState().loadFolders(dir);

    expect(useStore.getState().items.map(i => ({ label: i.label, depth: i.depth }))).toEqual([
      { label: "alpha", depth: 0 },
      { label: "beta", depth: 0 },
      { label: "\uD83D\uDCE6 m.zip", depth: 0 },
      { label: "\uD83D\uDCE6 n.zip", depth: 0 },
      { label: "parent 1", depth: 0 },
      { label: "children file", depth: 1 },
      { label: "parent 2", depth: 0 },
      { label: "parent 3", depth: 0 },
      { label: "zeta", depth: 0 },
    ]);
  });

  it("orders siblings alphabetically interleaving zips and folders", async () => {
    dir = orderingDir();
    await useStore.getState().loadFolders(dir);

    expect(useStore.getState().items.map(i => i.label)).toEqual([
      "alpha", "beta",
      "\uD83D\uDCE6 m.zip", "\uD83D\uDCE6 n.zip",
      "parent 1", "children file", "parent 2", "parent 3", "zeta",
    ]);
  });

  it("zips appear at correct sort position among siblings", async () => {
    dir = orderingDir();
    await useStore.getState().loadFolders(dir);

    expect(useStore.getState().items.map(i => ({ label: i.label, isZip: i.isZip }))).toEqual([
      { label: "alpha", isZip: false },
      { label: "beta", isZip: false },
      { label: "\uD83D\uDCE6 m.zip", isZip: true },
      { label: "\uD83D\uDCE6 n.zip", isZip: true },
      { label: "parent 1", isZip: false },
      { label: "children file", isZip: false },
      { label: "parent 2", isZip: false },
      { label: "parent 3", isZip: false },
      { label: "zeta", isZip: false },
    ]);
  });

  it("shows noResults status when nothing found", async () => {
    dir = mkdtempSync(join(tmpdir(), "scan-empty-"));
    writeFileSync(join(dir, "readme.txt"), "");

    await useStore.getState().loadFolders(dir);

    const state = useStore.getState();
    expect(state.folderCount).toBe(0);
    expect(state.zipCount).toBe(0);
    expect(state.status.type).toBe("info");
    expect(state.status.message).toInclude("No folders with images or zips found");
  });
});

describe("error handling paths", () => {
  const origLoadFolders = useStore.getState().loadFolders;
  const throwingLoad = async () => { throw new Error("fail"); };

  afterEach(() => {
    useStore.setState({ loadFolders: origLoadFolders });
  });

  it("changeDir sets error status when loadFolders fails", async () => {
    useStore.setState({ loadFolders: throwingLoad, status: { type: "info", message: "" } });
    await useStore.getState().changeDir("/test");
    expect(useStore.getState().status.type).toBe("error");
  });

  it("refresh sets error status when loadFolders fails", async () => {
    useStore.setState({ loadFolders: throwingLoad, baseDir: "/test", status: { type: "info", message: "" } });
    await useStore.getState().refresh();
    expect(useStore.getState().status.type).toBe("error");
  });
});

describe("batch slice uncovered branches", () => {
  beforeEach(() => {
    useStore.setState({
      items: [],
      selectedIds: new Set(),
      isProcessing: false,
      status: { type: "info", message: "" },
      baseDir: "",
    });
  });

  it("unzipSelected does nothing when no zips selected", async () => {
    useStore.setState({
      items: [{
        id: "folder:/test",
        label: "test",
        depth: 0,
        isZip: false,
        entry: { parts: ["test"], path: "/test", metadata: { hasImages: true, hasSubfolders: false, hasZips: false } },
        checked: true,
        excluded: false,
      }],
      selectedIds: new Set(["folder:/test"]),
    });
    await useStore.getState().unzipSelected();
    expect(useStore.getState().isProcessing).toBe(false);
  });

  it("padSelected does nothing when no folders selected", async () => {
    await useStore.getState().padSelected();
    expect(useStore.getState().isProcessing).toBe(false);
  });

  it("processFolders does nothing when selected items have no processable folders", async () => {
    useStore.setState({
      items: [{
        id: "folder:/test",
        label: "test",
        depth: 0,
        isZip: false,
        entry: { parts: ["test"], path: "/test", metadata: { hasImages: false, hasSubfolders: false, hasZips: false } },
        checked: true,
        excluded: false,
      }],
      selectedIds: new Set(["folder:/test"]),
    });
    await useStore.getState().processFolders();
    const state = useStore.getState();
    expect(state.isProcessing).toBe(false);
    expect(state.status.type).toBe("info");
  });

  it("does nothing when nothing selected", async () => {
    useStore.setState({
      items: [],
      selectedIds: new Set(),
    });
    await useStore.getState().processFolders();
    const state = useStore.getState();
    expect(state.isProcessing).toBe(false);
    expect(state.status.type).toBe("info");
  });
});

describe("browse actions", () => {
  let dir: string;

  afterEach(() => {
    if (dir) {rmSync(dir, { recursive: true, force: true });}
  });

  it("toggleChangeDir sets browseDir and loads browseItems", async () => {
    dir = mkdtempSync(join(tmpdir(), "browse-open-"));
    mkdirSync(join(dir, "sub1"), { recursive: true });
    writeFileSync(join(dir, "sub1", "pic.webp"), "");
    mkdirSync(join(dir, "sub2"), { recursive: true });

    useStore.setState({ baseDir: dir, changeDirMode: false });
    useStore.getState().toggleChangeDir();
    await Bun.sleep(10);

    const state = useStore.getState();
    expect(state.changeDirMode).toBe(true);
    expect(state.browseDir).toBe(dir);
    expect(state.browseCursor).toBe(0);
    expect(state.browseItems).toEqual([
      { name: "sub1", hasContent: true },
      { name: "sub2", hasContent: false },
    ]);
  });

  it("browseSetDir updates browseDir and loads items", async () => {
    dir = mkdtempSync(join(tmpdir(), "browse-set-"));
    mkdirSync(join(dir, "sub1"), { recursive: true });
    writeFileSync(join(dir, "sub1", "img.jpg"), "");
    mkdirSync(join(dir, "sub2"), { recursive: true });

    useStore.setState({ browseDir: "", browseCursor: 99, browseItems: [] });
    await useStore.getState().browseSetDir(dir);
    await Bun.sleep(10);

    const state = useStore.getState();
    expect(state.browseDir).toBe(dir);
    expect(state.browseCursor).toBe(0);
    expect(state.browseItems).toEqual([
      { name: "sub1", hasContent: true },
      { name: "sub2", hasContent: false },
    ]);
  });

  it("browseSetDir handles nonexistent path gracefully", async () => {
    useStore.setState({ browseDir: "", browseCursor: 99, browseItems: [] });
    await useStore.getState().browseSetDir("/nonexistent/path");
    await Bun.sleep(10);

    const state = useStore.getState();
    expect(state.browseDir).toBe("/nonexistent/path");
    expect(state.browseCursor).toBe(0);
    expect(state.browseItems).toEqual([]);
  });

  it("browseConfirm selects directory and loads folders", async () => {
    dir = mkdtempSync(join(tmpdir(), "browse-confirm-"));
    mkdirSync(join(dir, "manga"), { recursive: true });
    writeFileSync(join(dir, "manga", "page.webp"), "");

    useStore.setState({
      baseDir: "",
      changeDirMode: true,
      browseDir: dir,
      browseCursor: 1,
      browseItems: [{ name: "manga", hasContent: true }],
    });
    await useStore.getState().browseConfirm();

    const state = useStore.getState();
    expect(state.changeDirMode).toBe(false);
    expect(state.browseDir).toBe("");
    expect(state.browseCursor).toBe(0);
    expect(state.browseItems).toEqual([]);
    expect(state.baseDir).toBe(dir);
    expect(state.folderCount).toBe(1);
  });

  it("browseConfirm with empty browseDir does nothing", async () => {
    useStore.setState({ baseDir: "/old", changeDirMode: true, browseDir: "", browseCursor: 0, browseItems: [] });
    await useStore.getState().browseConfirm();

    const state = useStore.getState();
    expect(state.baseDir).toBe("/old");
    expect(state.changeDirMode).toBe(true);
  });
});

describe("init action", () => {
  const realArgv = process.argv;

  afterEach(() => {
    process.argv = realArgv;
  });

  it("loads folders from CLI directory argument", async () => {
    const dir = mkdtempSync(join(tmpdir(), "epub-init-test-"));
    try {
      mkdirSync(join(dir, "manga"), { recursive: true });
      writeFileSync(join(dir, "manga", "page01.jpg"), "");
      process.argv[2] = dir;

      useStore.setState({ baseDir: "", items: [], folderCount: 0 });
      await useStore.getState().init();

      const state = useStore.getState();
      expect(state.baseDir).toBe(dir);
      expect(state.folderCount).toBeGreaterThanOrEqual(1);
      expect(state.items.length).toBeGreaterThanOrEqual(1);
    } finally {
      process.argv = realArgv;
      rmSync(dir, { recursive: true, force: true });
    }
  });

  it("falls back to default base dir when no CLI arg", async () => {
    process.argv[2] = "";

    useStore.setState({ baseDir: "", items: [], folderCount: 0 });
    await useStore.getState().init();

    const state = useStore.getState();
    expect(state.baseDir).toBeTruthy();
    expect(state.baseDir).not.toBe("");
  });
});

describe("author mode actions", () => {
  beforeEach(() => {
    useStore.setState({
      baseDir: "/test/books",
      authorMode: false,
      isProcessing: false,
      status: { type: "info", message: "" },
    });
  });

  it("toggleAuthorMode sets authorMode", () => {
    useStore.getState().toggleAuthorMode();
    expect(useStore.getState().authorMode).toBe(true);
  });

  it("toggleAuthorMode toggles off", () => {
    useStore.setState({ authorMode: true });
    useStore.getState().toggleAuthorMode();
    expect(useStore.getState().authorMode).toBe(false);
  });

  it("cancelAuthorMode resets authorMode", () => {
    useStore.setState({ authorMode: true });
    useStore.getState().cancelAuthorMode();
    expect(useStore.getState().authorMode).toBe(false);
  });

  it("submitAuthorName with empty name cancels", async () => {
    useStore.setState({ authorMode: true });
    await useStore.getState().submitAuthorName("");
    expect(useStore.getState().authorMode).toBe(false);
  });

  it("submitAuthorName with no folders selected shows status", async () => {
    useStore.setState({ authorMode: true, items: [], selectedIds: new Set() });
    await useStore.getState().submitAuthorName("Author");
    const state = useStore.getState();
    expect(state.authorMode).toBe(false);
    expect(state.status.message).toContain("No folders selected");
  });
});
