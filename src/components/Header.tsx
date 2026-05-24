import { createTextAttributes } from "@opentui/core";
import { useStore } from "../store";
import { colors } from "../utils/colors";

const BOLD = createTextAttributes({ bold: true });

export function Header() {
  const baseDir = useStore((s) => s.baseDir);

  return (
    <box flexDirection="column" marginBottom={1}>
      <text fg={colors.title} attributes={BOLD}>
        EPUB Generator
      </text>
      <text fg={colors.path}>
        <u>{baseDir || "No directory selected"}</u>
      </text>
    </box>
  );
}
