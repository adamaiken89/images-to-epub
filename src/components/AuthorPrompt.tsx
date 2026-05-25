import { createTextAttributes } from "@opentui/core";
import { useStore } from "@store";
import { colors } from "@utils/colors";
import { t } from "@utils/i18n";

const BOLD = createTextAttributes({ bold: true });

export function AuthorPrompt() {
  const authorMode = useStore((s) => s.authorMode);
  const submitAuthorName = useStore((s) => s.submitAuthorName);
  const cancelAuthorMode = useStore((s) => s.cancelAuthorMode);

  if (!authorMode) {return null;}

  return (
    <box border borderColor={colors.keyHighlight} padding={1} marginBottom={1} flexDirection="column">
      <text fg={colors.keyHighlight} attributes={BOLD}>
        {t("author.title")}
      </text>
      <input
        value=""
        placeholder={t("author.placeholder")}
        focused={true}
        backgroundColor={colors.inputBg}
        textColor={colors.inputText}
        onSubmit={makeAuthorOnSubmit(submitAuthorName, cancelAuthorMode)}
      />
      <text marginTop={1} fg={colors.dim}>
        {t("author.hint")}
      </text>
      <text marginTop={1} fg={colors.dim}>
        {t("author.escCancel")}
      </text>
    </box>
  );
}

export function handleAuthorSubmit(value: string, submitAuthorName: (name: string) => void, cancelAuthorMode: () => void): void {
  const val = value.trim();
  if (val) {submitAuthorName(val);}
  else {cancelAuthorMode();}
}

export function makeAuthorOnSubmit(submitAuthorName: (name: string) => void, cancelAuthorMode: () => void): ((event: object) => void) & ((value: string) => void) {
  return ((value: string) => {
    handleAuthorSubmit(value, submitAuthorName, cancelAuthorMode);
  }) as unknown as ((event: object) => void) & ((value: string) => void);
}
