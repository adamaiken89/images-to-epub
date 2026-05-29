import { useStore } from "@store";
import { InputPrompt } from "@components/InputPrompt";
import { t } from "@utils/i18n";

export function AuthorPrompt() {
  const authorMode = useStore((s) => s.authorMode);
  const submitAuthorName = useStore((s) => s.submitAuthorName);
  const cancelAuthorMode = useStore((s) => s.cancelAuthorMode);

  if (!authorMode) {return null;}

  return (
    <InputPrompt
      title={t("author.title")}
      placeholder={t("author.placeholder")}
      hint={t("author.hint")}
      escLabel={t("author.escCancel")}
      onSubmit={makeAuthorOnSubmit(submitAuthorName, cancelAuthorMode)}
      onCancel={cancelAuthorMode}
    />
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
