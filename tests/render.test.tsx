import { describe, it, expect } from "bun:test";
import { testRender } from "@opentui/react/test-utils";
import { Header } from "../src/components/Header";
import { InfoMessage } from "../src/components/InfoMessage";
import { HelpModal } from "../src/components/HelpModal";
import { useStore } from "../src/store";

async function render(node: any, width = 60, height = 10) {
  const { captureCharFrame, renderOnce } = await testRender(node, { width, height });
  await renderOnce();
  return captureCharFrame();
}

describe("component rendering", () => {
  it("renders a box with text", async () => {
    const frame = await render(<box><text>Hello World</text></box>);
    expect(frame).toContain("Hello World");
  });

  it("renders two texts in a box", async () => {
    const frame = await render(
      <box flexDirection="column">
        <text>Line One</text>
        <text>Line Two</text>
      </box>
    );
    expect(frame).toContain("Line One");
    expect(frame).toContain("Line Two");
  });

  it("renders text with underline", async () => {
    const frame = await render(<text><u>/some/path</u></text>);
    expect(frame).toContain("/some/path");
  });

  it("renders text with colored spans", async () => {
    const frame = await render(
      <text>Found <span fg="#ffcc00">3</span> folder(s)</text>
    );
    expect(frame).toContain("Found 3 folder(s)");
  });

  it("renders Header with title and directory", async () => {
    useStore.setState({ baseDir: "/test/path" });
    const frame = await render(<Header />);
    expect(frame).toContain("EPUB Generator");
    expect(frame).toContain("/test/path");
  });

  it("renders Header when baseDir is empty", async () => {
    useStore.setState({ baseDir: "" });
    const frame = await render(<Header />);
    expect(frame).toContain("EPUB Generator");
    expect(frame).toContain("No directory selected");
  });

  it("renders InfoMessage with counts", async () => {
    useStore.setState({ folderCount: 5, zipCount: 2, showHelp: false });
    const frame = await render(<InfoMessage />);
    expect(frame).toContain("5");
    expect(frame).toContain("folder(s)");
    expect(frame).toContain("2");
    expect(frame).toContain("zip(s)");
    expect(frame).toContain("[h]");
    expect(frame).toContain("help");
  });

  it("renders InfoMessage with hide when help is shown", async () => {
    useStore.setState({ folderCount: 1, zipCount: 0, showHelp: true });
    const frame = await render(<InfoMessage />);
    expect(frame).toContain("[h]");
    expect(frame).toContain("hide");
  });

  it("renders InfoMessage with status message when no results", async () => {
    useStore.setState({
      folderCount: 0,
      zipCount: 0,
      status: { type: "info", message: "No folders found." },
    });
    const frame = await render(<InfoMessage />);
    expect(frame).toContain("No folders found.");
  });

  it("renders HelpModal with shortcuts", async () => {
    const frame = await render(<HelpModal />);
    expect(frame).toContain("Keyboard Shortcuts");
    expect(frame).toContain("[Space]");
    expect(frame).toContain("[p]");
    expect(frame).toContain("[Esc]");
  });
});
