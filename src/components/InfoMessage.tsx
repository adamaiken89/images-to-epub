import { useStore } from "../store";
import { colors } from "../utils/colors";
import { text } from "../utils/text";

export function InfoMessage() {
  const folderCount = useStore((s) => s.folderCount);
  const zipCount = useStore((s) => s.zipCount);
  const showHelp = useStore((s) => s.showHelp);

  if (folderCount === 0 && zipCount === 0) return null;

  return (
    <text marginTop={1} fg={colors.dim}>
      {text.info.found} <span fg={colors.countHighlight}>{folderCount}</span> {text.info.folders},{" "}
      <span fg={colors.countHighlight}>{zipCount}</span> {text.info.zips}{" "}
      <span fg={colors.keyHighlight}>{"\u2191\u2193"}</span> {text.info.toNavigate}{" "}
      <span fg={colors.keyHighlight}>[Space]</span> {text.info.toToggle}{" "}
      <span fg={colors.keyHighlight}>[Enter]</span> {text.info.toProcess}{" "}
      <span fg={colors.keyHighlight}>[h]</span> {showHelp ? text.info.hide : text.info.help}
    </text>
  );
}
