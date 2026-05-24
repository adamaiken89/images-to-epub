import extractZip from "extract-zip";
import { join, dirname, basename } from "path";
import { readdir, rename, rmdir } from "fs/promises";

async function flattenExtractDir(extractDir: string): Promise<void> {
  const entries = await readdir(extractDir, { withFileTypes: true });
  const subdirs = entries.filter((e) => e.isDirectory());
  const files = entries.filter((e) => e.isFile());

  // If there's exactly one subdirectory and no files at the top level,
  // move all contents from that subdirectory up to extractDir.
  if (subdirs.length === 1 && files.length === 0) {
    const subdirName = subdirs[0].name;
    const subdirPath = join(extractDir, subdirName);
    const subEntries = await readdir(subdirPath, { withFileTypes: true });

    for (const entry of subEntries) {
      await rename(
        join(subdirPath, entry.name),
        join(extractDir, entry.name)
      );
    }

    await rmdir(subdirPath);
  }
}

export async function unzipFile(zipPath: string): Promise<{ success: boolean; message: string }> {
  const folderName = basename(zipPath, ".zip");
  const extractDir = join(dirname(zipPath), folderName);

  try {
    await extractZip(zipPath, { dir: extractDir });
    await flattenExtractDir(extractDir);
    return { success: true, message: `Extracted: ${basename(zipPath)}` };
  } catch (err) {
    const msg = (err as Error).message;
    if (msg.includes("invalid") || msg.includes("end of central directory") || msg.includes("signature")) {
      return { success: false, message: `Bad zip file: ${basename(zipPath)}` };
    }
    return { success: false, message: `Error extracting ${basename(zipPath)}: ${msg}` };
  }
}
