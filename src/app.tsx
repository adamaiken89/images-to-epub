import { useEffect } from "react";
import { useKeyboard, useRenderer } from "@opentui/react";
import { useStore } from "./store";
import { handleKey } from "./store/handlers/keymap";
import { Header } from "./components/Header";
import { HelpModal } from "./components/HelpModal";
import { ChangeDirPrompt } from "./components/ChangeDirPrompt";
import { RenamePrompt } from "./components/RenamePrompt";
import { TreeView } from "./components/TreeView";
import { InfoMessage } from "./components/InfoMessage";
import { StatusBar } from "./components/StatusBar";
import { ErrorBoundary } from "./components/ErrorBoundary";

export default function App() {
  const renderer = useRenderer();
  const init = useStore((s) => s.init);
  const showHelp = useStore((s) => s.showHelp);

  useEffect(() => {
    init();
  }, [init]);

  useKeyboard(
    (key) => {
      const { isProcessing, changeDirMode, renameMode, showHelp, items, focusIndex } = useStore.getState();
      handleKey(key, { renderer, isProcessing, changeDirMode, renameMode, showHelp, itemsLength: items.length, focusIndex, getState: useStore.getState, setState: useStore.setState });
    },
    { release: false }
  );

  return (
    <box flexDirection="column" height="100%" padding={1}>
      <ErrorBoundary>
        <box flexShrink={0}><Header /></box>
        <ChangeDirPrompt />
        <RenamePrompt />
        {showHelp ? <HelpModal /> : <TreeView />}
        <box flexShrink={0}><InfoMessage /></box>
        <box flexShrink={0}><StatusBar /></box>
      </ErrorBoundary>
    </box>
  );
}
