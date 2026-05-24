import { describe, it, expect, afterEach } from "bun:test";
import { mkdtempSync, writeFileSync, readdirSync, rmSync } from "fs";
import { tmpdir } from "os";
import { join } from "path";
import { extractNumericPrefix, padImageFilenames } from "../src/utils/pad";

function createTestDir(files: string[]): string {
  const base = mkdtempSync(join(tmpdir(), "pad-test-"));
  for (const f of files) {
    writeFileSync(join(base, f), "");
  }
  return base;
}

function cleanup(base: string) {
  try {
    rmSync(base, { recursive: true, force: true });
  } catch {
    // ignore
  }
}

describe("extractNumericPrefix", () => {
  it("extracts numeric prefixes", () => {
    expect(extractNumericPrefix("42")).toEqual(["42", ""]);
    expect(extractNumericPrefix("1-abc")).toEqual(["1", "-abc"]);
    expect(extractNumericPrefix("11_hello")).toEqual(["11", "_hello"]);
    expect(extractNumericPrefix("abc")).toEqual([null, null]);
    expect(extractNumericPrefix("001.jpg")).toEqual(["001", ".jpg"]);
  });
});

describe("padImageFilenames", () => {
  let base: string;

  afterEach(() => {
    if (base) {cleanup(base);}
  });

  it("pads numeric prefixes to uniform width", async () => {
    base = createTestDir(["1.jpg", "22.jpg", "333.jpg"]);
    const result = await padImageFilenames(base);
    expect(result.success).toBe(true);
    expect(result.message).toInclude("Padded 2 file(s)");

    const files = readdirSync(base).filter((f) => !f.startsWith("__pad_tmp"));
    expect(files.sort()).toEqual(["001.jpg", "022.jpg", "333.jpg"]);
  });

  it("skips when already padded", async () => {
    base = createTestDir(["001.jpg", "022.jpg", "333.jpg"]);
    const result = await padImageFilenames(base);
    expect(result.success).toBe(true);
    expect(result.message).toInclude("Already padded");
  });

  it("handles suffixes", async () => {
    base = createTestDir(["1-a.jpg", "22-b.jpg"]);
    const result = await padImageFilenames(base);
    expect(result.success).toBe(true);

    const files = readdirSync(base).filter((f) => !f.startsWith("__pad_tmp"));
    expect(files.sort()).toEqual(["01-a.jpg", "22-b.jpg"]);
  });

  it("skips non-numeric images", async () => {
    base = createTestDir(["abc.jpg", "def.png"]);
    const result = await padImageFilenames(base);
    expect(result.success).toBe(true);
    expect(result.message).toInclude("Skipped");
  });

  it("ignores non-image files", async () => {
    base = createTestDir(["1.jpg", "readme.txt", "22.webp"]);
    const result = await padImageFilenames(base);
    expect(result.success).toBe(true);
    expect(result.message).toInclude("Padded");

    const files = readdirSync(base)
      .filter((f) => !f.startsWith("__pad_tmp") && !f.endsWith(".txt"))
      .sort();
    expect(files).toEqual(["01.jpg", "22.webp"]);
  });

  it("fails for nonexistent directory", async () => {
    const result = await padImageFilenames("/nonexistent/path");
    expect(result.success).toBe(false);
    expect(result.message).toInclude("Error reading folder");
  });
});
