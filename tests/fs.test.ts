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
} from "@/utils/fs";

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
    expect(result).toEqual({
      foldersWithImages: [],
      allFolders: new Map(),
    });
  });

  it("finds folders with images", async () => {
    base = createTestDir({
      "folder1/img1.jpg": "",
      "folder2/sub/img2.png": "",
      "folder3/readme.txt": "hello",
    });
    const result = await findFoldersWithImages(base);

    expect(result).toEqual({
      foldersWithImages: expect.arrayContaining([
        expect.stringMatching(/folder1$/),
        expect.stringMatching(/sub$/),
      ]),
      allFolders: expect.any(Map),
    });
    expect(result.foldersWithImages).toHaveLength(2);

    const allFolders = result.allFolders;
    const folder1Meta = Array.from(allFolders.entries()).find(([p]) => p.endsWith("folder1"))?.[1];
    expect(folder1Meta).toEqual({
      hasImages: true,
      hasSubfolders: false,
      hasZips: false,
    });

    const subMeta = Array.from(allFolders.entries()).find(([p]) => p.endsWith("sub"))?.[1];
    expect(subMeta).toEqual({
      hasImages: true,
      hasSubfolders: false,
      hasZips: false,
    });

    const folder2Meta = Array.from(allFolders.entries()).find(([p]) => p.endsWith("folder2"))?.[1];
    expect(folder2Meta).toEqual({
      hasImages: false,
      hasSubfolders: true,
      hasZips: false,
    });
  });

  it("marks zip presence", async () => {
    base = createTestDir({
      "folder1/archive.zip": "",
      "folder1/img.jpg": "",
    });
    const result = await findFoldersWithImages(base);
    const folder1Meta = Array.from(result.allFolders.entries()).find(([p]) => p.endsWith("folder1"));
    expect(folder1Meta?.[1]).toEqual({
      hasImages: true,
      hasSubfolders: false,
      hasZips: true,
    });
  });
});

describe("organizeFoldersByHierarchy", () => {
  it("organizes folders into hierarchical entries", () => {
    const allFolders = new Map([
      ["/base/folder1", { hasImages: true, hasSubfolders: false, hasZips: false }],
      ["/base/folder2", { hasImages: false, hasSubfolders: true, hasZips: false }],
    ]);
    const result = organizeFoldersByHierarchy(allFolders, "/base");

    expect(result).toEqual(new Map([
      ["folder1", { parts: ["folder1"], path: "/base/folder1", metadata: { hasImages: true, hasSubfolders: false, hasZips: false } }],
      ["folder2", { parts: ["folder2"], path: "/base/folder2", metadata: { hasImages: false, hasSubfolders: true, hasZips: false } }],
    ]));
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
    expect(zips).toEqual(
      expect.arrayContaining([
        expect.stringMatching(/a\.zip$/),
        expect.stringMatching(/b\.zip$/),
      ]),
    );
    expect(zips).toHaveLength(2);
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
