import { createTextAttributes } from "@opentui/core";
import { useStore } from "@store";
import { colors } from "@utils/colors";
import { t } from "@utils/i18n";

const BOLD = createTextAttributes({ bold: true });

export function SummaryModal() {
  const showSummary = useStore((s) => s.showSummary);
  const summary = useStore((s) => s.summary);

  if (!showSummary) {return null;}

  const successRate = summary.results.length > 0
    ? `${summary.successCount} of ${summary.results.length} succeeded`
    : "0 of 0 succeeded";

  const sizeStr = summary.totalSize > 0
    ? (summary.totalSize / (1024 * 1024)).toFixed(1) + " MB"
    : "0 MB";

  const resultLines = summary.results.map((line) => {
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
      <text fg={colors.modalHeader} attributes={BOLD} marginBottom={1}>
        {t("summary.title")}
      </text>
      {resultLines}
      <text fg={colors.dim} marginTop={1}>
        {"\u2500".repeat(40)}
      </text>
      <text fg={colors.statusInfo}>
        {successRate} {'\u00B7'} {summary.totalPages} pages {'\u00B7'} {sizeStr}
      </text>
      <text fg={colors.statusInfo}>
        {t("summary.elapsed", { seconds: summary.elapsed.toFixed(1) })}
      </text>
      <text fg={colors.dim} marginTop={1}>
        {t("summary.dismiss")}
      </text>
    </box>
  );
}
