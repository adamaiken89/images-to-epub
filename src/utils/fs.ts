import { readdir, stat } from "fs/promises";
import { join, relative, normalize, dirname, sep } from "path";
import { homedir } from "os";

export const VALID_IMAGE_EXTS = new Set([".webp", ".jpg", ".jpeg", ".png"]);

export interface FolderMetadata {
  hasImages: boolean;
  hasSubfolders: boolean;
  hasZips: boolean;
}

export interface FolderEntry {
  parts: string[];
  path: string;
  metadata: FolderMetadata;
}

export async function findFoldersWithImages(
  baseDir: string
): Promise<{ foldersWithImages: string[]; allFolders: Map<string, FolderMetadata> }> {
  const foldersWithImages: string[] = [];
  const allFolders = new Map<string, FolderMetadata>();

  if (!baseDir) {
    return { foldersWithImages, allFolders };
  }

  try {
    await stat(baseDir);
  } catch {
    return { foldersWithImages, allFolders };
  }

  async function scan(dir: string) {
    let hasImages = false;
    let hasZips = false;

    try {
      const entries = await readdir(dir, { withFileTypes: true });
      for (const entry of entries) {
        const name = entry.name.toLowerCase();
        if (entry.isFile()) {
          const ext = name.slice(name.lastIndexOf("."));
          if (VALID_IMAGE_EXTS.has(ext)) {hasImages = true;}
          if (name.endsWith(".zip")) {hasZips = true;}
        }
      }
    } catch {
      // permission denied or error reading
    }

    if (hasImages) {
      foldersWithImages.push(dir);
    }
    allFolders.set(dir, { hasImages, hasSubfolders: false, hasZips });

    try {
      const entries = await readdir(dir, { withFileTypes: true });
      for (const entry of entries) {
        if (entry.isDirectory()) {
          const subdir = join(dir, entry.name);
          await scan(subdir);
        }
      }
    } catch {
      // permission denied
    }
  }

  await scan(baseDir);

  // Second pass: mark ancestors
  const visibleFolders = Array.from(allFolders.entries())
    .filter(([, m]) => m.hasImages || m.hasZips)
    .map(([p]) => p);

  const baseDirNorm = normalize(baseDir);
  for (const folderPath of visibleFolders) {
    let parent = dirname(folderPath);
    while (parent) {
      const parentNorm = normalize(parent);
      if (parentNorm === baseDirNorm) {break;}
      if (!parentNorm.startsWith(baseDirNorm + sep) && parentNorm !== baseDirNorm) {break;}

      const meta = allFolders.get(parentNorm);
      if (meta) {
        meta.hasSubfolders = true;
      } else {
        allFolders.set(parentNorm, { hasImages: false, hasSubfolders: true, hasZips: false });
      }
      parent = dirname(parent);
    }
  }

  return { foldersWithImages, allFolders };
}

export function organizeFoldersByHierarchy(
  allFolders: Map<string, FolderMetadata>,
  baseDir: string
): Map<string, FolderEntry> {
  const result = new Map<string, FolderEntry>();
  for (const [folderPath, metadata] of allFolders) {
    if (metadata.hasImages || metadata.hasSubfolders || metadata.hasZips) {
      const relPath = relative(baseDir, folderPath);
      if (relPath === "") {continue;} // Skip the base dir itself
      const parts = relPath.split(sep);
      result.set(relPath, { parts, path: folderPath, metadata });
    }
  }
  return result;
}

export async function findZipFiles(baseDir: string): Promise<string[]> {
  const zipFiles: string[] = [];
  if (!baseDir) {return zipFiles;}

  try {
    await stat(baseDir);
  } catch {
    return zipFiles;
  }

  async function scan(dir: string) {
    try {
      const entries = await readdir(dir, { withFileTypes: true });
      for (const entry of entries) {
        if (entry.isFile() && entry.name.toLowerCase().endsWith(".zip")) {
          zipFiles.push(join(dir, entry.name));
        } else if (entry.isDirectory()) {
          await scan(join(dir, entry.name));
        }
      }
    } catch {
      // permission denied
    }
  }

  await scan(baseDir);
  return zipFiles.sort();
}

export function getSubfoldersWithImages(
  folderPath: string,
  foldersWithImages: string[]
): string[] {
  const folderPathNorm = normalize(folderPath);
  return foldersWithImages.filter((imgFolder) => {
    const imgFolderNorm = normalize(imgFolder);
    return (
      imgFolderNorm !== folderPathNorm && imgFolderNorm.startsWith(folderPathNorm + sep)
    );
  });
}

export async function getSubdirs(dir: string): Promise<string[]> {
  try {
    const entries = await readdir(dir, { withFileTypes: true });
    return entries
      .filter((e) => e.isDirectory() && !e.name.startsWith("."))
      .map((e) => e.name)
      .sort();
  } catch {
    return [];
  }
}

export async function findDefaultBaseDir(): Promise<string> {
  return join(homedir(), "Downloads");
}
