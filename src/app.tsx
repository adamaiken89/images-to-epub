import { useEffect } from "react";
import { useKeyboard, useRenderer } from "@opentui/react";
import { useStore } from "./store";
import { handleKey } from "./store/handlers/keymap";
import { Header } from "./components/Header";
import { ControlsHint } from "./components/ControlsHint";
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
      const { isProcessing, changeDirMode, items, focusIndex } = useStore.getState();
      handleKey(key, { renderer, isProcessing, changeDirMode, itemsLength: items.length, focusIndex });
    },
    { release: false }
  );

  return (
    <box flexDirection="column" height="100%" padding={1}>
      <ErrorBoundary>
        <Header />
        <ControlsHint />
        <ChangeDirPrompt />
        <TreeView />
        <InfoMessage />
        <StatusBar />
      </ErrorBoundary>
    </box>
  );
}
