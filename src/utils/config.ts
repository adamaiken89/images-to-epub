import { readFile, writeFile, mkdir } from "fs/promises";
import { homedir, cpus } from "os";
import { join } from "path";

export interface AppConfig {
  defaultBaseDir: string;
  outputDir: string;
  outputFormat: "epub" | "kepub" | "both";
  parallelism: number;
  skipExisting: boolean;
  authorDetection: "folder" | "prompt" | "none";
  imageFormats: string[];
  theme: string;
}

const DEFAULT_CONFIG: AppConfig = {
  defaultBaseDir: join(homedir(), "Downloads"),
  outputDir: join(homedir(), "Downloads"),
  outputFormat: "epub",
  parallelism: 4,
  skipExisting: true,
  authorDetection: "folder",
  imageFormats: [".webp", ".jpg", ".jpeg", ".png"],
  theme: "default",
};

export function getConfigPath(customPath?: string): string {
  if (customPath) {return customPath;}
  return join(homedir(), ".img2epubrc");
}

type ArgsResult = ReturnType<typeof parseArgs>;

function parseArgValue(argv: string[], i: number): { key: string; value: string | undefined; skipNext: boolean } {
  const arg = argv[i];
  const eqIdx = arg.indexOf("=");
  const prefixLen = arg.startsWith("--") ? 2 : 1;
  if (eqIdx >= 0) {
    return { key: arg.slice(prefixLen, eqIdx), value: arg.slice(eqIdx + 1), skipNext: false };
  }
  const nextVal = i + 1 < argv.length && !argv[i + 1].startsWith("-") ? argv[i + 1] : undefined;
  return { key: arg.slice(prefixLen), value: nextVal, skipNext: !!nextVal };
}

function applyFlag(key: string, value: string | undefined, result: ArgsResult): void {
  switch (key) {
    case "output-dir":
    case "o":
      if (value) {result.outputDir = value;}
      break;
    case "format":
    case "f":
      if (value === "epub" || value === "kepub" || value === "both") {result.format = value;}
      break;
    case "parallel":
    case "p":
      if (value) {result.parallel = parseInt(value, 10);}
      break;
    case "skip-existing":
      result.skipExisting = true;
      break;
    case "no-config":
      result.noConfig = true;
      break;
    case "init-config":
      result.initConfig = true;
      break;
    case "config":
      if (value) {result.configPath = value;}
      break;
  }
}

export function parseArgs(): {
  dir?: string;
  outputDir?: string;
  format?: "epub" | "kepub" | "both";
  parallel?: number;
  skipExisting?: boolean;
  configPath?: string;
  noConfig: boolean;
  initConfig: boolean;
} {
  const argv = process.argv.slice(2);
  const result: ArgsResult = { noConfig: false, initConfig: false };

  for (let i = 0; i < argv.length; i++) {
    const arg = argv[i];
    if (arg.startsWith("-") && arg.length >= 2) {
      const { key, value, skipNext } = parseArgValue(argv, i);
      applyFlag(key, value, result);
      if (skipNext) {i++;}
    } else if (!result.dir) {
      result.dir = arg;
    }
  }

  return result;
}

export async function loadConfig(customPath?: string): Promise<AppConfig> {
  const configPath = getConfigPath(customPath);
  try {
    const data = await readFile(configPath, "utf-8");
    const parsed = JSON.parse(data) as Partial<AppConfig>;
    return { ...DEFAULT_CONFIG, ...parsed };
  } catch {
    await writeDefaultConfig(customPath);
    return { ...DEFAULT_CONFIG };
  }
}

export async function writeDefaultConfig(customPath?: string): Promise<void> {
  const configPath = getConfigPath(customPath);
  const dir = configPath.slice(0, configPath.lastIndexOf("/"));
  try {
    await mkdir(dir, { recursive: true });
  } catch {}
  await writeFile(configPath, JSON.stringify(DEFAULT_CONFIG, null, 2), "utf-8");
}

export async function saveConfig(partial: Partial<AppConfig>, customPath?: string): Promise<void> {
  const existing = await loadConfig(customPath);
  const merged = { ...existing, ...partial };
  const configPath = getConfigPath(customPath);
  await writeFile(configPath, JSON.stringify(merged, null, 2), "utf-8");
}

export function clampParallelism(p: number): number {
  const cpuCount = cpus().length;
  return Math.max(1, Math.min(p, cpuCount));
}
