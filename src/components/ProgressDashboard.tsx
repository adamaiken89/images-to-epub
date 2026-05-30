import { createTextAttributes } from "@opentui/core";
import { useStore } from "@store";
import { colors } from "@utils/colors";
import { t } from "@utils/i18n";
import { useEffect, useState } from "react";

const BOLD = createTextAttributes({ bold: true });
const BLOCK = "\u2588";
const EMPTY = "\u2591";

function ProgressBar({
  current,
  total,
  width = 16,
}: {
  current: number;
  total: number;
  width?: number;
}) {
  if (total === 0) {
    return <span>{EMPTY.repeat(width)}</span>;
  }
  const filled = Math.round((current / total) * width);
  const bar = BLOCK.repeat(filled) + EMPTY.repeat(Math.max(0, width - filled));
  return <span>{bar}</span>;
}

export function ProgressDashboard() {
  const progressItems = useStore((s) => s.progressItems);
  const isProcessing = useStore((s) => s.isProcessing);
  const batchStartTime = useStore((s) => s.batchStartTime);
  const processingMode = useStore((s) => s.processingMode);
  const [now, setNow] = useState(Date.now());

  useEffect(() => {
    if (!isProcessing) {
      return;
    }
    const id = setInterval(() => setNow(Date.now()), 500);
    return () => clearInterval(id);
  }, [isProcessing]);

  if (!isProcessing && progressItems.length === 0) {
    return null;
  }

  const elapsed = batchStartTime ? ((now - batchStartTime) / 1000).toFixed(1) : "0.0";
  const totalPages = progressItems.reduce((sum, p) => sum + p.pagesCompleted, 0);

  const statusIcons: Record<string, string> = {
    queued: "\u2500",
    processing: "\u2500",
    done: "\u2713",
    error: "\u2717",
  };

  return (
    <box
      border
      borderColor={colors.progressBorder}
      padding={1}
      marginBottom={1}
      flexDirection="column"
    >
      <text fg={colors.modalHeader} attributes={BOLD}>
        {t("progress.title", { count: progressItems.length, mode: processingMode })}
      </text>
      <text fg={colors.dim}>{"\u2500".repeat(40)}</text>
      {progressItems.map((item, _idx) => {
        const icon = statusIcons[item.status] || "\u2500";
        const fg =
          item.status === "done"
            ? colors.statusDone
            : item.status === "error"
              ? colors.statusError
              : item.status === "processing"
                ? colors.statusProgress
                : colors.dim;
        return (
          <text key={item.folderPath} fg={fg}>
            {icon} {item.folderName}{" "}
            <ProgressBar current={item.pagesCompleted} total={item.pagesTotal} />{" "}
            {item.pagesCompleted}/{item.pagesTotal} pages
            {item.message && item.status === "error" ? ` \u2014 ${item.message}` : ""}
          </text>
        );
      })}
      <text fg={colors.dim}>{"\u2500".repeat(40)}</text>
      <text fg={colors.statusInfo}>{t("progress.overall", { pages: totalPages, elapsed })}</text>
    </box>
  );
}
