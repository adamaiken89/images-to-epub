import { useRef, useEffect, useState } from "react";
import { createTextAttributes } from "@opentui/core";
import { useStore } from "../store";
import { readdirSync } from "fs";
import { join } from "path";
import { colors } from "../utils/colors";

const BOLD = createTextAttributes({ bold: true });

function getSubdirs(dir: string): string[] {
  try {
    return readdirSync(dir, { withFileTypes: true })
      .filter((e) => e.isDirectory() && !e.name.startsWith("."))
      .map((e) => e.name)
      .sort();
  } catch {
    return [];
  }
}

export function ChangeDirPrompt() {
  const changeDirMode = useStore((s) => s.changeDirMode);
  const baseDir = useStore((s) => s.baseDir);
  const changeDir = useStore((s) => s.changeDir);
  const cancelChangeDir = useStore((s) => s.cancelChangeDir);
  const inputRef = useRef<any>(null);
  const [inputValue, setInputValue] = useState(baseDir);
  const [subdirs, setSubdirs] = useState<string[]>([]);

  useEffect(() => {
    if (changeDirMode) {
      setInputValue(baseDir);
      setSubdirs(getSubdirs(baseDir));
      if (inputRef.current) inputRef.current.focus();
    }
  }, [changeDirMode, baseDir]);

  if (!changeDirMode) return null;

  return (
    <box border borderColor={colors.keyHighlight} padding={1} marginBottom={1} flexDirection="column">
      <text fg={colors.keyHighlight} attributes={BOLD}>
        Change Directory:
      </text>
      <input
        ref={inputRef}
        value={inputValue}
        placeholder="Enter directory path..."
        focused={true}
        backgroundColor={colors.inputBg}
        textColor={colors.inputText}
        onSubmit={() => {
          const val = inputRef.current?.value?.trim();
          if (val) changeDir(val);
          else cancelChangeDir();
        }}
        onChange={(v: string) => setInputValue(v)}
      />
      {subdirs.length > 0 && (
        <text marginTop={1} fg={colors.dim}>
          Subdirs:{" "}
          {subdirs.slice(0, 15).map((d) => (
            <span fg={colors.subdirName} key={d}>
              {d}{" "}
            </span>
          ))}
          {subdirs.length > 15 ? `...(+${subdirs.length - 15})` : ""}
        </text>
      )}
      <text marginTop={1} fg={colors.dim}>
        ESC to cancel
      </text>
    </box>
  );
}
