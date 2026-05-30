import { createCliRenderer } from "@opentui/core";
import { createRoot } from "@opentui/react";
import { parseArgs, loadConfig, writeDefaultConfig } from "@utils/config";
import { useStore } from "@store";
import App from "./app";

async function main() {
  const args = parseArgs();

  if (args.initConfig) {
    await writeDefaultConfig(args.configPath);
    console.error(`Config written to ${args.configPath || "~/.img2epubrc"}`);
    process.exit(0);
  }

  let config;
  if (args.noConfig) {
    config = { outputFormat: "epub" as const };
  } else {
    config = await loadConfig(args.configPath);
  }
  const outputFormat = (args.format || config.outputFormat) as "epub" | "kepub" | "both";
  useStore.setState({ outputFormat });

  const renderer = await createCliRenderer({
    exitOnCtrlC: false,
    exitSignals: ["SIGINT", "SIGTERM"],
  });
  createRoot(renderer).render(<App />);
}

main();
