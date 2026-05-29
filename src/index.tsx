import { createCliRenderer } from "@opentui/core";
import { createRoot } from "@opentui/react";
import { parseArgs, writeDefaultConfig } from "@utils/config";
import App from "./app";

async function main() {
  const args = parseArgs();

  if (args.initConfig) {
    await writeDefaultConfig(args.configPath);
    console.error(`Config written to ${args.configPath || "~/.img2epubrc"}`);
    process.exit(0);
  }

  const renderer = await createCliRenderer({
    exitOnCtrlC: false,
    exitSignals: ["SIGINT", "SIGTERM"],
  });
  createRoot(renderer).render(<App />);
}

main();
