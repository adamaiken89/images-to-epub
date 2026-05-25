import { readdir, rename } from "fs/promises";
import { join, basename, extname } from "path";
import { randomUUID } from "crypto";

const VALID_IMAGE_EXTS = new Set([".webp", ".jpg", ".jpeg", ".png"]);

export function extractNumericPrefix(name: string): [string | null, string | null] {
  let idx = 0;
  while (idx < name.length && name[idx].match(/\d/)) {
    idx++;
  }
  if (idx === 0) {
    return [null, null];
  }
  return [name.slice(0, idx), name.slice(idx)];
}

export async function padImageFilenames(imgDir: string): Promise<{ success: boolean; message: string }> {
  try {
    await readdir(imgDir);
  } catch (err) {
    const msg = (err as Error).message;
    if (msg.includes("permission")) {
      return { success: false, message: `Permission denied: ${imgDir}` };
    }
    return { success: false, message: `Error reading folder: ${msg}` };
  }

  const allFiles = await readdir(imgDir);
  const numericImages: Array<[string, string, string, string]> = [];

  for (const f of allFiles) {
    const ext = extname(f).toLowerCase();
    if (!VALID_IMAGE_EXTS.has(ext)) {continue;}
    const name = basename(f, ext);
    const [prefix, suffix] = extractNumericPrefix(name);
    if (prefix !== null) {
      numericImages.push([f, prefix, suffix ?? "", ext]);
    }
  }

  if (numericImages.length === 0) {
    return { success: true, message: `Skipped (no numeric-prefixed images): ${basename(imgDir)}` };
  }

  const maxWidth = Math.max(...numericImages.map(([, prefix]) => prefix.length));

  if (numericImages.every(([, prefix]) => prefix.length === maxWidth)) {
    return { success: true, message: `Already padded: ${basename(imgDir)}` };
  }

  const renamePlan: Array<[string, string]> = [];
  for (const [original, prefix, suffix, ext] of numericImages) {
    const paddedName = prefix.padStart(maxWidth, "0") + suffix + ext;
    if (original !== paddedName) {
      renamePlan.push([original, paddedName]);
    }
  }

  // Two-pass rename via temp names to avoid collisions
  const tmpNames = new Map<string, string>();
  try {
    for (const [original] of renamePlan) {
      const tmp = `__pad_tmp_${randomUUID().replace(/-/g, "")}_${original}`;
      await rename(join(imgDir, original), join(imgDir, tmp));
      tmpNames.set(original, tmp);
    }

    for (const [original, padded] of renamePlan) {
      const tmp = tmpNames.get(original);
      if (!tmp) {throw new Error(`Missing temp name for ${original}`);}
      await rename(join(imgDir, tmp), join(imgDir, padded));
    }

    return { success: true, message: `Padded ${renamePlan.length} file(s) in ${basename(imgDir)}` };
  } catch (err) {
    return { success: false, message: `Error renaming files: ${(err as Error).message}` };
  }
}
