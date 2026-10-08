/* =========================================================
   AUTO GALLERY
   Netlify runs this file on every deploy. It looks inside
   images/<category>/ and rebuilds the photo grid and the
   category buttons in index.html. You never edit the HTML
   for photos again: just add or delete files in the folders.

     images/fashion/01-red-dress.jpg   -> category "Fashion"
     images/editorial/vogue-story.jpg  -> category "Editorial"

   - Photos are sorted by file name (use 01-, 02-, ... to set order).
   - The file name becomes the photo description (alt text),
     so "red-dress-studio.jpg" -> "Red dress studio".
   - A new folder automatically becomes a new category button.
   - On Netlify, photos are resized and compressed automatically
     (Netlify Image CDN), so you can upload large JPGs.
   ========================================================= */

const fs = require("fs");
const path = require("path");

// Order of the category buttons. Folders not listed here are added after these.
const CATEGORY_ORDER = ["fashion", "beauty", "portrait", "editorial"];

// Size of the grid image and of the full-screen image (pixels wide).
const GRID_WIDTH = 1000;
const FULL_WIDTH = 2400;

const ROOT = __dirname;
const IMAGES_DIR = path.join(ROOT, "images");
const PAGE = path.join(ROOT, "index.html");
const ON_NETLIFY = process.env.NETLIFY === "true";
const EXTENSIONS = [".jpg", ".jpeg", ".png", ".webp"];

/* ---------- Read image width/height without extra packages ---------- */
function imageSize(file) {
  const b = fs.readFileSync(file);
  // PNG
  if (b.toString("ascii", 1, 4) === "PNG") return { w: b.readUInt32BE(16), h: b.readUInt32BE(20) };
  // WebP
  if (b.toString("ascii", 0, 4) === "RIFF" && b.toString("ascii", 8, 12) === "WEBP") {
    const type = b.toString("ascii", 12, 16);
    if (type === "VP8X") return { w: 1 + b.readUIntLE(24, 3), h: 1 + b.readUIntLE(27, 3) };
    if (type === "VP8 ") return { w: b.readUInt16LE(26) & 0x3fff, h: b.readUInt16LE(28) & 0x3fff };
    if (type === "VP8L") {
      const bits = b.readUInt32LE(21);
      return { w: (bits & 0x3fff) + 1, h: ((bits >> 14) & 0x3fff) + 1 };
    }
  }
  // JPEG: walk the markers until a "start of frame"
  if (b[0] === 0xff && b[1] === 0xd8) {
    let i = 2, orientation = 1, size = null;
    while (i < b.length) {
      if (b[i] !== 0xff) { i++; continue; }
      const marker = b[i + 1];
      const len = b.readUInt16BE(i + 2);
      if (marker === 0xe1 && b.toString("ascii", i + 4, i + 8) === "Exif") {
        orientation = exifOrientation(b, i + 10) || 1;
      }
      if (marker >= 0xc0 && marker <= 0xcf && ![0xc4, 0xc8, 0xcc].includes(marker)) {
        size = { h: b.readUInt16BE(i + 5), w: b.readUInt16BE(i + 7) };
        break;
      }
      i += 2 + len;
    }
    // Photos shot vertically are often stored sideways with a rotate flag
    if (size && orientation >= 5) return { w: size.h, h: size.w };
    if (size) return size;
  }
  return null;
}
function exifOrientation(b, tiff) {
  try {
    const le = b.toString("ascii", tiff, tiff + 2) === "II";
    const u16 = o => (le ? b.readUInt16LE(o) : b.readUInt16BE(o));
    const u32 = o => (le ? b.readUInt32LE(o) : b.readUInt32BE(o));
    const ifd = tiff + u32(tiff + 4);
    const count = u16(ifd);
    for (let n = 0; n < count; n++) {
      const entry = ifd + 2 + n * 12;
      if (u16(entry) === 0x0112) return u16(entry + 8);
    }
  } catch (e) { /* ignore broken EXIF */ }
  return 1;
}

/* ---------- Helpers ---------- */
const escapeHtml = s => s.replace(/&/g, "&amp;").replace(/"/g, "&quot;").replace(/</g, "&lt;");
const niceName = s => {
  const t = s.replace(/^\d+[-_ ]*/, "").replace(/[-_]+/g, " ").trim();
  return t.charAt(0).toUpperCase() + t.slice(1);
};
const urlFor = (rel, width) =>
  ON_NETLIFY
    ? `/.netlify/images?url=${encodeURIComponent("/" + rel)}&w=${width}&q=80`
    : "/" + rel.split("/").map(encodeURIComponent).join("/");

/* ---------- Find categories and photos ---------- */
if (!fs.existsSync(IMAGES_DIR)) { console.log("No images folder, nothing to do."); process.exit(0); }

const folders = fs.readdirSync(IMAGES_DIR, { withFileTypes: true })
  .filter(d => d.isDirectory() && !d.name.startsWith("."))
  .map(d => d.name)
  .sort((a, b) => {
    const ia = CATEGORY_ORDER.indexOf(a), ib = CATEGORY_ORDER.indexOf(b);
    return (ia < 0 ? 999 : ia) - (ib < 0 ? 999 : ib) || a.localeCompare(b);
  });

const categories = [];
for (const folder of folders) {
  const files = fs.readdirSync(path.join(IMAGES_DIR, folder))
    .filter(f => EXTENSIONS.includes(path.extname(f).toLowerCase()) && !f.startsWith("."))
    .sort((a, b) => a.localeCompare(b, undefined, { numeric: true }));
  if (!files.length) continue;
  const photos = files.map(f => {
    const rel = `images/${folder}/${f}`;
    const size = imageSize(path.join(IMAGES_DIR, folder, f)) || { w: 800, h: 1000 };
    return { rel, size, alt: niceName(path.parse(f).name) };
  });
  categories.push({ id: folder.toLowerCase(), label: niceName(folder), photos });
}

const total = categories.reduce((n, c) => n + c.photos.length, 0);
if (!total) {
  console.log("No photos found in images/<category>/ folders. index.html left unchanged.");
  process.exit(0);
}

/* ---------- Build the HTML ---------- */
const buttons = [
  `      <button data-filter="all" aria-pressed="true">All work</button>`,
  ...categories.map(c => `      <button data-filter="${c.id}" aria-pressed="false">${escapeHtml(c.label)}</button>`),
].join("\n");

const figures = categories.flatMap(c => c.photos.map(p => {
  const h = Math.round(p.size.h * (GRID_WIDTH / p.size.w));
  return `      <figure data-category="${c.id}">
        <img src="${urlFor(p.rel, GRID_WIDTH)}" data-full="${urlFor(p.rel, FULL_WIDTH)}" width="${GRID_WIDTH}" height="${h}" alt="${escapeHtml(p.alt)}" loading="lazy">
      </figure>`;
})).join("\n");

let html = fs.readFileSync(PAGE, "utf8");
const filtersRe = /(<div class="filters"[^>]*>)[\s\S]*?(<\/div>)/;
const galleryRe = /(<section class="gallery"[^>]*>)[\s\S]*?(<\/section>)/;
if (!filtersRe.test(html) || !galleryRe.test(html)) {
  console.error("Could not find the filters or gallery block in index.html.");
  process.exit(1);
}
html = html
  .replace(filtersRe, `$1\n${buttons}\n    $2`)
  .replace(galleryRe, `$1\n${figures}\n    $2`);
fs.writeFileSync(PAGE, html);

console.log(`Gallery built: ${total} photos in ${categories.length} categories`);
categories.forEach(c => console.log(`  ${c.label}: ${c.photos.length}`));
