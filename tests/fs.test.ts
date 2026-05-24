import { describe, it, expect, afterEach } from "bun:test";
import { mkdtempSync, mkdirSync, writeFileSync, readdirSync, rmdirSync, rmSync } from "fs";
import { tmpdir } from "os";
import { join, dirname } from "path";
import {
  findFoldersWithImages,
  organizeFoldersByHierarchy,
  findZipFiles,
  getSubfoldersWithImages,
  findDefaultBaseDir,
} from "../src/utils/fs";

function createTestDir(structure: Record<string, string | null>): string {
  const base = mkdtempSync(join(tmpdir(), "epub-test-"));
  for (const [relPath, content] of Object.entries(structure)) {
    const fullPath = join(base, relPath);
    if (content === null) {
      mkdirSync(fullPath, { recursive: true });
    } else {
      mkdirSync(dirname(fullPath), { recursive: true });
      writeFileSync(fullPath, content);
    }
  }
  return base;
}

function cleanup(base: string) {
  try {
    for (const entry of readdirSync(base)) {
      const full = join(base, entry);
      rmSync(full, { recursive: true, force: true });
    }
    rmdirSync(base);
  } catch {
    // ignore
  }
}

describe("findFoldersWithImages", () => {
  let base: string;

  afterEach(() => {
    if (base) {cleanup(base);}
  });

  it("returns empty for nonexistent directory", async () => {
    const result = await findFoldersWithImages("/nonexistent/path");
    expect(result.foldersWithImages).toEqual([]);
    expect(result.allFolders.size).toBe(0);
  });

  it("finds folders with images", async () => {
    base = createTestDir({
      "folder1/img1.jpg": "",
      "folder2/sub/img2.png": "",
      "folder3/readme.txt": "hello",
    });
    const { foldersWithImages, allFolders } = await findFoldersWithImages(base);

    expect(foldersWithImages.length).toBe(2);
    expect(foldersWithImages.some((p) => p.endsWith("folder1"))).toBe(true);
    expect(foldersWithImages.some((p) => p.endsWith("sub"))).toBe(true);

    // folder1 and sub have images
    expect(Array.from(allFolders.values()).filter((m) => m.hasImages).length).toBe(2);
    // folder2 is an ancestor of sub with images
    expect(
      Array.from(allFolders.entries()).some(([p, m]) => p.endsWith("folder2") && m.hasSubfolders)
    ).toBe(true);
  });

  it("marks zip presence", async () => {
    base = createTestDir({
      "folder1/archive.zip": "",
      "folder1/img.jpg": "",
    });
    const { allFolders } = await findFoldersWithImages(base);
    const folder1Meta = Array.from(allFolders.entries()).find(([p]) => p.endsWith("folder1"));
    expect(folder1Meta?.[1].hasZips).toBe(true);
    expect(folder1Meta?.[1].hasImages).toBe(true);
  });
});

describe("organizeFoldersByHierarchy", () => {
  it("organizes folders into hierarchical entries", () => {
    const allFolders = new Map([
      ["/base/folder1", { hasImages: true, hasSubfolders: false, hasZips: false }],
      ["/base/folder2", { hasImages: false, hasSubfolders: true, hasZips: false }],
    ]);
    const result = organizeFoldersByHierarchy(allFolders, "/base");

    expect(result.has("folder1")).toBe(true);
    expect(result.has("folder2")).toBe(true);
    expect(result.get("folder1")?.parts).toEqual(["folder1"]);
    expect(result.get("folder2")?.metadata.hasSubfolders).toBe(true);
  });
});

describe("findZipFiles", () => {
  let base: string;

  afterEach(() => {
    if (base) {cleanup(base);}
  });

  it("finds zip files recursively", async () => {
    base = createTestDir({
      "a.zip": "",
      "sub/b.zip": "",
      "sub/c.txt": "",
    });
    const zips = await findZipFiles(base);
    expect(zips.length).toBe(2);
    expect(zips.some((z) => z.endsWith("a.zip"))).toBe(true);
    expect(zips.some((z) => z.endsWith("b.zip"))).toBe(true);
  });
});

describe("getSubfoldersWithImages", () => {
  it("returns subfolders with images", () => {
    const folders = ["/a/b/c", "/a/b/d", "/a/x"];
    expect(getSubfoldersWithImages("/a/b", folders)).toEqual(["/a/b/c", "/a/b/d"]);
    expect(getSubfoldersWithImages("/a", folders)).toEqual(["/a/b/c", "/a/b/d", "/a/x"]);
    expect(getSubfoldersWithImages("/a/b/c", folders)).toEqual([]);
  });

  it("handles empty list", () => {
    expect(getSubfoldersWithImages("/a", [])).toEqual([]);
  });

  it("handles exact match", () => {
    expect(getSubfoldersWithImages("/a/b/c", ["/a/b/c"])).toEqual([]);
  });
});

describe("findDefaultBaseDir", () => {
  it("returns ~/Downloads", async () => {
    const dir = await findDefaultBaseDir();
    expect(dir).toInclude("Downloads");
  });
});
