import { createCliRenderer } from "@opentui/core";
import { createRoot } from "@opentui/react";
import App from "./app";

async function main() {
  const renderer = await createCliRenderer({
    exitOnCtrlC: false,
    exitSignals: ["SIGINT", "SIGTERM"],
  });
  createRoot(renderer).render(<App />);
}

main();
