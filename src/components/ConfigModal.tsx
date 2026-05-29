import { createTextAttributes } from "@opentui/core";
import { useStore } from "@store";
import { colors } from "@utils/colors";
import { t } from "@utils/i18n";

const BOLD = createTextAttributes({ bold: true });

export function ConfigModal() {
  const showConfig = useStore((s) => s.showConfig);
  const outputFormat = useStore((s) => s.outputFormat);
  const baseDir = useStore((s) => s.baseDir);

  if (!showConfig) {return null;}

  return (
    <box border borderColor={colors.keyHighlight} padding={1} flexGrow={1} flexDirection="column">
      <text fg={colors.keyHighlight} attributes={BOLD} marginBottom={1}>
        {t("config.title")}
      </text>
      <text fg={colors.controlsText}>
        Base Dir: <span fg={colors.path}>{baseDir}</span>
      </text>
      <text fg={colors.controlsText}>
        Output Format: <span fg={colors.accent}>{t(`format.${outputFormat}`)}</span>
      </text>
      <text fg={colors.dim} marginTop={1}>
        {t("config.dismiss")}
      </text>
    </box>
  );
}
