import { createTextAttributes } from "@opentui/core";
import { useStore } from "@store";
import { colors } from "@utils/colors";
import { t } from "@utils/i18n";

const BOLD = createTextAttributes({ bold: true });

export function Header() {
  const baseDir = useStore((s) => s.baseDir);
  const outputFormat = useStore((s) => s.outputFormat);

  return (
    <box flexDirection="column" marginBottom={1}>
      <text>
        <span fg={colors.title} attributes={BOLD}>{t("header.title")}</span>
        {"  "}
        <span fg={colors.keyHighlight}>[{t(`format.${outputFormat}`)}]</span>
        <span fg={colors.separator}>{"  \u2502  "}</span>
        <span fg={colors.path}>{baseDir || t("header.noDir")}</span>
      </text>
    </box>
  );
}
