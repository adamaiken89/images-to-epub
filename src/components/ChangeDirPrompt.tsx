import { useEffect, useState } from "react";
import { createTextAttributes } from "@opentui/core";
import { useStore } from "@store";
import { colors } from "@utils/colors";
import { t } from "@utils/i18n";
import { getSubdirs } from "@utils/fs";

const BOLD = createTextAttributes({ bold: true });

export function handleChangeDirSubmit(value: string, changeDir: (path: string) => void, cancelChangeDir: () => void): void {
  const val = value.trim();
  if (val) {changeDir(val);}
  else {cancelChangeDir();}
}

export function makeChangeDirOnSubmit(changeDir: (path: string) => void, cancelChangeDir: () => void): ((event: object) => void) & ((value: string) => void) {
  return ((value: string) => {
    handleChangeDirSubmit(value, changeDir, cancelChangeDir);
  }) as unknown as ((event: object) => void) & ((value: string) => void);
}

export function ChangeDirPrompt() {
  const changeDirMode = useStore((s) => s.changeDirMode);
  const baseDir = useStore((s) => s.baseDir);
  const changeDir = useStore((s) => s.changeDir);
  const cancelChangeDir = useStore((s) => s.cancelChangeDir);
  const [subdirs, setSubdirs] = useState<string[]>([]);

  useEffect(() => {
    if (changeDirMode && baseDir) {
      getSubdirs(baseDir).then(setSubdirs);
    }
  }, [changeDirMode, baseDir]);

  if (!changeDirMode) {return null;}

  return <PromptInner baseDir={baseDir} subdirs={subdirs} changeDir={changeDir} cancelChangeDir={cancelChangeDir} />;
}

export function PromptInner({
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
  return (
    <box border borderColor={colors.keyHighlight} padding={1} marginBottom={1} flexDirection="column">
      <text fg={colors.keyHighlight} attributes={BOLD}>
        {t("prompt.title")}
      </text>
      <input
        value={baseDir}
        placeholder={t("prompt.placeholder")}
        focused={true}
        backgroundColor={colors.inputBg}
        textColor={colors.inputText}
        onSubmit={makeChangeDirOnSubmit(changeDir, cancelChangeDir)}
      />
      {subdirs.length > 0 && (
        <text marginTop={1} fg={colors.dim}>
          {t("prompt.subdirs")}{" "}
          {subdirs.slice(0, 15).map((d) => (
            <span fg={colors.subdirName} key={d}>
              {d}{" "}
            </span>
          ))}
          {subdirs.length > 15 ? t("prompt.more", { count: subdirs.length - 15 }) : ""}
        </text>
      )}
      <text marginTop={1} fg={colors.dim}>
        {t("prompt.escCancel")}
      </text>
    </box>
  );
}
