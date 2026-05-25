import { createTextAttributes } from "@opentui/core";
import { basename } from "path";
import { useStore } from "@store";
import { colors } from "@utils/colors";
import { t } from "@utils/i18n";

const BOLD = createTextAttributes({ bold: true });

export function RenamePrompt() {
  const renameMode = useStore((s) => s.renameMode);
  const renameTarget = useStore((s) => s.renameTarget);
  const renameKey = useStore((s) => s.renameKey);
  const renameSubmit = useStore((s) => s.renameSubmit);
  const cancelRename = useStore((s) => s.cancelRename);

  if (!renameMode) {return null;}

  return <PromptInner key={renameKey} renameTarget={renameTarget} renameSubmit={renameSubmit} cancelRename={cancelRename} />;
}

function PromptInner({
  renameTarget,
  renameSubmit,
  cancelRename,
}: {
  renameTarget: string | null;
  renameSubmit: (name: string) => void;
  cancelRename: () => void;
}) {
  return (
    <box border borderColor={colors.keyHighlight} padding={1} marginBottom={1} flexDirection="column">
      <text fg={colors.keyHighlight} attributes={BOLD}>
        {t("rename.title")}
      </text>
      <input
        value={renameTarget ? basename(renameTarget) : ""}
        placeholder={t("rename.placeholder")}
        focused={true}
        backgroundColor={colors.inputBg}
        textColor={colors.inputText}
        onSubmit={((value: string) => {
          const val = value.trim();
          if (val) {renameSubmit(val);}
          else {cancelRename();}
        }) as unknown as ((event: object) => void) & ((value: string) => void)}
      />
      <text marginTop={1} fg={colors.dim}>
        {t("rename.hint")}
      </text>
      <text marginTop={1} fg={colors.dim}>
        {t("rename.escCancel")}
      </text>
    </box>
  );
}
