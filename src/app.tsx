import { useState, useCallback, useEffect, useRef } from "react";
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
import { basename } from "path";

interface TreeItem {
  id: string;
  label: string;
  depth: number;
  isZip: boolean;
  isSelectAll: boolean;
  entry: FolderEntry | null;
  checked: boolean;
}

const BOLD_ATTRS = createTextAttributes({ bold: true });

function getInitialDir(): string | null {
  const arg = process.argv[2];
  if (arg) return arg;
  return null;
}

export default function App() {
  const [baseDir, setBaseDir] = useState<string>("");
  const [items, setItems] = useState<TreeItem[]>([]);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [focusIndex, setFocusIndex] = useState(0);
  const [status, setStatus] = useState("Loading...");
  const [isProcessing, setIsProcessing] = useState(false);
  const [showHelp, setShowHelp] = useState(false);
  const [changeDirMode, setChangeDirMode] = useState(false);
  const [changeDirValue, setChangeDirValue] = useState("");
  const inputRef = useRef<any>(null);

  const loadFolders = useCallback(async (dir: string) => {
    setStatus("Scanning folders...");
    const { foldersWithImages, allFolders } = await findFoldersWithImages(dir);
    const hierarchy = organizeFoldersByHierarchy(allFolders, dir);
    const zips = await findZipFiles(dir);

    const newItems: TreeItem[] = [];

    // Add "Select All" row if there are any entries
    const hasEntries = hierarchy.size > 0 || zips.length > 0;
    if (hasEntries) {
      newItems.push({
        id: "select-all",
        label: "Select All",
        depth: 0,
        isZip: false,
        isSelectAll: true,
        entry: null,
        checked: false,
      });
    }

    const sortedEntries = Array.from(hierarchy.entries()).sort((a, b) =>
      a[1].parts.join("/").localeCompare(b[1].parts.join("/"))
    );

    for (const [, entry] of sortedEntries) {
      const depth = entry.parts.length - 1;
      const label = entry.parts[entry.parts.length - 1];
      const id = `folder:${entry.path}`;
      newItems.push({
        id,
        label,
        depth: Math.max(0, depth),
        isZip: false,
        isSelectAll: false,
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
        isSelectAll: false,
        entry: null,
        checked: false,
      });
    }

    // Sort folders and zips by depth then label, keeping Select All at top
    const tail = newItems.slice(1).sort((a, b) => {
      if (a.depth !== b.depth) return a.depth - b.depth;
      return a.label.localeCompare(b.label);
    });
    const finalItems = hasEntries ? [newItems[0], ...tail] : [];

    setItems(finalItems);
    setSelectedIds(new Set());
    setFocusIndex(0);
    const folderCount = sortedEntries.length;
    const zipCount = zips.length;
    if (folderCount === 0 && zipCount === 0) {
      setStatus("No folders with images or zips found.");
    } else {
      setStatus(
        `Found ${folderCount} folder(s), ${zipCount} zip(s). \u2191\u2193 to navigate, Space to toggle.`
      );
    }
  }, []);

  const init = useCallback(async () => {
    const cliDir = getInitialDir();
    const defaultDir = cliDir || (await findDefaultBaseDir());
    setBaseDir(defaultDir);
    setChangeDirValue(defaultDir);
    await loadFolders(defaultDir);
  }, [loadFolders]);

  useEffect(() => {
    init();
  }, [init]);

  // Focus input when changeDirMode opens
  useEffect(() => {
    if (changeDirMode && inputRef.current) {
      inputRef.current.focus();
    }
  }, [changeDirMode]);

  const applySelectAllState = useCallback(
    (checked: boolean) => {
      if (checked) {
        const allIds = new Set(items.filter((i) => !i.isSelectAll).map((i) => i.id));
        setSelectedIds(allIds);
        setItems((prev) =>
          prev.map((it) => (it.isSelectAll ? { ...it, checked: true } : { ...it, checked: true }))
        );
        setStatus(`${items.length - 1} item(s) selected`);
      } else {
        setSelectedIds(new Set());
        setItems((prev) =>
          prev.map((it) => (it.isSelectAll ? { ...it, checked: false } : { ...it, checked: false }))
        );
        setStatus("No items selected");
      }
    },
    [items]
  );

  const toggleItem = useCallback(
    (index: number) => {
      if (index < 0 || index >= items.length) return;
      const item = items[index];

      if (item.isSelectAll) {
        const newChecked = !item.checked;
        applySelectAllState(newChecked);
        return;
      }

      const newSelected = new Set(selectedIds);
      if (newSelected.has(item.id)) {
        newSelected.delete(item.id);
      } else {
        newSelected.add(item.id);
      }
      setSelectedIds(newSelected);
      setItems((prev) =>
        prev.map((it, i) => {
          if (i === index) return { ...it, checked: !it.checked };
          if (it.isSelectAll) return { ...it, checked: false };
          return it;
        })
      );

      const count = newSelected.size;
      setStatus(
        `${count} item(s) selected - [p] Process | [u] Unzip | [z] Pad | [c] Change Dir | [r] Refresh`
      );
    },
    [items, selectedIds, applySelectAllState]
  );

  const selectAll = useCallback(() => {
    applySelectAllState(true);
  }, [applySelectAllState]);

  const deselectAll = useCallback(() => {
    applySelectAllState(false);
  }, [applySelectAllState]);

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
      setStatus(`Processing ${i + 1}/${folders.length}: ${basename(folder)}...`);
      const result = await createEpubFromFolder(folder);
      if (result.success) {
        successCount++;
      } else {
        failCount++;
        failed.push(`${basename(folder)}: ${result.message}`);
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
      setStatus(`Unzipping ${i + 1}/${zips.length}: ${basename(zips[i])}...`);
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
      setStatus(`Padding ${i + 1}/${folders.length}: ${basename(folders[i])}...`);
      const result = await padImageFilenames(folders[i]);
      if (result.success) successCount++;
      else failCount++;
    }

    setStatus(`Padding done! Success: ${successCount}, Failed: ${failCount}`);
    setIsProcessing(false);
  }, [selectedIds, getFoldersToProcess]);

  const confirmChangeDir = useCallback(async () => {
    const currentValue = inputRef.current?.value || changeDirValue;
    const newDir = currentValue.trim();
    if (!newDir) {
      setChangeDirMode(false);
      return;
    }
    setChangeDirMode(false);
    setBaseDir(newDir);
    await loadFolders(newDir);
  }, [changeDirValue, loadFolders]);

  useKeyboard(
    (key) => {
      if (isProcessing) return;

      if (changeDirMode) {
        if (key.name === "escape") {
          setChangeDirMode(false);
          setChangeDirValue(baseDir);
        }
        // Let the input component handle Enter (onSubmit) and typing
        return;
      }

      if (showHelp) {
        if (key.name === "escape" || key.name === "return" || key.name === "h" || key.name === "?") {
          setShowHelp(false);
        }
        return;
      }

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
          processFolders();
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
        case "c":
          setChangeDirValue(baseDir);
          setChangeDirMode(true);
          break;
        case "r":
          if (baseDir) loadFolders(baseDir);
          break;
        case "h":
        case "?":
          setShowHelp(true);
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
    const line = item.isSelectAll
      ? `${checkbox} ${item.label}`
      : `${indent}${checkbox} ${item.label}`;

    return (
      <text
        key={item.id}
        fg={isFocused ? "#ffffff" : item.isZip ? "#888888" : item.isSelectAll ? "#66ccff" : "#cccccc"}
        bg={isFocused ? "#3366cc" : "transparent"}
        attributes={isFocused || item.isSelectAll ? BOLD_ATTRS : undefined}
      >
        {line}
      </text>
    );
  };

  const folderName = baseDir ? basename(baseDir) : "";

  return (
    <box flexDirection="column" height="100%" padding={1}>
      {/* Header */}
      <text fg="#66ccff" attributes={BOLD_ATTRS} marginBottom={1}>
        EPUB Generator - {folderName || baseDir}
      </text>

      {/* Change Directory Prompt */}
      {changeDirMode && (
        <box border borderColor="#ffcc00" padding={1} marginBottom={1} flexDirection="column">
          <text fg="#ffcc00" attributes={BOLD_ATTRS}>
            Change Directory (type path and press Enter):
          </text>
          <input
            ref={inputRef}
            value={changeDirValue}
            placeholder="Enter directory path..."
            focused={true}
            backgroundColor="#1a1a1a"
            textColor="#ffffff"
            onSubmit={() => confirmChangeDir()}
          />
          <text fg="#888888">Press ESC to cancel</text>
        </box>
      )}

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
          <text>{"c         Change directory"}</text>
          <text>{"r         Refresh folders"}</text>
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
      {!showHelp && !changeDirMode && (
        <text marginTop={1} fg="#888888">
          [h] Help | [Space] Toggle | [Enter] Process | [c] Change Dir | [r] Refresh | [q] Quit
        </text>
      )}
    </box>
  );
}
