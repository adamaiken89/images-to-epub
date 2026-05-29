import { createTextAttributes } from "@opentui/core";
import { useStore } from "@store";
import { colors } from "@utils/colors";
import { t } from "@utils/i18n";

const BOLD = createTextAttributes({ bold: true });

export function SummaryModal() {
  const showSummary = useStore((s) => s.showSummary);
  const summaryResults = useStore((s) => s.summaryResults);
  const summaryTotalPages = useStore((s) => s.summaryTotalPages);
  const summaryTotalSize = useStore((s) => s.summaryTotalSize);
  const summaryElapsed = useStore((s) => s.summaryElapsed);
  const summarySuccessCount = useStore((s) => s.summarySuccessCount);

  if (!showSummary) {return null;}

  const successRate = summaryResults.length > 0
    ? `${summarySuccessCount} of ${summaryResults.length} succeeded`
    : "0 of 0 succeeded";

  const sizeStr = summaryTotalSize > 0
    ? (summaryTotalSize / (1024 * 1024)).toFixed(1) + " MB"
    : "0 MB";

  const resultLines = summaryResults.map((line) => {
    const isError = line.includes("error:");
    return (
      <text key={line} fg={isError ? colors.statusError : colors.statusDone}>
        {isError ? "\u2717" : "\u2713"} {line}
      </text>
    );
  });

  return (
    <box
      border
      borderColor={colors.statusDone}
      padding={1}
      marginBottom={1}
      flexDirection="column"
    >
      <text fg={colors.title} attributes={BOLD} marginBottom={1}>
        {t("summary.title")}
      </text>
      {resultLines}
      <text fg={colors.dim} marginTop={1}>
        {"\u2500".repeat(40)}
      </text>
      <text fg={colors.statusInfo}>
        {successRate} {'\u00B7'} {summaryTotalPages} pages {'\u00B7'} {sizeStr}
      </text>
      <text fg={colors.statusInfo}>
        {t("summary.elapsed", { seconds: summaryElapsed.toFixed(1) })}
      </text>
      <text fg={colors.dim} marginTop={1}>
        {t("summary.dismiss")}
      </text>
    </box>
  );
}
