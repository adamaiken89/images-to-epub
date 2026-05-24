import { createWriteStream, promises as fs } from "fs";
import { basename, dirname, join } from "path";
import { pipeline, type Readable } from "stream";
import { promisify } from "util";
import yauzl from "yauzl";

const pipelineAsync = promisify(pipeline);

function openZipPromise(
  path: string,
  opts: yauzl.Options,
): Promise<yauzl.ZipFile> {
  return new Promise((resolve, reject) => {
    yauzl.open(path, opts, (err, zipfile) => {
      if (err) {reject(err);}
      else {resolve(zipfile);}
    });
  });
}

function openReadStreamPromise(
  zipfile: yauzl.ZipFile,
  entry: yauzl.Entry,
): Promise<Readable> {
  return new Promise((resolve, reject) => {
    zipfile.openReadStream(entry, (err, stream) => {
      if (err) {reject(err);}
      else {resolve(stream);}
    });
  });
}

function decodeFilename(raw: Buffer, generalPurposeBitFlag: number): string {
  // Bit 11 of general purpose bit flag = UTF-8 language encoding
  const utf8Flag = (generalPurposeBitFlag & 0x800) !== 0;

  if (utf8Flag) {
    return raw.toString("utf-8");
  }

  // No UTF-8 flag set. Many modern tools write UTF-8 without the flag.
  const utf8Str = raw.toString("utf-8");
  const hasReplacement = utf8Str.includes("\uFFFD"); // invalid UTF-8 bytes
  const hasCJK = /[\u4e00-\u9fff\u3040-\u309f\u30a0-\u30ff]/.test(utf8Str);
  const hasNonASCII = raw.some((b) => b >= 0x80);

  if (!hasReplacement && (hasCJK || hasNonASCII)) {
    // Valid UTF-8 with non-ASCII text → assume UTF-8
    return utf8Str;
  }

  // Invalid UTF-8 or no recognizable characters → try Shift_JIS (legacy Japanese zips)
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const sjis = new TextDecoder("shift_jis" as any, { fatal: false }).decode(
    raw,
  );

  const sjisHasCJK = /[\u4e00-\u9fff\u3040-\u309f\u30a0-\u30ff]/.test(sjis);
  if (sjisHasCJK) {return sjis;}

  // Fallback: CP437 (what yauzl defaults to, approximated by ISO-8859-1)
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return new TextDecoder("iso-8859-1" as any).decode(raw);
}

async function extractZipFile(
  zipPath: string,
  extractDir: string,
): Promise<void> {
  const zipfile = await openZipPromise(zipPath, {
    lazyEntries: true,
    decodeStrings: false,
  });

  await fs.mkdir(extractDir, { recursive: true });

  return new Promise((resolve, reject) => {
    zipfile.on("error", (err) => {
      zipfile.close();
      reject(err);
    });

    zipfile.on("close", () => {
      resolve();
    });

    zipfile.readEntry();

    zipfile.on("entry", async (entry: yauzl.Entry) => {
      const rawName = entry.fileName as unknown as Buffer;
      const decodedName = decodeFilename(rawName, entry.generalPurposeBitFlag);

      // Skip macOS resource forks
      if (decodedName.startsWith("__MACOSX/")) {
        zipfile.readEntry();
        return;
      }

      const dest = join(extractDir, decodedName);
      const destParent = dirname(dest);

      // Path traversal guard
      const relativePath = dest.slice(extractDir.length + 1);
      if (relativePath.split("/").includes("..")) {
        zipfile.close();
        reject(
          new Error(
            `Out of bound path "${dest}" found while processing file ${decodedName}`,
          ),
        );
        return;
      }

      const isDir = decodedName.endsWith("/");

      try {
        if (isDir) {
          await fs.mkdir(dest, { recursive: true });
        } else {
          await fs.mkdir(destParent, { recursive: true });
          const writeStream = createWriteStream(dest);
          const readStream = await openReadStreamPromise(zipfile, entry);
          await pipelineAsync(readStream, writeStream);
        }
        zipfile.readEntry();
      } catch (err) {
        zipfile.close();
        reject(err);
      }
    });
  });
}

async function flattenExtractDir(extractDir: string): Promise<void> {
  const entries = await fs.readdir(extractDir, { withFileTypes: true });
  const subdirs = entries.filter((e) => e.isDirectory());
  const files = entries.filter((e) => e.isFile());

  // If there's exactly one subdirectory and no files at the top level,
  // move all contents from that subdirectory up to extractDir.
  if (subdirs.length === 1 && files.length === 0) {
    const subdirName = subdirs[0].name;
    const subdirPath = join(extractDir, subdirName);
    const subEntries = await fs.readdir(subdirPath, { withFileTypes: true });

    for (const entry of subEntries) {
      await fs.rename(
        join(subdirPath, entry.name),
        join(extractDir, entry.name),
      );
    }

    await fs.rmdir(subdirPath);
  }
}

export async function unzipFile(
  zipPath: string,
): Promise<{ success: boolean; message: string }> {
  const folderName = basename(zipPath, ".zip");
  const extractDir = join(dirname(zipPath), folderName);

  try {
    await extractZipFile(zipPath, extractDir);
    await flattenExtractDir(extractDir);
    return { success: true, message: `Extracted: ${basename(zipPath)}` };
  } catch (err) {
    const msg = (err as Error).message;
    if (
      msg.includes("invalid") ||
      msg.includes("end of central directory") ||
      msg.includes("signature") ||
      msg.includes("zipfile error")
    ) {
      return { success: false, message: `Bad zip file: ${basename(zipPath)}` };
    }
    return {
      success: false,
      message: `Error extracting ${basename(zipPath)}: ${msg}`,
    };
  }
}
