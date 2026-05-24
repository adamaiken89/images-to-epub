import { Component, type ErrorInfo, type ReactNode } from "react";
import { createTextAttributes } from "@opentui/core";
import { colors } from "../utils/colors";

const BOLD = createTextAttributes({ bold: true });

interface Props {
  children: ReactNode;
}

interface State {
  error: Error | null;
}

export class ErrorBoundary extends Component<Props, State> {
  state: State = { error: null };

  static getDerivedStateFromError(error: Error): State {
    return { error };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error("ErrorBoundary caught:", error, info.componentStack);
  }

  render() {
    if (this.state.error) {
      return (
        <box flexDirection="column" height="100%" padding={1}>
          <text fg={colors.statusError} attributes={BOLD} marginBottom={1}>
            Unexpected Error
          </text>
          <text fg={colors.errorMessage}>{this.state.error.message}</text>
        </box>
      );
    }
    return this.props.children;
  }
}
