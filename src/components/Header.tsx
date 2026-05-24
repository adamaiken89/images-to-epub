import { createTextAttributes } from "@opentui/core";
import { useStore } from "../store";
import { colors } from "../utils/colors";

const BOLD = createTextAttributes({ bold: true });

export function Header() {
  const baseDir = useStore((s) => s.baseDir);

  return (
    <>
      <text fg={colors.title} attributes={BOLD}>
        EPUB Generator
      </text>
      <text fg={colors.path} marginBottom={1}>
        <u>{baseDir || "No directory selected"}</u>
      </text>
    </>
  );
}
