import extractZip from "extract-zip";
import { join, dirname, basename } from "path";

export async function unzipFile(zipPath: string): Promise<{ success: boolean; message: string }> {
  const folderName = basename(zipPath, ".zip");
  const extractDir = join(dirname(zipPath), folderName);

  try {
    await extractZip(zipPath, { dir: extractDir });
    return { success: true, message: `Extracted: ${basename(zipPath)}` };
  } catch (err) {
    const msg = (err as Error).message;
    if (msg.includes("invalid")) {
      return { success: false, message: `Bad zip file: ${basename(zipPath)}` };
    }
    return { success: false, message: `Error extracting ${basename(zipPath)}: ${msg}` };
  }
}
