import { useStore } from "../store";
import { colors } from "../utils/colors";

export function InfoMessage() {
  const folderCount = useStore((s) => s.folderCount);
  const zipCount = useStore((s) => s.zipCount);
  const showHelp = useStore((s) => s.showHelp);

  if (folderCount === 0 && zipCount === 0) return null;

  return (
    <text marginTop={1} fg={colors.dim}>
      Found <span fg={colors.countHighlight}>{folderCount}</span> folder(s),{" "}
      <span fg={colors.countHighlight}>{zipCount}</span> zip(s).{" "}
      <span fg={colors.keyHighlight}>{"\u2191\u2193"}</span> to navigate,{" "}
      <span fg={colors.keyHighlight}>[Space]</span> to toggle,{" "}
      <span fg={colors.keyHighlight}>[Enter]</span> to process.{" "}
      <span fg={colors.keyHighlight}>[h]</span> {showHelp ? "hide" : "help"}
    </text>
  );
}
