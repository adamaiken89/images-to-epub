import { useState, useCallback, useEffect } from "react";
import { useKeyboard } from "@opentui/react";
import { createTextAttributes } from "@opentui/core";
import {
  findFoldersWithImages,
  organizeFoldersByHierarchy,
  findZipFiles,
  getSubfoldersWithImages,
  findDefaultBaseDir,
  type FolderEntry,
} from "./utils/fs";
import { padImageFilenames } from "./utils/pad";
import { unzipFile } from "./utils/zip";
import { createEpubFromFolder } from "./utils/epub";

interface TreeItem {
  id: string;
  label: string;
  depth: number;
  isZip: boolean;
  entry: FolderEntry | null;
  checked: boolean;
}

const BOLD_ATTRS = createTextAttributes({ bold: true });

export default function App() {
  const [baseDir, setBaseDir] = useState<string>("");
  const [items, setItems] = useState<TreeItem[]>([]);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [focusIndex, setFocusIndex] = useState(0);
  const [status, setStatus] = useState("Select a base folder to begin");
  const [isProcessing, setIsProcessing] = useState(false);
  const [showHelp, setShowHelp] = useState(false);

  const loadFolders = useCallback(async (dir: string) => {
    setStatus("Scanning folders...");
    const { foldersWithImages, allFolders } = await findFoldersWithImages(dir);
    const hierarchy = organizeFoldersByHierarchy(allFolders, dir);
    const zips = await findZipFiles(dir);

    const newItems: TreeItem[] = [];
    const sortedEntries = Array.from(hierarchy.entries()).sort((a, b) =>
      a[1].parts.join("/").localeCompare(b[1].parts.join("/"))
    );

    for (const [, entry] of sortedEntries) {
      const depth = entry.parts.length - 1;
      const label = entry.parts[entry.parts.length - 1] || dir;
      const id = `folder:${entry.path}`;
      newItems.push({
        id,
        label,
        depth: Math.max(0, depth),
        isZip: false,
        entry,
        checked: false,
      });
    }

    for (const zipPath of zips) {
      const rel = zipPath.slice(dir.length + 1);
      const parts = rel.split(/[/\\]/);
      const depth = parts.length - 1;
      const label = "\u{1F4E6} " + parts[parts.length - 1];
      newItems.push({
        id: `zip:${zipPath}`,
        label,
        depth: Math.max(0, depth),
        isZip: true,
        entry: null,
        checked: false,
      });
    }

    newItems.sort((a, b) => {
      if (a.depth !== b.depth) return a.depth - b.depth;
      return a.label.localeCompare(b.label);
    });

    setItems(newItems);
    setSelectedIds(new Set());
    setFocusIndex(0);
    setStatus(
      `Found ${sortedEntries.length} folders, ${zips.length} zip(s). Arrow keys to navigate, Space to toggle.`
    );
  }, []);

  const initDefault = useCallback(async () => {
    const defaultDir = await findDefaultBaseDir();
    setBaseDir(defaultDir);
    await loadFolders(defaultDir);
  }, [loadFolders]);

  useEffect(() => {
    initDefault();
  }, [initDefault]);

  const toggleItem = useCallback(
    (index: number) => {
      if (index < 0 || index >= items.length) return;
      const item = items[index];
      const newSelected = new Set(selectedIds);
      if (newSelected.has(item.id)) {
        newSelected.delete(item.id);
      } else {
        newSelected.add(item.id);
      }
      setSelectedIds(newSelected);
      setItems((prev) =>
        prev.map((it, i) => (i === index ? { ...it, checked: !it.checked } : it))
      );

      const count = newSelected.size;
      setStatus(
        `${count} item(s) selected - [p] Process | [u] Unzip | [z] Pad | [a] Select All | [d] Deselect All`
      );
    },
    [items, selectedIds]
  );

  const selectAll = useCallback(() => {
    const allIds = new Set(items.map((i) => i.id));
    setSelectedIds(allIds);
    setItems((prev) => prev.map((it) => ({ ...it, checked: true })));
    setStatus(`${items.length} item(s) selected`);
  }, [items]);

  const deselectAll = useCallback(() => {
    setSelectedIds(new Set());
    setItems((prev) => prev.map((it) => ({ ...it, checked: false })));
    setStatus("No items selected");
  }, []);

  const getFoldersToProcess = useCallback(
    (selectedSet: Set<string>) => {
      const result: string[] = [];
      for (const id of selectedSet) {
        if (id.startsWith("folder:")) {
          const path = id.slice(7);
          const item = items.find((i) => i.id === id);
          if (item?.entry?.metadata.hasImages) {
            result.push(path);
          } else if (item?.entry) {
            const allFolderPaths = items
              .filter((i) => i.id.startsWith("folder:"))
              .map((i) => i.id.slice(7));
            const imageFolders = allFolderPaths.filter((p) => {
              const entry = items.find((i) => i.id === `folder:${p}`);
              return entry?.entry?.metadata.hasImages;
            });
            const subs = getSubfoldersWithImages(path, imageFolders);
            result.push(...subs);
          }
        }
      }
      return [...new Set(result)];
    },
    [items]
  );

  const processFolders = useCallback(async () => {
    if (selectedIds.size === 0) {
      setStatus("No items selected!");
      return;
    }
    setIsProcessing(true);
    const folders = getFoldersToProcess(selectedIds);
    if (folders.length === 0) {
      setStatus("No folders with images selected!");
      setIsProcessing(false);
      return;
    }

    let successCount = 0;
    let failCount = 0;
    const failed: string[] = [];

    for (let i = 0; i < folders.length; i++) {
      const folder = folders[i];
      setStatus(`Processing ${i + 1}/${folders.length}: ${folder}...`);
      const result = await createEpubFromFolder(folder);
      if (result.success) {
        successCount++;
      } else {
        failCount++;
        failed.push(`${folder}: ${result.message}`);
      }
    }

    setStatus(
      `Done! Success: ${successCount}, Failed: ${failCount}${failed.length > 0 ? " | " + failed.join("; ") : ""}`
    );
    setIsProcessing(false);
  }, [selectedIds, getFoldersToProcess]);

  const unzipSelected = useCallback(async () => {
    const zips = Array.from(selectedIds)
      .filter((id) => id.startsWith("zip:"))
      .map((id) => id.slice(4));
    if (zips.length === 0) {
      setStatus("No zip files selected!");
      return;
    }
    setIsProcessing(true);
    let successCount = 0;
    let failCount = 0;

    for (let i = 0; i < zips.length; i++) {
      setStatus(`Unzipping ${i + 1}/${zips.length}: ${zips[i]}...`);
      const result = await unzipFile(zips[i]);
      if (result.success) successCount++;
      else failCount++;
    }

    setStatus(`Unzip done! Success: ${successCount}, Failed: ${failCount}`);
    setIsProcessing(false);
    if (baseDir) await loadFolders(baseDir);
  }, [selectedIds, baseDir, loadFolders]);

  const padSelected = useCallback(async () => {
    const folders = getFoldersToProcess(selectedIds);
    if (folders.length === 0) {
      setStatus("No folders with images selected!");
      return;
    }
    setIsProcessing(true);
    let successCount = 0;
    let failCount = 0;

    for (let i = 0; i < folders.length; i++) {
      setStatus(`Padding ${i + 1}/${folders.length}: ${folders[i]}...`);
      const result = await padImageFilenames(folders[i]);
      if (result.success) successCount++;
      else failCount++;
    }

    setStatus(`Padding done! Success: ${successCount}, Failed: ${failCount}`);
    setIsProcessing(false);
  }, [selectedIds, getFoldersToProcess]);

  useKeyboard(
    (key) => {
      if (isProcessing) return;

      switch (key.name) {
        case "up":
          setFocusIndex((i) => Math.max(0, i - 1));
          break;
        case "down":
          setFocusIndex((i) => Math.min(items.length - 1, i + 1));
          break;
        case "space":
          toggleItem(focusIndex);
          break;
        case "return":
          if (showHelp) setShowHelp(false);
          else processFolders();
          break;
        case "a":
          selectAll();
          break;
        case "d":
          deselectAll();
          break;
        case "p":
          processFolders();
          break;
        case "u":
          unzipSelected();
          break;
        case "z":
          padSelected();
          break;
        case "h":
        case "?":
          setShowHelp((s) => !s);
          break;
        case "q":
        case "escape":
          process.exit(0);
          break;
      }
    },
    { release: false }
  );

  const renderItem = (item: TreeItem, index: number) => {
    const indent = "  ".repeat(item.depth);
    const checkbox = item.checked ? "[x]" : "[ ]";
    const isFocused = index === focusIndex;
    const line = `${indent}${checkbox} ${item.label}`;

    return (
      <text
        key={item.id}
        fg={isFocused ? "#ffffff" : item.isZip ? "#888888" : "#cccccc"}
        bg={isFocused ? "#3366cc" : "transparent"}
        attributes={isFocused ? BOLD_ATTRS : undefined}
      >
        {line}
      </text>
    );
  };

  return (
    <box flexDirection="column" height="100%" padding={1}>
      {/* Header */}
      <text fg="#66ccff" attributes={BOLD_ATTRS} marginBottom={1}>
        EPUB Generator - {baseDir}
      </text>

      {/* Help overlay */}
      {showHelp && (
        <box
          border
          borderColor="#66ccff"
          padding={1}
          marginBottom={1}
          flexDirection="column"
        >
          <text fg="#66ccff" attributes={BOLD_ATTRS}>
            Keyboard Controls:
          </text>
          <text>{"\u2191 / \u2193  Navigate items"}</text>
          <text>{"Space     Toggle checkbox"}</text>
          <text>{"Enter     Process selected folders"}</text>
          <text>{"a         Select All"}</text>
          <text>{"d         Deselect All"}</text>
          <text>{"p         Process EPUBs"}</text>
          <text>{"u         Unzip selected"}</text>
          <text>{"z         Pad filenames"}</text>
          <text>{"h / ?     Toggle help"}</text>
          <text>{"q / ESC   Quit"}</text>
        </box>
      )}

      {/* Tree View */}
      <scrollbox flexGrow={1} border padding={1}>
        {items.length === 0 ? (
          <text fg="#888888">No folders found. Press 'h' for help.</text>
        ) : (
          items.map((item, idx) => renderItem(item, idx))
        )}
      </scrollbox>

      {/* Status Bar */}
      <text marginTop={1} fg={isProcessing ? "#ffcc00" : "#66ccff"}>
        {isProcessing ? "Processing... " : ""}
        {status}
      </text>

      {/* Controls hint */}
      {!showHelp && (
        <text marginTop={1} fg="#888888">
          [h] Help | [Space] Toggle | [Enter] Process | [a] All | [d] None | [q] Quit
        </text>
      )}
    </box>
  );
}
