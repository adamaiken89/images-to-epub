import { createTextAttributes } from "@opentui/core";
import { useStore } from "@store";
import { colors } from "@utils/colors";
import { t } from "@utils/i18n";

const BOLD = createTextAttributes({ bold: true });

export function Header() {
  const baseDir = useStore((s) => s.baseDir);

  return (
    <box flexDirection="column" marginBottom={1}>
      <text fg={colors.title} attributes={BOLD}>
        {t("header.title")}
      </text>
      <text fg={colors.path}>
        <u>{baseDir || t("header.noDir")}</u>
      </text>
    </box>
  );
}
