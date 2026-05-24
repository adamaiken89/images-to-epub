import { useStore } from "../store";
import { colors } from "../utils/colors";

export function ControlsHint() {
  const changeDirMode = useStore((s) => s.changeDirMode);
  const showHelp = useStore((s) => s.showHelp);

  if (changeDirMode || !showHelp) return null;

  return (
    <text fg={colors.controlsText} marginBottom={1}>
      <span fg={colors.keyHighlight}>[Space]</span> Toggle{" "}
      | <span fg={colors.keyHighlight}>[p]</span> Process{" "}
      | <span fg={colors.keyHighlight}>[u]</span> Unzip{" "}
      | <span fg={colors.keyHighlight}>[z]</span> Pad{" "}
      | <span fg={colors.keyHighlight}>[c]</span> Change Dir{" "}
      | <span fg={colors.keyHighlight}>[r]</span> Refresh{" "}
      | <span fg={colors.keyHighlight}>[q]</span> Quit{" "}
      | <span fg={colors.keyHighlight}>[h]</span> Hide
    </text>
  );
}
