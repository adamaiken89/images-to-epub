import { InputPrompt } from "@components/InputPrompt";
import { useStore } from "@store";
import { t } from "@utils/i18n";
import { basename } from "path";

export function RenamePrompt() {
  const renameMode = useStore((s) => s.renameMode);
  const renameTarget = useStore((s) => s.renameTarget);
  const renameSubmit = useStore((s) => s.renameSubmit);
  const cancelRename = useStore((s) => s.cancelRename);

  if (!renameMode) {
    return null;
  }

  return (
    <InputPrompt
      title={t("rename.title")}
      placeholder={t("rename.placeholder")}
      hint={t("rename.hint")}
      escLabel={t("rename.escCancel")}
      initialValue={renameTarget ? basename(renameTarget) : ""}
      onSubmit={makeOnSubmit(renameSubmit, cancelRename)}
      onCancel={cancelRename}
    />
  );
}

export function handleRenameSubmit(
  value: string,
  renameSubmit: (name: string) => void,
  cancelRename: () => void,
): void {
  const val = value.trim();
  if (val) {
    renameSubmit(val);
  } else {
    cancelRename();
  }
}

export function makeOnSubmit(
  renameSubmit: (name: string) => void,
  cancelRename: () => void,
): ((event: object) => void) & ((value: string) => void) {
  return ((value: string) => {
    handleRenameSubmit(value, renameSubmit, cancelRename);
  }) as unknown as ((event: object) => void) & ((value: string) => void);
}
