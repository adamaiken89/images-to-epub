import { createTextAttributes } from "@opentui/core";
import { colors } from "@utils/colors";

const BOLD = createTextAttributes({ bold: true });

interface InputPromptProps {
  title: string;
  placeholder: string;
  hint: string;
  escLabel: string;
  initialValue?: string;
  onSubmit: (value: string) => void;
  onCancel: () => void;
}

export function InputPrompt({
  title,
  placeholder,
  hint,
  escLabel,
  initialValue = "",
  onSubmit,
}: InputPromptProps) {
  return (
    <box border borderColor={colors.keyHighlight} padding={1} marginBottom={1} flexDirection="column">
      <text fg={colors.title} attributes={BOLD} marginBottom={1}>
        {title}
      </text>
      <input
        value={initialValue}
        placeholder={placeholder}
        focused={true}
        backgroundColor={colors.inputBg}
        textColor={colors.inputText}
        onSubmit={onSubmit as unknown as ((event: object) => void) & ((value: string) => void)}
      />
      <text marginTop={1} fg={colors.dim}>
        {hint} {'\u2022'} {escLabel}
      </text>
    </box>
  );
}
