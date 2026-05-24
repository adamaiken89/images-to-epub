import { useStore } from "../store";
import { colors } from "../utils/colors";

const STATUS_COLORS: Record<string, string> = {
  progress: colors.statusProgress,
  error: colors.statusError,
  done: colors.statusDone,
};

export function StatusBar() {
  const isProcessing = useStore((s) => s.isProcessing);
  const status = useStore((s) => s.status);

  const color = isProcessing
    ? STATUS_COLORS.progress
    : STATUS_COLORS[status.type] || colors.statusInfo;

  return (
    <text marginTop={1} fg={color}>
      {isProcessing && status.message
        ? `Processing... ${status.message}`
        : status.message}
    </text>
  );
}
