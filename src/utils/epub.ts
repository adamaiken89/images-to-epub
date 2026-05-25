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

export async function createEpubFromFolder(
  imgDir: string,
  outputDir?: string
): Promise<EpubResult> {
  if (!outputDir) {
    outputDir = join(homedir(), "Downloads");
  }

  const folderName = basename(imgDir);
  const delimIndex = folderName.indexOf("###");
  const cleanName = delimIndex >= 0 ? folderName.slice(0, delimIndex).trim() : folderName;
  const outputEpub = join(outputDir, `${cleanName}.epub`);

  // Get sorted image files
  let imgFiles: string[];
  try {
    imgFiles = (await readdir(imgDir))
      .filter((f) => VALID_IMAGE_EXTS.has(extname(f).toLowerCase()))
      .sort();
  } catch (err) {
    const msg = (err as Error).message;
    if (msg.includes("permission")) {
      return { success: false, message: `Permission denied: ${imgDir}` };
    }
    return { success: false, message: `Error reading folder: ${msg}` };
  }

  if (imgFiles.length === 0) {
    return { success: false, message: `No images found in: ${folderName}` };
  }

  try {
    const bookId = `urn:uuid:${uuidv4()}`;
    const title = cleanName;
    const author = delimIndex >= 0 ? folderName.slice(delimIndex + 3).trim() : null;
    const lang = "zh";

    // Convert cover image (first image in folder)
    const coverData = await convertToJpeg(join(imgDir, imgFiles[0]));

    // Build zip
    const zip = new JSZip();

    // Add cover image to zip
    zip.file("OEBPS/images/cover.jpg", coverData);

    // mimetype must be uncompressed and first
    zip.file("mimetype", "application/epub+zip", { compression: "STORE" });

    // META-INF/container.xml
    zip.file(
      "META-INF/container.xml",
      `<?xml version="1.0"?>
<container version="1.0" xmlns="urn:oasis:names:tc:opendocument:xmlns:container">
  <rootfiles>
    <rootfile full-path="OEBPS/content.opf" media-type="application/oebps-package+xml"/>
  </rootfiles>
</container>`
    );

    // Build manifest items and spine
    const manifestItems: string[] = [];
    const spineItems: string[] = [];
    const tocItems: string[] = [];

    // Cover image manifest item (EPUB 3 cover-image property)
    manifestItems.push(
      `<item id="cover-image" href="images/cover.jpg" media-type="image/jpeg" properties="cover-image"/>`
    );

    // Cover page
    manifestItems.push(
      `<item id="cover" href="cover.xhtml" media-type="application/xhtml+xml"/>`
    );
    spineItems.push(`<itemref idref="cover"/>`);

    zip.file(
      "OEBPS/cover.xhtml",
      `<?xml version="1.0" encoding="UTF-8"?>
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
</html>`
    );

    // Process each image
    for (let idx = 0; idx < imgFiles.length; idx++) {
      const imgName = imgFiles[idx];
      const imgPath = join(imgDir, imgName);
      const imgData = await convertToJpeg(imgPath);

      const imgId = `img${String(idx).padStart(3, "0")}`;
      const imgFileName = `${imgId}.jpg`;

      zip.file(`OEBPS/images/${imgFileName}`, imgData);

      manifestItems.push(
        `<item id="${imgId}" href="images/${imgFileName}" media-type="image/jpeg"/>`
      );

      const pageId = `page_${idx + 1}`;
      const pageFile = `${pageId}.xhtml`;

      zip.file(
        `OEBPS/${pageFile}`,
        `<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE html>
<html xmlns="http://www.w3.org/1999/xhtml" xml:lang="${lang}">
<head>
  <title>Page ${idx + 1}</title>
  <meta charset="UTF-8"/>
  <style>img { width: 100%; height: auto; }</style>
</head>
<body>
  <img src="images/${imgFileName}" alt="Page ${idx + 1}"/>
</body>
</html>`
      );

      manifestItems.push(
        `<item id="${pageId}" href="${pageFile}" media-type="application/xhtml+xml"/>`
      );
      spineItems.push(`<itemref idref="${pageId}"/>`);
      tocItems.push(
        `<navPoint id="${pageId}" playOrder="${idx + 2}"><navLabel><text>Page ${idx + 1}</text></navLabel><content src="${pageFile}"/></navPoint>`
      );
    }

    // NCX TOC
    zip.file(
      "OEBPS/toc.ncx",
      `<?xml version="1.0" encoding="UTF-8"?>
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
    ${tocItems.join("\n    ")}
  </navMap>
</ncx>`
    );

    // EPUB3 nav document
    zip.file(
      "OEBPS/nav.xhtml",
      `<?xml version="1.0" encoding="UTF-8"?>
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
      ${imgFiles.map((_, i) => `<li><a href="page_${i + 1}.xhtml">Page ${i + 1}</a></li>`).join("\n      ")}
    </ol>
  </nav>
</body>
</html>`
    );

    manifestItems.push(
      `<item id="ncx" href="toc.ncx" media-type="application/x-dtbncx+xml"/>`
    );
    manifestItems.push(
      `<item id="nav" href="nav.xhtml" media-type="application/xhtml+xml" properties="nav"/>`
    );

    // content.opf
    zip.file(
      "OEBPS/content.opf",
      `<?xml version="1.0" encoding="UTF-8"?>
<package version="3.0" xmlns="http://www.idpf.org/2007/opf" unique-identifier="book-id">
  <metadata xmlns:dc="http://purl.org/dc/elements/1.1/">
    <dc:identifier id="book-id">${bookId}</dc:identifier>
    <dc:title>${escapeXml(title)}</dc:title>
    <dc:language>${lang}</dc:language>
    ${author ? `<dc:creator>${escapeXml(author)}</dc:creator>` : ""}
    <meta property="dcterms:modified">${new Date().toISOString().replace(/\.\d{3}Z$/, "Z")}</meta>
    <meta name="cover" content="cover-image"/>
  </metadata>
  <manifest>
    ${manifestItems.join("\n    ")}
  </manifest>
  <spine toc="ncx">
    ${spineItems.join("\n    ")}
  </spine>
</package>`
    );

    // Generate zip buffer and write to file
    const buffer = await zip.generateAsync({ type: "nodebuffer", compression: "DEFLATE" });
    await mkdir(outputDir, { recursive: true });
    await writeFile(outputEpub, buffer);

    return { success: true, message: `EPUB created: ${outputEpub}` };
  } catch (err) {
    return { success: false, message: `Error creating EPUB: ${(err as Error).message}` };
  }
}
