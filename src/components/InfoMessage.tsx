import { useStore } from "@store";
import { colors } from "@utils/colors";
import { t } from "@utils/i18n";

export function InfoMessage() {
  const folderCount = useStore((s) => s.folderCount);
  const zipCount = useStore((s) => s.zipCount);
  const showHelp = useStore((s) => s.showHelp);

  return (
    <box flexDirection="column" marginTop={1}>
      <text fg={colors.separator}>{"\u2500".repeat(56)}</text>
      <text fg={colors.dim} marginTop={1}>
        {folderCount > 0 || zipCount > 0 ? (
          <>
            <span fg={colors.countHighlight}>{folderCount}</span>{" "}{t("info.foldersLabel")}{" "}
            <span fg={colors.countHighlight}>{zipCount}</span>{" "}{t("info.zipsLabel")}
            <span fg={colors.separator}>{"  \u2502  "}</span>
          </>
        ) : null}
        <span fg={colors.keyHighlight}>{"\u2191\u2193"}</span>{"="}{t("info.nav")}{"  "}
        <span fg={colors.keyHighlight}>[Space]</span>{"="}{t("info.toggle")}{"  "}
        <span fg={colors.keyHighlight}>[Enter]</span>{"="}{t("info.go")}{"  "}
        <span fg={colors.keyHighlight}>[f]</span>{"="}{t("info.format")}{"  "}
        <span fg={colors.keyHighlight}>[h]</span>{"="}{showHelp ? t("info.hide") : t("info.help")}
      </text>
    </box>
  );
}
