import { afterEach, describe, expect, it } from "bun:test";
import { existsSync, mkdtempSync, writeFileSync, rmSync } from "fs";
import JSZip from "jszip";
import { tmpdir } from "os";
import { join } from "path";

import { unzipFile } from "../src/utils/zip";

function cleanup(base: string) {
  try {
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

/** Create a zip with UTF-8 Japanese filenames but WITHOUT the UTF-8 language
 *  encoding flag set. This simulates legacy Windows zips that write UTF-8
 *  bytes but don't set bit 11 of the general purpose bit flag.
 */
async function createZipWithNoUtf8Flag(
  path: string,
  files: Record<string, string>,
) {
  const zip = new JSZip();
  for (const [name, content] of Object.entries(files)) {
    zip.file(name, content);
  }
  const buf = await zip.generateAsync({ type: "nodebuffer" });

  // Patch all local file headers (signature 0x504b0304) and central directory
  // headers (signature 0x504b0102) to clear the UTF-8 flag (0x800).
  for (let i = 0; i < buf.length - 4; i++) {
    const sig = buf.readUInt32LE(i);
    if (sig === 0x04034b50) {
      // local file header: flag at offset +6
      const flag = buf.readUInt16LE(i + 6);
      buf.writeUInt16LE(flag & ~0x800, i + 6);
    }
    if (sig === 0x02014b50) {
      // central directory header: flag at offset +8
      const flag = buf.readUInt16LE(i + 8);
      buf.writeUInt16LE(flag & ~0x800, i + 8);
    }
  }
  writeFileSync(path, buf);
}

describe("unzipFile", () => {
  let base: string;

  afterEach(() => {
    if (base) {cleanup(base);}
  });

  it("extracts a valid zip file", async () => {
    base = mkdtempSync(join(tmpdir(), "zip-test-"));
    const zipPath = join(base, "archive.zip");
    await createZip(zipPath, {
      "file1.txt": "hello",
      "sub/file2.txt": "world",
    });

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

  it("extracts UTF-8 Japanese filenames with UTF-8 flag set", async () => {
    base = mkdtempSync(join(tmpdir(), "zip-test-"));
    const zipPath = join(base, "jp-utf8flag.zip");
    // Include a file at top level to prevent flatten from kicking in
    await createZip(zipPath, {
      "readme.txt": "hello",
      "日本語の漫画/": "",
      "日本語の漫画/001.jpg": "img1",
    });

    const result = await unzipFile(zipPath);
    expect(result.success).toBe(true);

    const extractDir = join(base, "jp-utf8flag");
    expect(existsSync(join(extractDir, "readme.txt"))).toBe(true);
    expect(existsSync(join(extractDir, "日本語の漫画", "001.jpg"))).toBe(true);
  });

  it("extracts Japanese filenames without UTF-8 flag (legacy Windows zips)", async () => {
    base = mkdtempSync(join(tmpdir(), "zip-test-"));
    const zipPath = join(base, "jp-noutf8flag.zip");
    // Include a file at top level to prevent flatten from kicking in
    await createZipWithNoUtf8Flag(zipPath, {
      "readme.txt": "hello",
      "日本語の漫画/": "",
      "日本語の漫画/001.jpg": "img1",
    });

    const result = await unzipFile(zipPath);
    expect(result.success).toBe(true);

    const extractDir = join(base, "jp-noutf8flag");
    expect(existsSync(join(extractDir, "readme.txt"))).toBe(true);
    // Without our fix (decodeFilename), this would produce garbled filenames
    expect(existsSync(join(extractDir, "日本語の漫画", "001.jpg"))).toBe(true);
  });
});
