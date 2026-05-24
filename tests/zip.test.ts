import { describe, it, expect, afterEach } from "bun:test";
import { mkdtempSync, writeFileSync, existsSync, readdirSync } from "fs";
import { tmpdir } from "os";
import { join } from "path";
import JSZip from "jszip";
import { unzipFile } from "../src/utils/zip";

function cleanup(base: string) {
  try {
    const { rmSync } = require("fs");
    rmSync(base, { recursive: true, force: true });
  } catch {
    // ignore
  }
}

async function createZip(path: string, files: Record<string, string>) {
  const zip = new JSZip();
  for (const [name, content] of Object.entries(files)) {
    zip.file(name, content);
  }
  const buf = await zip.generateAsync({ type: "nodebuffer" });
  writeFileSync(path, buf);
}

describe("unzipFile", () => {
  let base: string;

  afterEach(() => {
    if (base) cleanup(base);
  });

  it("extracts a valid zip file", async () => {
    base = mkdtempSync(join(tmpdir(), "zip-test-"));
    const zipPath = join(base, "archive.zip");
    await createZip(zipPath, { "file1.txt": "hello", "sub/file2.txt": "world" });

    const result = await unzipFile(zipPath);
    expect(result.success).toBe(true);
    expect(result.message).toInclude("Extracted");

    const extractDir = join(base, "archive");
    expect(existsSync(extractDir)).toBe(true);
    expect(existsSync(join(extractDir, "file1.txt"))).toBe(true);
    expect(existsSync(join(extractDir, "sub", "file2.txt"))).toBe(true);
  });

  it("fails for invalid zip file", async () => {
    base = mkdtempSync(join(tmpdir(), "zip-test-"));
    const zipPath = join(base, "bad.zip");
    writeFileSync(zipPath, "this is not a zip file");

    const result = await unzipFile(zipPath);
    expect(result.success).toBe(false);
    expect(result.message).toInclude("Bad zip file");
  });

  it("fails for nonexistent file", async () => {
    const result = await unzipFile("/nonexistent/file.zip");
    expect(result.success).toBe(false);
  });

  it("strips common top-level directory to avoid double-nesting", async () => {
    base = mkdtempSync(join(tmpdir(), "zip-test-"));
    const zipPath = join(base, "manga.zip");
    // Zip created by zipping a folder: entries include the folder name as prefix
    await createZip(zipPath, {
      "manga/": "", // directory entry
      "manga/page1.jpg": "img1",
      "manga/page2.jpg": "img2",
      "manga/ch1/": "", // nested directory entry
      "manga/ch1/page3.jpg": "img3",
    });

    const result = await unzipFile(zipPath);
    expect(result.success).toBe(true);

    const extractDir = join(base, "manga");
    expect(existsSync(extractDir)).toBe(true);
    // Files should be directly under extractDir, NOT under extractDir/manga/
    expect(existsSync(join(extractDir, "page1.jpg"))).toBe(true);
    expect(existsSync(join(extractDir, "page2.jpg"))).toBe(true);
    expect(existsSync(join(extractDir, "ch1", "page3.jpg"))).toBe(true);
    // Should NOT have double-nested manga/manga/
    expect(existsSync(join(extractDir, "manga"))).toBe(false);
  });

  it("does not strip when zip has flat files", async () => {
    base = mkdtempSync(join(tmpdir(), "zip-test-"));
    const zipPath = join(base, "flat.zip");
    await createZip(zipPath, { "file1.txt": "hello", "file2.txt": "world" });

    const result = await unzipFile(zipPath);
    expect(result.success).toBe(true);

    const extractDir = join(base, "flat");
    expect(existsSync(join(extractDir, "file1.txt"))).toBe(true);
    expect(existsSync(join(extractDir, "file2.txt"))).toBe(true);
  });
});
