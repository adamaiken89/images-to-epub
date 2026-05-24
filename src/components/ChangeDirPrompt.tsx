import { useState } from "react";
import { createTextAttributes } from "@opentui/core";
import { useStore } from "../store";
import { colors } from "../utils/colors";
import { text } from "../utils/text";

const BOLD = createTextAttributes({ bold: true });

export function ChangeDirPrompt() {
  const changeDirMode = useStore((s) => s.changeDirMode);
  const baseDir = useStore((s) => s.baseDir);
  const subdirs = useStore((s) => s.subdirs);
  const promptKey = useStore((s) => s.promptKey);
  const changeDir = useStore((s) => s.changeDir);
  const cancelChangeDir = useStore((s) => s.cancelChangeDir);

  if (!changeDirMode) return null;

  return <PromptInner key={promptKey} baseDir={baseDir} subdirs={subdirs} changeDir={changeDir} cancelChangeDir={cancelChangeDir} />;
}

function PromptInner({
  baseDir,
  subdirs,
  changeDir,
  cancelChangeDir,
}: {
  baseDir: string;
  subdirs: string[];
  changeDir: (path: string) => void;
  cancelChangeDir: () => void;
}) {
  const [inputValue, setInputValue] = useState(baseDir);

  return (
    <box border borderColor={colors.keyHighlight} padding={1} marginBottom={1} flexDirection="column">
      <text fg={colors.keyHighlight} attributes={BOLD}>
        {text.prompt.title}
      </text>
      <input
        value={inputValue}
        placeholder={text.prompt.placeholder}
        focused={true}
        backgroundColor={colors.inputBg}
        textColor={colors.inputText}
        onSubmit={() => {
          const val = inputValue.trim();
          if (val) changeDir(val);
          else cancelChangeDir();
        }}
        onChange={(v: string) => setInputValue(v)}
      />
      {subdirs.length > 0 && (
        <text marginTop={1} fg={colors.dim}>
          {text.prompt.subdirs}{" "}
          {subdirs.slice(0, 15).map((d) => (
            <span fg={colors.subdirName} key={d}>
              {d}{" "}
            </span>
          ))}
          {subdirs.length > 15 ? `${text.prompt.morePrefix}${subdirs.length - 15}${text.prompt.moreSuffix}` : ""}
        </text>
      )}
      <text marginTop={1} fg={colors.dim}>
        {text.prompt.escCancel}
      </text>
    </box>
  );
}
