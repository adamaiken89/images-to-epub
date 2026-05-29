import { createTextAttributes } from '@opentui/core';
import { useStore } from '@store';
import { colors } from '@utils/colors';
import { t } from '@utils/i18n';

const BOLD = createTextAttributes({ bold: true });

const shortcuts: [string, string][] = [
  ["`", "modal.toggleConfig"],
  ["a", "modal.selectAll"],
  ["c", "modal.changeDir"],
  ["Enter", "modal.process"],
  ["f", "modal.format"],
  ["m", "modal.setAuthor"],
  ["n", "modal.rename"],
  ["p", "modal.pad"],
  ["q", "modal.quit"],
  ["r", "modal.refresh"],
  ["Space", "modal.toggle"],
  ["u", "modal.unzip"],
];

export function HelpModal() {
  const showHelp = useStore((s) => s.showHelp);
  if (!showHelp) {return null;}
  return (
    <box border borderColor={colors.keyHighlight} padding={1} marginBottom={1} flexDirection="column">
      <text fg={colors.title} attributes={BOLD} marginBottom={1}>
        {t("modal.title")}
      </text>
      <scrollbox flexGrow={1}>
        <box flexDirection="column">
          {shortcuts.map(([key, label]) => (
            <text key={key} fg={colors.controlsText}>
              <span fg={colors.keyHighlight}>[{key}]</span> {t(label)}
            </text>
          ))}
        </box>
      </scrollbox>
      <text fg={colors.dim} marginTop={1}>
        <span fg={colors.keyHighlight}>[Esc]</span> {t("modal.or")} <span fg={colors.keyHighlight}>[h]</span> {t("modal.closeHelp")}
      </text>
    </box>
  );
}
