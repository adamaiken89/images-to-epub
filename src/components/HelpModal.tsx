import { createTextAttributes } from "@opentui/core";
import { colors } from "../utils/colors";
import { text } from "../utils/text";

const BOLD = createTextAttributes({ bold: true });

export function HelpModal() {
  return (
    <box border borderColor={colors.keyHighlight} padding={1} flexGrow={1} flexDirection="column">
      <text fg={colors.keyHighlight} attributes={BOLD} marginBottom={1}>
        {text.modal.title}
      </text>
      <text fg={colors.controlsText}>
        <span fg={colors.keyHighlight}>[Space]</span>{text.modal.toggle}
      </text>
      <text fg={colors.controlsText}>
        <span fg={colors.keyHighlight}>[a]</span>{text.modal.selectAll}{"  "}
        <span fg={colors.keyHighlight}>[d]</span>{text.modal.deselectAll}
      </text>
      <text fg={colors.controlsText}>
        <span fg={colors.keyHighlight}>[p]</span>{text.modal.process}
      </text>
      <text fg={colors.controlsText}>
        <span fg={colors.keyHighlight}>[u]</span>{text.modal.unzip}
      </text>
      <text fg={colors.controlsText}>
        <span fg={colors.keyHighlight}>[z]</span>{text.modal.pad}
      </text>
      <text fg={colors.controlsText}>
        <span fg={colors.keyHighlight}>[c]</span>{text.modal.changeDir}
      </text>
      <text fg={colors.controlsText}>
        <span fg={colors.keyHighlight}>[r]</span>{text.modal.refresh}
      </text>
      <text fg={colors.controlsText}>
        <span fg={colors.keyHighlight}>[q]</span>{text.modal.quit}
      </text>
      <text fg={colors.controlsText}>
        <span fg={colors.keyHighlight}>[Esc]</span> {text.modal.or} <span fg={colors.keyHighlight}>[h]</span>{text.modal.closeHelp}
      </text>
    </box>
  );
}
