import { createTextAttributes } from "@opentui/core";
import { useStore } from "../store";
import { colors } from "../utils/colors";

const BOLD = createTextAttributes({ bold: true });

export function HelpModal() {
  const showHelp = useStore((s) => s.showHelp);
  const changeDirMode = useStore((s) => s.changeDirMode);

  if (!showHelp || changeDirMode) return null;

  return (
    <box border borderColor={colors.keyHighlight} padding={1} marginTop={1} flexDirection="column">
      <text fg={colors.keyHighlight} attributes={BOLD}>
        Keyboard Shortcuts
      </text>
      <text fg={colors.controlsText}>
        <span fg={colors.keyHighlight}>[Space]</span> Toggle selection{"  "}
        <span fg={colors.keyHighlight}>[a]</span> Select All{"  "}
        <span fg={colors.keyHighlight}>[d]</span> Deselect All
      </text>
      <text fg={colors.controlsText}>
        <span fg={colors.keyHighlight}>[p]</span> Process EPUB{"  "}
        <span fg={colors.keyHighlight}>[u]</span> Unzip{"  "}
        <span fg={colors.keyHighlight}>[z]</span> Pad filenames
      </text>
      <text fg={colors.controlsText}>
        <span fg={colors.keyHighlight}>[c]</span> Change dir{"  "}
        <span fg={colors.keyHighlight}>[r]</span> Refresh{"  "}
        <span fg={colors.keyHighlight}>[q]</span> Quit
      </text>
      <text fg={colors.controlsText}>
        <span fg={colors.keyHighlight}>[h]</span> Toggle this help{"  "}
        <span fg={colors.keyHighlight}>[Esc]</span> Close
      </text>
    </box>
  );
}
