import type { StateCreator } from "zustand";
import {
  findDefaultBaseDir,
  findFoldersWithImages,
  findZipFiles,
  organizeFoldersByHierarchy,
} from "@utils/fs";
import type { AppState, TreeItem } from "@store/types";
import { t } from "@utils/i18n";
import { parseArgs, loadConfig, writeDefaultConfig } from "@utils/config";

export const createScanSlice: StateCreator<AppState, [], [], Pick<AppState, "baseDir" | "folderCount" | "zipCount" | "loadFolders" | "init">> = (set, get, _store) => ({
  baseDir: "",
  folderCount: 0,
  zipCount: 0,

  loadFolders: async (dir: string) => {
    set({ status: { type: "progress", message: t("scan.scanning") } });
    const { allFolders } = await findFoldersWithImages(dir);
    const hierarchy = organizeFoldersByHierarchy(allFolders, dir);
    const zips = await findZipFiles(dir);

    const withKeys: Array<{ item: TreeItem; sortKey: string }> = [];

    for (const [, entry] of hierarchy) {
      withKeys.push({
        item: {
          id: `folder:${entry.path}`,
          label: entry.parts[entry.parts.length - 1],
          depth: Math.max(0, entry.parts.length - 1),
          isZip: false,
          entry,
          checked: false,
          excluded: false,
        },
        sortKey: entry.parts.join("/"),
      });
    }

    for (const zipPath of zips) {
      const rel = zipPath.slice(dir.length + 1);
      const parts = rel.split(/[/\\]/);
      withKeys.push({
        item: {
          id: `zip:${zipPath}`,
          label: t("tree.zipPrefix") + parts[parts.length - 1],
          depth: Math.max(0, parts.length - 1),
          isZip: true,
          entry: null,
          checked: false,
          excluded: false,
        },
        sortKey: rel,
      });
    }

    withKeys.sort((a, b) => a.sortKey.localeCompare(b.sortKey));
    const newItems = withKeys.map((w) => w.item);

    const folderCount = hierarchy.size;
    const zipCount = zips.length;

    set({
      items: newItems,
      selectedIds: new Set(),
      focusIndex: 0,
      folderCount,
      zipCount,
      status:
        folderCount === 0 && zipCount === 0
          ? { type: "info", message: t("scan.noResults") }
          : { type: "info", message: t("selection.item", { count: 0 }) },
    });
  },

  init: async () => {
    const args = parseArgs();

    if (args.initConfig) {
      await writeDefaultConfig(args.configPath);
      set({ status: { type: "done", message: `Config written to ${args.configPath || "~/.img2epubrc"}` } });
      return;
    }

    let config;
    if (args.noConfig) {
      config = { defaultBaseDir: "", outputFormat: "epub" as const, parallelism: 4, skipExisting: true, outputDir: "", authorDetection: "folder" as const, imageFormats: [".webp", ".jpg", ".jpeg", ".png"], theme: "default" };
    } else {
      config = await loadConfig(args.configPath);
    }

    const cliDir = args.dir;
    const effectiveDir = cliDir || config.defaultBaseDir || (await findDefaultBaseDir());

    const outputFormat = args.format || config.outputFormat;

    set({
      baseDir: effectiveDir,
      outputFormat: outputFormat as "epub" | "kepub" | "both",
    });

    await get().loadFolders(effectiveDir);
  },
});
