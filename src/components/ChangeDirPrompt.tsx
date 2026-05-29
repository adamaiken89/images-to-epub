import { createTextAttributes } from '@opentui/core';
import { useStore } from '@store';
import { colors } from '@utils/colors';
import { t } from '@utils/i18n';

const BOLD = createTextAttributes({ bold: true });

export function ChangeDirPrompt() {
  const changeDirMode = useStore((s) => s.changeDirMode);
  const browseDir = useStore((s) => s.browseDir);
  const browseItems = useStore((s) => s.browseItems);
  const browseCursor = useStore((s) => s.browseCursor);

  if (!changeDirMode) {return null;}

  const items = browseItems.length === 0 ? (
    <text fg={colors.dim}>{t("prompt.empty")}</text>
  ) : (
    browseItems.map((item, idx) => {
      const cursorIdx = idx + 1;
      const isFocused = browseCursor === cursorIdx;
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
        {browseDir}
      </text>
      <scrollbox flexGrow={1}>
        <text
          fg={browseCursor === 0 ? colors.focusFg : colors.dim}
          bg={browseCursor === 0 ? colors.focusBg : "transparent"}
          attributes={browseCursor === 0 ? BOLD : undefined}
        >
          {"  "}{browseCursor === 0 ? `\u25B6` : " "} {t("prompt.selectHere")}
        </text>
        {items}
      </scrollbox>
      <text marginTop={1} fg={colors.dim}>
        {t("prompt.navHint")}
      </text>
    </box>
  );
}
