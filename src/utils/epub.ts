import { mkdir, readdir, writeFile } from "fs/promises";
import { join, basename, extname } from "path";
import { homedir } from "os";
import sharp from "sharp";
import JSZip from "jszip";
import { v4 as uuidv4 } from "uuid";

const VALID_IMAGE_EXTS = new Set([".webp", ".jpg", ".jpeg", ".png"]);

export interface EpubResult {
  success: boolean;
  message: string;
  pagesTotal?: number;
  pagesCompleted?: number;
  outputPath?: string;
  outputSize?: number;
}

function escapeXml(str: string): string {
  return str
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
}

async function convertToJpeg(imagePath: string): Promise<Buffer> {
  return sharp(imagePath).jpeg({ quality: 90 }).toBuffer();
}

function buildManifestItems(
  pageIds: string[],
  imgIds: string[],
  imgFileNames: string[],
): string[] {
  return pageIds.flatMap((_, i) => [
    `<item id="${imgIds[i]}" href="images/${imgFileNames[i]}" media-type="image/jpeg"/>`,
    `<item id="${pageIds[i]}" href="${pageIds[i]}.xhtml" media-type="application/xhtml+xml"/>`,
  ]);
}

function buildSpineItems(pageIds: string[]): string[] {
  return pageIds.map((id) => `<itemref idref="${id}"/>`);
}

function buildContentOpf(ctx: {
  bookId: string;
  title: string;
  author: string | null;
  lang: string;
  manifestItems: string[];
  spineItems: string[];
  koboMeta: string;
}): string {
  const { bookId, title, author, lang, manifestItems, spineItems, koboMeta } = ctx;
  return `<?xml version="1.0" encoding="UTF-8"?>
<package version="3.0" xmlns="http://www.idpf.org/2007/opf" unique-identifier="book-id">
  <metadata xmlns:dc="http://purl.org/dc/elements/1.1/">
    <dc:identifier id="book-id">${bookId}</dc:identifier>
    <dc:title>${escapeXml(title)}</dc:title>
    <dc:language>${lang}</dc:language>
    ${author ? `<dc:creator>${escapeXml(author)}</dc:creator>` : ""}
    <meta property="dcterms:modified">${new Date().toISOString().replace(/\.\d{3}Z$/, "Z")}</meta>
    <meta name="cover" content="cover-image"/>
    ${koboMeta}  </metadata>
  <manifest>
    ${manifestItems.join("\n    ")}
  </manifest>
  <spine toc="ncx">
    ${spineItems.join("\n    ")}
  </spine>
</package>`;
}

function buildTocNcx(
  bookId: string,
  title: string,
  pageIds: string[],
): string {
  const navPoints = pageIds
    .map(
      (id, i) =>
        `<navPoint id="${id}" playOrder="${i + 2}"><navLabel><text>Page ${id.replace("page_", "")}</text></navLabel><content src="${id}.xhtml"/></navPoint>`,
    )
    .join("\n    ");
  return `<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE ncx PUBLIC "-//NISO//DTD ncx 2005-1//EN" "http://www.daisy.org/z3986/2005/ncx-2005-1.dtd">
<ncx version="2005-1" xmlns="http://www.daisy.org/z3986/2005/ncx/">
  <head>
    <meta name="dtb:uid" content="${bookId}"/>
    <meta name="dtb:depth" content="1"/>
    <meta name="dtb:totalPageCount" content="0"/>
    <meta name="dtb:maxPageNumber" content="0"/>
  </head>
  <docTitle><text>${escapeXml(title)}</text></docTitle>
  <navMap>
    <navPoint id="cover" playOrder="1"><navLabel><text>Cover</text></navLabel><content src="cover.xhtml"/></navPoint>
    ${navPoints}
  </navMap>
</ncx>`;
}

function buildNavDoc(title: string, pageIds: string[], lang: string): string {
  const navItems = pageIds
    .map((id, i) => `<li><a href="${id}.xhtml">Page ${i + 1}</a></li>`)
    .join("\n      ");
  return `<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE html>
<html xmlns="http://www.w3.org/1999/xhtml" xmlns:epub="http://www.idpf.org/2007/ops" xml:lang="${lang}">
<head>
  <title>Table of Contents</title>
  <meta charset="UTF-8"/>
</head>
<body>
  <nav epub:type="toc" id="toc">
    <h1>Table of Contents</h1>
    <ol>
      <li><a href="cover.xhtml">Cover</a></li>
      ${navItems}
    </ol>
  </nav>
</body>
</html>`;
}

function buildCoverHtml(hasCover: boolean, title: string, lang: string): string {
  if (hasCover) {
    return `<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE html>
<html xmlns="http://www.w3.org/1999/xhtml" xml:lang="${lang}">
<head>
  <title>Cover</title>
  <meta charset="UTF-8"/>
  <style>img { width: 100%; height: auto; }</style>
</head>
<body>
  <img src="images/cover.jpg" alt="Cover"/>
</body>
</html>`;
  }
  return `<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE html>
<html xmlns="http://www.w3.org/1999/xhtml" xml:lang="${lang}">
<head>
  <title>${escapeXml(title)}</title>
  <meta charset="UTF-8"/>
</head>
<body>
  <p>${escapeXml(title)}</p>
</body>
</html>`;
}

function buildPageHtml(pageNum: number, imgFileName: string, lang: string): string {
  return `<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE html>
<html xmlns="http://www.w3.org/1999/xhtml" xml:lang="${lang}">
<head>
  <title>Page ${pageNum}</title>
  <meta charset="UTF-8"/>
  <style>img { width: 100%; height: auto; }</style>
</head>
<body>
  <img src="images/${imgFileName}" alt="Page ${pageNum}"/>
</body>
</html>`;
}

interface ImageConversionResult {
  imgIds: string[];
  imgFileNames: string[];
  pageIds: string[];
  coverData: Buffer | null;
  pagesCompleted: number;
  errors: string[];
  totalFiles: number;
}

interface EpubMeta {
  author: string | null;
  lang: string;
  bookId: string;
  folderName: string;
}

async function readAndConvertImages(
  imgDir: string,
  imgFiles: string[],
  lang: string,
  zip: JSZip,
  onPage?: (completed: number, total: number) => void,
): Promise<ImageConversionResult> {
  const imgIds: string[] = [];
  const imgFileNames: string[] = [];
  const pageIds: string[] = [];
  const errors: string[] = [];
  let pagesCompleted = 0;
  let coverData: Buffer | null = null;

  try {
    coverData = await convertToJpeg(join(imgDir, imgFiles[0]));
  } catch (err) {
    errors.push(`${imgFiles[0]}: ${(err as Error).message}`);
  }

  for (let idx = 0; idx < imgFiles.length; idx++) {
    const imgName = imgFiles[idx];
    const imgPath = join(imgDir, imgName);

    let imgData: Buffer;
    try {
      imgData = await convertToJpeg(imgPath);
      pagesCompleted++;
      if (onPage) { onPage(pagesCompleted, imgFiles.length); }
    } catch (err) {
      errors.push(`${imgName}: ${(err as Error).message}`);
      continue;
    }

    const imgId = `img${String(idx).padStart(3, "0")}`;
    const imgFileName = `${imgId}.jpg`;

    if (idx === 0 && !coverData) {
      coverData = imgData;
    }

    zip.file(`OEBPS/images/${imgFileName}`, imgData);
    imgIds.push(imgId);
    imgFileNames.push(imgFileName);

    const pageId = `page_${idx + 1}`;
    pageIds.push(pageId);
    zip.file(`OEBPS/${pageId}.xhtml`, buildPageHtml(idx + 1, imgFileName, lang));
  }

  if (coverData) {
    zip.file("OEBPS/images/cover.jpg", coverData);
  }

  return { imgIds, imgFileNames, pageIds, coverData, pagesCompleted, errors, totalFiles: imgFiles.length };
}

async function writeEpubOutput(ctx: {
  zip: JSZip;
  images: ImageConversionResult;
  meta: EpubMeta;
  navPageIds: string[];
  format: "epub" | "kepub" | "both";
  outputDir: string;
}): Promise<EpubResult> {
  const { zip, images, meta, navPageIds, format, outputDir } = ctx;
  const { folderName } = meta;
  const delimIndex = folderName.indexOf("###");
  const cleanName = delimIndex >= 0 ? folderName.slice(0, delimIndex).trim() : folderName;
  const title = cleanName;
  const ext = format === "kepub" ? ".kepub.epub" : ".epub";
  const outputEpub = join(outputDir, `${cleanName}${ext}`);

  if (images.errors.length === images.totalFiles) {
    return { success: false, message: `All images failed in: ${folderName}`, pagesTotal: images.totalFiles, pagesCompleted: 0 };
  }

  const manifestItems: string[] = [];
  manifestItems.push(`<item id="cover" href="cover.xhtml" media-type="application/xhtml+xml"/>`);
  if (images.coverData) {
    manifestItems.push(`<item id="cover-image" href="images/cover.jpg" media-type="image/jpeg" properties="cover-image"/>`);
  }
  manifestItems.push(...buildManifestItems(images.pageIds, images.imgIds, images.imgFileNames));
  manifestItems.push(`<item id="ncx" href="toc.ncx" media-type="application/x-dtbncx+xml"/>`);
  manifestItems.push(`<item id="nav" href="nav.xhtml" media-type="application/xhtml+xml" properties="nav"/>`);

  const spineItems: string[] = [];
  spineItems.push(`<itemref idref="cover"/>`);
  spineItems.push(...buildSpineItems(images.pageIds));

  zip.file("OEBPS/cover.xhtml", buildCoverHtml(!!images.coverData, title, meta.lang));
  zip.file("OEBPS/toc.ncx", buildTocNcx(meta.bookId, title, images.pageIds));

  zip.file("OEBPS/nav.xhtml", buildNavDoc(title, navPageIds, meta.lang));

  const includeKobo = format === "kepub" || format === "both";
  const koboMeta = includeKobo ? `    <meta name="kobo" content="kobonick"/>\n` : "";
  zip.file("OEBPS/content.opf", buildContentOpf({ bookId: meta.bookId, title, author: meta.author, lang: meta.lang, manifestItems, spineItems, koboMeta }));

  const buffer = await zip.generateAsync({ type: "nodebuffer", compression: "DEFLATE" });
  await mkdir(outputDir, { recursive: true });

  const errorSuffix = images.errors.length > 0 ? ` (${images.errors.length} corrupt images skipped)` : "";
  const pagesCompleted = images.totalFiles - images.errors.length;

  if (format === "both") {
    const epubPath = join(outputDir, `${cleanName}.epub`);
    const kepubPath = join(outputDir, `${cleanName}.kepub.epub`);
    await writeFile(epubPath, buffer);
    await writeFile(kepubPath, buffer);
    return {
      success: true,
      message: `EPUB + KEPUB created: ${cleanName}${errorSuffix}`,
      pagesTotal: images.totalFiles,
      pagesCompleted,
      outputSize: buffer.length,
    };
  }

  await writeFile(outputEpub, buffer);
  const label = format === "kepub" ? "KEPUB" : "EPUB";
  return {
    success: true,
    message: `${label} created: ${outputEpub}${errorSuffix}`,
    pagesTotal: images.totalFiles,
    pagesCompleted,
    outputPath: outputEpub,
    outputSize: buffer.length,
  };
}

export async function createEpubFromFolder(
  imgDir: string,
  outputDir?: string,
  format: "epub" | "kepub" | "both" = "epub",
  onPage?: (completed: number, total: number) => void,
): Promise<EpubResult> {
  if (!outputDir) {
    outputDir = join(homedir(), "Downloads");
  }

  const folderName = basename(imgDir);
  const delimIndex = folderName.indexOf("###");

  let imgFiles: string[];
  try {
    imgFiles = (await readdir(imgDir))
      .filter((f) => VALID_IMAGE_EXTS.has(extname(f).toLowerCase()))
      .sort((a, b) => a.localeCompare(b, undefined, { numeric: true }));
  } catch (err) {
    const msg = (err as Error).message;
    if (msg.includes("permission")) {
      return { success: false, message: `Permission denied: ${imgDir}`, pagesTotal: 0, pagesCompleted: 0 };
    }
    return { success: false, message: `Error reading folder: ${msg}`, pagesTotal: 0, pagesCompleted: 0 };
  }

  if (imgFiles.length === 0) {
    return { success: false, message: `No images found in: ${folderName}`, pagesTotal: 0, pagesCompleted: 0 };
  }

  try {
    const bookId = `urn:uuid:${uuidv4()}`;
    const author = delimIndex >= 0 ? folderName.slice(delimIndex + 3).trim() : null;
    const lang = "zh";

    const zip = new JSZip();
    zip.file("mimetype", "application/epub+zip", { compression: "STORE" });
    zip.file(
      "META-INF/container.xml",
      `<?xml version="1.0"?>
<container version="1.0" xmlns="urn:oasis:names:tc:opendocument:xmlns:container">
  <rootfiles>
    <rootfile full-path="OEBPS/content.opf" media-type="application/oebps-package+xml"/>
  </rootfiles>
</container>`,
    );

    const images = await readAndConvertImages(imgDir, imgFiles, lang, zip, onPage);

    const lastGoodIdx = images.totalFiles - images.errors.length;
    const navPageIds = imgFiles
      .filter((_, i) => i < lastGoodIdx || !images.errors.some((e) => e.startsWith(imgFiles[i])))
      .map((_, i) => `page_${i + 1}`);

    return await writeEpubOutput({
      zip,
      images,
      meta: { author, lang, bookId, folderName },
      navPageIds,
      format,
      outputDir,
    });
  } catch (err) {
    return { success: false, message: `Error creating EPUB: ${(err as Error).message}`, pagesTotal: 0, pagesCompleted: 0 };
  }
}
