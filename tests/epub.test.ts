import { describe, it, expect, afterEach } from "bun:test";
import { mkdtempSync, writeFileSync, readFileSync, existsSync, rmSync } from "fs";
import { tmpdir } from "os";
import { join, basename } from "path";
import sharp from "sharp";
import JSZip from "jszip";
import { createEpubFromFolder } from "../src/utils/epub";

function cleanup(base: string) {
  try {
    rmSync(base, { recursive: true, force: true });
  } catch {
    // ignore
  }
}

async function createTestImage(path: string, color: string) {
  const [r, g, b] = color === "red" ? [255, 0, 0] : color === "green" ? [0, 255, 0] : [0, 0, 255];
  const buf = await sharp({ create: { width: 10, height: 10, channels: 3, background: { r, g, b } } })
    .jpeg()
    .toBuffer();
  writeFileSync(path, buf);
}

describe("createEpubFromFolder", () => {
  let base: string;
  let outputDir: string;

  afterEach(() => {
    if (base) {cleanup(base);}
    if (outputDir) {cleanup(outputDir);}
  });

  it("returns error for nonexistent directory", async () => {
    const result = await createEpubFromFolder("/nonexistent/path");
    expect(result.success).toBe(false);
    expect(result.message).toInclude("Error reading folder");
  });

  it("returns error when no images found", async () => {
    base = mkdtempSync(join(tmpdir(), "epub-test-"));
    writeFileSync(join(base, "readme.txt"), "hello");
    const result = await createEpubFromFolder(base);
    expect(result.success).toBe(false);
    expect(result.message).toInclude("No images found");
  });

  it("creates an EPUB from images", async () => {
    base = mkdtempSync(join(tmpdir(), "epub-test-"));
    outputDir = mkdtempSync(join(tmpdir(), "epub-out-"));

    await createTestImage(join(base, "1.jpg"), "red");
    await createTestImage(join(base, "2.png"), "green");
    await createTestImage(join(base, "3.webp"), "blue");

    const result = await createEpubFromFolder(base, outputDir);
    expect(result.success).toBe(true);
    expect(result.message).toInclude("EPUB created");

    const epubPath = join(outputDir, `${basename(base)}.epub`);
    expect(existsSync(epubPath)).toBe(true);

    // Verify it's a valid zip by reading first bytes
    const header = readFileSync(epubPath).slice(0, 4);
    expect(header.toString("hex")).toBe("504b0304"); // ZIP magic number
  });

  it("handles webp and png conversion", async () => {
    base = mkdtempSync(join(tmpdir(), "epub-test-"));
    outputDir = mkdtempSync(join(tmpdir(), "epub-out-"));

    // Create a tiny webp
    const webpBuf = await sharp({ create: { width: 10, height: 10, channels: 3, background: { r: 255, g: 0, b: 0 } } })
      .webp()
      .toBuffer();
    writeFileSync(join(base, "cover.webp"), webpBuf);

    // Create a tiny png
    const pngBuf = await sharp({ create: { width: 10, height: 10, channels: 3, background: { r: 0, g: 255, b: 0 } } })
      .png()
      .toBuffer();
    writeFileSync(join(base, "page.png"), pngBuf);

    const result = await createEpubFromFolder(base, outputDir);
    expect(result.success).toBe(true);

    const epubPath = join(outputDir, `${basename(base)}.epub`);
    expect(existsSync(epubPath)).toBe(true);
  });

  it("includes a cover image inside the EPUB", async () => {
    base = mkdtempSync(join(tmpdir(), "epub-test-"));
    outputDir = mkdtempSync(join(tmpdir(), "epub-out-"));

    await createTestImage(join(base, "1.jpg"), "red");
    await createTestImage(join(base, "2.jpg"), "green");

    const result = await createEpubFromFolder(base, outputDir);
    expect(result.success).toBe(true);

    const epubPath = join(outputDir, `${basename(base)}.epub`);
    const epubBuffer = readFileSync(epubPath);
    const zip = await JSZip.loadAsync(epubBuffer);

    // Cover image must exist inside the zip
    const coverFile = zip.file("OEBPS/images/cover.jpg");
    expect(coverFile).not.toBeNull();
    const coverBuffer = await coverFile!.async("nodebuffer");
    expect(coverBuffer.length).toBeGreaterThan(0);

    // Cover XHTML page must reference it
    const coverXhtml = await zip.file("OEBPS/cover.xhtml")!.async("string");
    expect(coverXhtml).toInclude("images/cover.jpg");

    // OPF manifest must declare cover-image property
    const opf = await zip.file("OEBPS/content.opf")!.async("string");
    expect(opf).toInclude('properties="cover-image"');
    expect(opf).toInclude('id="cover-image"');
    expect(opf).toInclude('href="images/cover.jpg"');
  });
});
