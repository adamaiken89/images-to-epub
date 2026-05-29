import { createTextAttributes } from "@opentui/core";
import { colors } from "@utils/colors";
import { t } from "@utils/i18n";

const BOLD = createTextAttributes({ bold: true });

export function HelpModal() {
  return (
    <box border borderColor={colors.keyHighlight} padding={1} flexGrow={1} flexDirection="column">
      <text fg={colors.keyHighlight} attributes={BOLD} marginBottom={1}>
        {t("modal.title")}
      </text>
      <text fg={colors.controlsText}>
        <span fg={colors.keyHighlight}>[Space]</span>{t("modal.toggle")}
      </text>
      <text fg={colors.controlsText}>
        <span fg={colors.keyHighlight}>[a]</span>{t("modal.selectAll")}{" "}(toggle)
      </text>
      <text fg={colors.controlsText}>
        <span fg={colors.keyHighlight}>[Enter]</span>{t("modal.process")}
      </text>
      <text fg={colors.controlsText}>
        <span fg={colors.keyHighlight}>[p]</span>{t("modal.pad")}
      </text>
      <text fg={colors.controlsText}>
        <span fg={colors.keyHighlight}>[u]</span>{t("modal.unzip")}
      </text>
      <text fg={colors.controlsText}>
        <span fg={colors.keyHighlight}>[c]</span>{t("modal.changeDir")}
      </text>
      <text fg={colors.controlsText}>
        <span fg={colors.keyHighlight}>[r]</span>{t("modal.refresh")}
      </text>
      <text fg={colors.controlsText}>
        <span fg={colors.keyHighlight}>[n]</span>{t("modal.rename")}
      </text>
      <text fg={colors.controlsText}>
        <span fg={colors.keyHighlight}>[m]</span>{t("modal.setAuthor")}
      </text>
      <text fg={colors.controlsText}>
        <span fg={colors.keyHighlight}>[f]</span>{t("modal.format")}
      </text>
      <text fg={colors.controlsText}>

      </text>
      <text fg={colors.controlsText}>
        <span fg={colors.keyHighlight}>[q]</span>{t("modal.quit")}
      </text>
      <text fg={colors.controlsText}>
        <span fg={colors.keyHighlight}>[Esc]</span> {t("modal.or")} <span fg={colors.keyHighlight}>[h]</span>{t("modal.closeHelp")}
      </text>
    </box>
  );
}
