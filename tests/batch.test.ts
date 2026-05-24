import { describe, it, expect, beforeEach } from "bun:test";
import { mkdtempSync, writeFileSync, rmSync } from "fs";
import { tmpdir } from "os";
import { join, basename } from "path";
import { useStore } from "../src/store";

describe("batch processing", () => {
  beforeEach(() => {
    useStore.setState({
      items: [],
      selectedIds: new Set(),
      isProcessing: false,
      status: { type: "info", message: "" },
    });
  });

  it("collects failures when processFolders encounters errors", async () => {
    const dir = mkdtempSync(join(tmpdir(), "batch-fail-"));
    try {
      // Create a non-image file so readdir succeeds but no images are found
      writeFileSync(join(dir, "readme.txt"), "not an image");

      useStore.setState({
        items: [
          {
            id: `folder:${dir}`,
            label: "test-folder",
            depth: 0,
            isZip: false,
            entry: { parts: ["test-folder"], path: dir, metadata: { hasImages: true, hasSubfolders: false, hasZips: false } },
            checked: true,
          },
        ],
        selectedIds: new Set([`folder:${dir}`]),
      });

      await useStore.getState().processFolders();

      const status = useStore.getState().status;
      expect(status.type).toBe("done");
      expect(status.message).toContain("Success: 0");
      expect(status.message).toContain("Failed: 1");
      expect(status.message).toContain("No images found");
      expect(status.message).toContain(basename(dir));
      expect(useStore.getState().isProcessing).toBe(false);
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });

  it("succeeds when processing a folder with images", async () => {
    const dir = mkdtempSync(join(tmpdir(), "batch-ok-"));
    try {
      // Create a real image file
      const sharp = (await import("sharp")).default;
      await sharp({ create: { width: 1, height: 1, channels: 3, background: { r: 255, g: 0, b: 0 } } })
        .webp()
        .toFile(join(dir, "001.webp"));

      useStore.setState({
        items: [
          {
            id: `folder:${dir}`,
            label: "test-folder",
            depth: 0,
            isZip: false,
            entry: { parts: ["test-folder"], path: dir, metadata: { hasImages: true, hasSubfolders: false, hasZips: false } },
            checked: true,
          },
        ],
        selectedIds: new Set([`folder:${dir}`]),
      });

      await useStore.getState().processFolders();

      const status = useStore.getState().status;
      expect(status.type).toBe("done");
      expect(status.message).toContain("Success: 1");
      expect(status.message).toContain("Failed: 0");
      expect(useStore.getState().isProcessing).toBe(false);
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });
});
