import { useStore } from "../store";
import { colors } from "../utils/colors";

export function InfoMessage() {
  const folderCount = useStore((s) => s.folderCount);
  const zipCount = useStore((s) => s.zipCount);
  const statusMessage = useStore((s) => s.status.message);
  const showHelp = useStore((s) => s.showHelp);
  const hasResults = folderCount > 0 || zipCount > 0;

  return (
    <text marginTop={1} fg={colors.dim}>
      {hasResults ? (
        <>
          Found <span fg={colors.countHighlight}>{folderCount}</span> folder(s),{" "}
          <span fg={colors.countHighlight}>{zipCount}</span> zip(s).{" "}
          <span fg={colors.keyHighlight}>{"\u2191\u2193"}</span> to navigate,{" "}
          <span fg={colors.keyHighlight}>Space</span> to toggle,{" "}
          <span fg={colors.keyHighlight}>Enter</span> to process.{" "}
          <span fg={colors.keyHighlight}>[h]</span> {showHelp ? "hide" : "help"}
        </>
      ) : statusMessage ? (
        statusMessage
      ) : (
        ""
      )}
    </text>
  );
}
