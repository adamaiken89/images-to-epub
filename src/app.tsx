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
import { StatusBar } from "./components/StatusBar";
import { ProgressDashboard } from "./components/ProgressDashboard";
import { SummaryOverlay } from "./components/SummaryOverlay";
import { ErrorBoundary } from "./components/ErrorBoundary";

export default function App() {
  const renderer = useRenderer();
  const init = useStore((s) => s.init);
  const showHelp = useStore((s) => s.showHelp);
  const showConfig = useStore((s) => s.showConfig);
  const changeDirMode = useStore((s) => s.changeDirMode);
  const showSummary = useStore((s) => s.showSummary);
  const isProcessing = useStore((s) => s.isProcessing);

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
        {showSummary ? <SummaryOverlay />
          : changeDirMode ? null
          : showConfig ? <ConfigModal />
          : showHelp ? <HelpModal />
          : (
            <>
              {isProcessing ? <ProgressDashboard /> : null}
              <TreeView />
            </>
          )}
        <box flexShrink={0}>{changeDirMode ? null : showSummary || showConfig || showHelp ? null : <InfoMessage />}</box>
        <box flexShrink={0}><StatusBar /></box>
      </ErrorBoundary>
    </box>
  );
}
