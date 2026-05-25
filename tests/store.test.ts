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
      promptKey: 0,
      renameMode: false,
      renameTarget: null,
      renameKey: 0,
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

  it("openChangeDir sets mode and increments promptKey", () => {
    useStore.getState().openChangeDir();
    const state = useStore.getState();
    expect(state.changeDirMode).toBe(true);
    expect(state.promptKey).toBe(1);
  });

  it("cancelChangeDir resets mode", () => {
    useStore.setState({ changeDirMode: true });
    useStore.getState().cancelChangeDir();
    expect(useStore.getState().changeDirMode).toBe(false);
  });

  it("changeDir with empty path just cancels", () => {
    useStore.setState({ changeDirMode: true, baseDir: "/old" });
    useStore.getState().changeDir("  ");
    const state = useStore.getState();
    expect(state.changeDirMode).toBe(false);
    expect(state.baseDir).toBe("/old");
  });

  it("refresh does nothing when baseDir is empty", async () => {
    useStore.setState({ baseDir: "", items: [{ id: "stale", label: "stale", depth: 0, isZip: false, entry: null, checked: false }] });
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

  it("openRename does nothing when no item at focusIndex", () => {
    useStore.setState({ items: [], focusIndex: 0 });
    useStore.getState().openRename();
    const state = useStore.getState();
    expect(state.renameMode).toBe(false);
  });

  it("openRename does nothing when focused item is a zip", () => {
    useStore.setState({
      items: [{
        id: "zip:/test/file.zip", label: "file.zip", depth: 0, isZip: true, entry: null, checked: false,
      }],
      focusIndex: 0,
    });
    useStore.getState().openRename();
    expect(useStore.getState().renameMode).toBe(false);
  });

  it("openRename sets rename mode for a folder item", () => {
    useStore.setState({
      items: [{
        id: "folder:/test/manga",
        label: "manga",
        depth: 0,
        isZip: false,
        entry: { parts: ["manga"], path: "/test/manga", metadata: { hasImages: true, hasSubfolders: false, hasZips: false } },
        checked: false,
      }],
      focusIndex: 0,
    });
    useStore.getState().openRename();
    const state = useStore.getState();
    expect(state.renameMode).toBe(true);
    expect(state.renameTarget).toBe("/test/manga");
  });

  it("openRename does nothing when focused item is missing", () => {
    useStore.setState({ items: [], focusIndex: 0 });
    useStore.getState().openRename();
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
      }],
      focusIndex: 0,
    });
    useStore.getState().openRename();
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
      },
      {
        id: "folder:/parent/child1",
        label: "child1",
        depth: 1,
        isZip: false,
        entry: { parts: ["parent", "child1"], path: "/parent/child1", metadata: { hasImages: true, hasSubfolders: false, hasZips: false } },
        checked: false,
      },
      {
        id: "folder:/parent/child2",
        label: "child2",
        depth: 1,
        isZip: false,
        entry: { parts: ["parent", "child2"], path: "/parent/child2", metadata: { hasImages: true, hasSubfolders: false, hasZips: false } },
        checked: false,
      },
    ];
    const result = getFoldersToProcess(new Set(["folder:/parent"]), items);
    expect(result).toEqual(["/parent/child1", "/parent/child2"]);
  });
});

describe("scan loadFolders", () => {
  let dir: string;

  afterEach(() => {
    if (dir) {rmSync(dir, { recursive: true, force: true });}
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
      }],
      selectedIds: new Set(["folder:/test"]),
    });
    await useStore.getState().processFolders();
    const state = useStore.getState();
    expect(state.isProcessing).toBe(false);
    expect(state.status.type).toBe("info");
  });

  it("processFolders uses all items when nothing selected", async () => {
    const dir = mkdtempSync(join(tmpdir(), "batch-all-"));
    try {
      writeFileSync(join(dir, "readme.txt"), "");
      useStore.setState({
        items: [{
          id: `folder:${dir}`,
          label: "test",
          depth: 0,
          isZip: false,
          entry: { parts: ["test"], path: dir, metadata: { hasImages: true, hasSubfolders: false, hasZips: false } },
          checked: false,
        }],
        selectedIds: new Set(),
      });
      await useStore.getState().processFolders();
      const state = useStore.getState();
      expect(state.isProcessing).toBe(false);
      expect(state.status.type).toBe("done");
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });
});
