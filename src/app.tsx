import { useEffect } from "react";
import { useKeyboard, useRenderer } from "@opentui/react";
import { useStore } from "./store";
import { handleKey } from "./store/handlers/keymap";
import { Header } from "./components/Header";
import { HelpModal } from "./components/HelpModal";
import { ChangeDirPrompt } from "./components/ChangeDirPrompt";
import { TreeView } from "./components/TreeView";
import { InfoMessage } from "./components/InfoMessage";
import { StatusBar } from "./components/StatusBar";
import { ErrorBoundary } from "./components/ErrorBoundary";

export default function App() {
  const renderer = useRenderer();
  const init = useStore((s) => s.init);

  useEffect(() => {
    init();
  }, [init]);

  useKeyboard(
    (key) => {
      const { isProcessing, changeDirMode, showHelp, items, focusIndex } = useStore.getState();
      handleKey(key, { renderer, isProcessing, changeDirMode, showHelp, itemsLength: items.length, focusIndex });
    },
    { release: false }
  );

  return (
    <box flexDirection="column" height="100%" padding={1}>
      <ErrorBoundary>
        <Header />
        <HelpModal />
        <ChangeDirPrompt />
        <TreeView />
        <InfoMessage />
        <StatusBar />
      </ErrorBoundary>
    </box>
  );
}
