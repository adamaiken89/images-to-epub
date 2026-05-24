import { memo } from "react";
import { createTextAttributes } from "@opentui/core";
import type { TreeItem } from "../store";
import { colors } from "../utils/colors";
import { text } from "../utils/text";

const BOLD = createTextAttributes({ bold: true });

function TreeItemRowRaw({ item, isFocused }: { item: TreeItem; isFocused: boolean }) {
  const indent = "  ".repeat(item.depth);
  const checkbox = item.checked ? text.tree.checkboxOn : text.tree.checkboxOff;
  const line = `${indent}${checkbox} ${item.label}`;

  return (
    <text
      fg={isFocused ? colors.focusFg : item.isZip ? colors.treeItemZip : colors.treeItem}
      bg={isFocused ? colors.focusBg : "transparent"}
      attributes={isFocused ? BOLD : undefined}
    >
      {line}
    </text>
  );
}

export const TreeItemRow = memo(TreeItemRowRaw);
