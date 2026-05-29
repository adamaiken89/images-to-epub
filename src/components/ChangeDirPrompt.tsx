import { createTextAttributes } from '@opentui/core';
import { useStore } from '@store';
import { colors } from '@utils/colors';
import { t } from '@utils/i18n';

const BOLD = createTextAttributes({ bold: true });

export function ChangeDirPrompt() {
  const changeDirMode = useStore((s) => s.changeDirMode);
  const browser = useStore((s) => s.browser);

  if (!changeDirMode) {return null;}

  const items = browser.items.length === 0 ? (
    <text fg={colors.dim}>{t("prompt.empty")}</text>
  ) : (
    browser.items.map((item, idx) => {
      const cursorIdx = idx + 1;
      const isFocused = browser.cursor === cursorIdx;
      return (
        <text
          key={item.name}
          fg={isFocused ? colors.focusFg : colors.treeItem}
          bg={isFocused ? colors.focusBg : "transparent"}
          attributes={isFocused ? BOLD : undefined}
        >
          {"  "}{isFocused ? `\u25B6` : " "} {item.hasContent ? t("prompt.hasContent") : t("prompt.noContent")} {item.name}
        </text>
      );
    })
  );

  return (
    <box border borderColor={colors.keyHighlight} padding={1} marginBottom={1} flexDirection="column">
      <text fg={colors.modalHeader} attributes={BOLD} marginBottom={1}>
        {t("prompt.title")}
      </text>
      <text fg={colors.dynamicValue} wrapMode="word">
        {browser.dir}
      </text>
      <scrollbox flexGrow={1}>
        <text
          fg={browser.cursor === 0 ? colors.focusFg : colors.dim}
          bg={browser.cursor === 0 ? colors.focusBg : "transparent"}
          attributes={browser.cursor === 0 ? BOLD : undefined}
        >
          {"  "}{browser.cursor === 0 ? `\u25B6` : " "} {t("prompt.selectHere")}
        </text>
        {items}
      </scrollbox>
      <text marginTop={1} fg={colors.dim}>
        {t("prompt.navHint")}
      </text>
    </box>
  );
}
