import { useStore } from "@/store";
import { colors } from "@/utils/colors";

const STATUS_COLORS: Record<string, string> = {
  info: colors.statusInfo,
  progress: colors.statusProgress,
  error: colors.statusError,
  done: colors.statusDone,
};

export function StatusBar() {
  const status = useStore((s) => s.status);

  if (!status.message) {return null;}

  return (
    <text marginTop={1} fg={STATUS_COLORS[status.type] || colors.statusInfo}>
      {status.message}
    </text>
  );
}
