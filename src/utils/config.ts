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
  const result: ReturnType<typeof parseArgs> = {
    noConfig: false,
    initConfig: false,
  };

  let i = 0;
  while (i < argv.length) {
    const arg = argv[i];
    const eqIdx = arg.indexOf("=");
    if (arg.startsWith("--")) {
      const key = eqIdx >= 0 ? arg.slice(2, eqIdx) : arg.slice(2);
      const val = eqIdx >= 0 ? arg.slice(eqIdx + 1) : (i + 1 < argv.length && !argv[i + 1].startsWith("-") ? argv[i + 1] : undefined);

      switch (key) {
        case "output-dir":
        case "o":
          if (val) {result.outputDir = val;}
          if (!eqIdx) {i++;}
          break;
        case "format":
        case "f":
          if (val === "epub" || val === "kepub" || val === "both") {result.format = val;}
          if (!eqIdx) {i++;}
          break;
        case "parallel":
        case "p":
          if (val) {result.parallel = parseInt(val, 10);}
          if (!eqIdx) {i++;}
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
          if (val) {result.configPath = val;}
          if (!eqIdx) {i++;}
          break;
      }
    } else if (arg.startsWith("-") && arg.length === 2) {
      const key = arg.slice(1);
      const val = i + 1 < argv.length && !argv[i + 1].startsWith("-") ? argv[i + 1] : undefined;

      switch (key) {
        case "o":
          if (val) {result.outputDir = val;}
          i++;
          break;
        case "f":
          if (val === "epub" || val === "kepub" || val === "both") {result.format = val;}
          i++;
          break;
        case "p":
          if (val) {result.parallel = parseInt(val, 10);}
          i++;
          break;
      }
    } else if (!result.dir) {
      result.dir = arg;
    }
    i++;
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
