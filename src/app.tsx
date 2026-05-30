import { useEffect } from "react";
import { useKeyboard, useRenderer } from "@opentui/react";
import { useStore } from "./store";
import { handleKey } from "./store/handlers/keymap";
import { Header } from "./components/Header";
import { HelpModal } from "./components/HelpModal";
import { ConfigModal } from "./components/ConfigModal";
import { ChangeDirPrompt } from "./components/ChangeDirPrompt";
import { RenamePrompt } from "./components/RenamePrompt";
import { AuthorPrompt } from "./components/AuthorPrompt";
import { TreeView } from "./components/TreeView";
import { InfoMessage } from "./components/InfoMessage";
import { ProgressDashboard } from "./components/ProgressDashboard";
import { SummaryModal } from "./components/SummaryModal";
import { ErrorBoundary } from "./components/ErrorBoundary";

export default function App() {
  const renderer = useRenderer();
  const init = useStore((s) => s.init);
  const isProcessing = useStore((s) => s.isProcessing);
  const showModal = useStore((s) => s.changeDirMode || s.showHelp || s.showConfig);

  useEffect(() => {
    init();
  }, [init]);

  useKeyboard(
    (key) => {
      handleKey(key, { renderer, getState: useStore.getState, setState: useStore.setState });
    },
    { release: false }
  );

  return (
    <box flexDirection="column" height="100%" padding={1}>
      <ErrorBoundary>
        <box flexShrink={0}><Header /></box>
        <ChangeDirPrompt />
        <RenamePrompt />
        <AuthorPrompt />
        <HelpModal />
        <ConfigModal />
        <SummaryModal />
        {isProcessing ? <ProgressDashboard /> : null}
        {showModal ? null : <TreeView />}
        <box flexShrink={0}><InfoMessage /></box>
      </ErrorBoundary>
    </box>
  );
}
