import { useStore } from "@store";
import { colors } from "@utils/colors";

const STATUS_COLORS: Record<string, string> = {
  info: colors.statusInfo,
  progress: colors.statusProgress,
  error: colors.statusError,
  done: colors.statusDone,
};

export function StatusBar() {
  const status = useStore((s) => s.status);
  const batchStartTime = useStore((s) => s.batchStartTime);
  const isProcessing = useStore((s) => s.isProcessing);

  if (!status.message && !isProcessing) {return null;}

  let message = status.message;

  if (isProcessing && batchStartTime) {
    const elapsed = ((Date.now() - batchStartTime) / 1000).toFixed(1);
    message = `${message} (${elapsed}s)`;
  }

  const color = status.type ? STATUS_COLORS[status.type] : undefined;
  return (
    <text marginTop={1} fg={color || colors.statusInfo}>
      {message}
    </text>
  );
}
