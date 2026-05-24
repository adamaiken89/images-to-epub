import { useStore } from "../store";
import { colors } from "../utils/colors";
import { t } from "../utils/i18n";

export function InfoMessage() {
  const folderCount = useStore((s) => s.folderCount);
  const zipCount = useStore((s) => s.zipCount);
  const showHelp = useStore((s) => s.showHelp);

  if (folderCount === 0 && zipCount === 0) return null;

  return (
    <text marginTop={1} fg={colors.dim}>
      {t("info.found")} <span fg={colors.countHighlight}>{folderCount}</span> {t("info.foldersLabel")}{" "}
      <span fg={colors.countHighlight}>{zipCount}</span> {t("info.zipsLabel")}{" "}
      <span fg={colors.keyHighlight}>{"\u2191\u2193"}</span> {t("info.toNavigate")}{" "}
      <span fg={colors.keyHighlight}>[Space]</span> {t("info.toToggle")}{" "}
      <span fg={colors.keyHighlight}>[Enter]</span> {t("info.toProcess")}{" "}
      <span fg={colors.keyHighlight}>[h]</span> {showHelp ? t("info.hide") : t("info.help")}
    </text>
  );
}
