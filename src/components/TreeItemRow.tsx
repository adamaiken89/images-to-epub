import { memo } from "react";
import { createTextAttributes } from "@opentui/core";
import type { TreeItem } from "../store";
import { colors } from "../utils/colors";

const BOLD = createTextAttributes({ bold: true });

function TreeItemRowRaw({ item, isFocused }: { item: TreeItem; isFocused: boolean }) {
  const indent = "  ".repeat(item.depth);
  const checkbox = item.checked ? "[x]" : "[ ]";
  const line = item.isSelectAll
    ? `${checkbox} ${item.label}`
    : `${indent}${checkbox} ${item.label}`;

  return (
    <text
      fg={isFocused ? colors.focusFg : item.isZip ? colors.treeItemZip : item.isSelectAll ? colors.treeItemSelectAll : colors.treeItem}
      bg={isFocused ? colors.focusBg : "transparent"}
      attributes={isFocused || item.isSelectAll ? BOLD : undefined}
    >
      {line}
    </text>
  );
}

export const TreeItemRow = memo(TreeItemRowRaw);
