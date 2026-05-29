import { memo } from "react";
import { createTextAttributes } from "@opentui/core";
import type { TreeItem } from "@store";
import { colors } from "@utils/colors";
import { t } from "@utils/i18n";

const BOLD = createTextAttributes({ bold: true });

function TreeItemRowRaw({ item, isFocused, parentSelected }: { item: TreeItem; isFocused: boolean; parentSelected: boolean }) {
  const indent = "  ".repeat(item.depth);
  const checkbox = item.checked ? t("tree.checkboxOn") : item.excluded ? t("tree.checkboxSkip") : parentSelected ? t("tree.checkboxImplicit") : t("tree.checkboxOff");
  let label = item.label;

  // Show (empty) for folders with no images and no subfolders
  if (!item.isZip && item.entry && !item.entry.metadata.hasImages && !item.entry.metadata.hasSubfolders && !item.entry.metadata.hasZips) {
    label += ` ${t("tree.empty")}`;
  }

  const line = `${indent}${checkbox} ${label}`;

  let fg: string;
  if (isFocused) {
    fg = colors.focusFg;
  } else if (item.checked) {
    fg = colors.checkboxOn;
  } else if (item.excluded) {
    fg = colors.checkboxSkip;
  } else if (parentSelected) {
    fg = colors.checkboxImplicit;
  } else {
    fg = item.isZip ? colors.treeItemZip : colors.treeItem;
  }

  return (
    <text
      fg={fg}
      bg={isFocused ? colors.focusBg : "transparent"}
      attributes={isFocused ? BOLD : undefined}
    >
      {line}
    </text>
  );
}

export const TreeItemRow = memo(TreeItemRowRaw);
