/* Fotoğraf işleme: küçültme, önizleme URL yönetimi */

const MAX_EDGE = 1280;   // saklanan kopya
const THUMB_EDGE = 360;  // galeri küçük resmi
const QUALITY = 0.82;

async function loadBitmap(file) {
  if ('createImageBitmap' in window) {
    try {
      return await createImageBitmap(file, { imageOrientation: 'from-image' });
    } catch { /* eski tarayıcı — aşağıya düş */ }
  }
  return new Promise((res, rej) => {
    const url = URL.createObjectURL(file);
    const img = new Image();
    img.onload = () => { URL.revokeObjectURL(url); res(img); };
    img.onerror = () => { URL.revokeObjectURL(url); rej(new Error('Görsel okunamadı')); };
    img.src = url;
  });
}

function draw(src, maxEdge) {
  const w = src.width, h = src.height;
  const scale = Math.min(1, maxEdge / Math.max(w, h));
  const cw = Math.max(1, Math.round(w * scale));
  const ch = Math.max(1, Math.round(h * scale));
  const c = document.createElement('canvas');
  c.width = cw; c.height = ch;
  const ctx = c.getContext('2d');
  ctx.imageSmoothingQuality = 'high';
  ctx.drawImage(src, 0, 0, cw, ch);
  return c;
}

function toBlob(canvas) {
  return new Promise((res) => canvas.toBlob((b) => res(b), 'image/jpeg', QUALITY));
}

/**
 * Galeriden seçilen dosyayı küçültür.
 * Döner: { blob, thumb, width, height }
 */
export async function processImage(file) {
  const bmp = await loadBitmap(file);
  const main = draw(bmp, MAX_EDGE);
  const thumb = draw(bmp, THUMB_EDGE);
  const [blob, tblob] = await Promise.all([toBlob(main), toBlob(thumb)]);
  if (bmp.close) bmp.close();
  return { blob, thumb: tblob, width: main.width, height: main.height };
}

/* ---------------- EXIF çekim tarihi ---------------- */

const EXIF_HEAD_BYTES = 256 * 1024; // APP1 segmenti dosyanın başında yer alır

/** "YYYY:MM:DD HH:MM:SS" → "YYYY-MM-DD"; geçersiz veya boş değerde null */
function exifDateToISO(str) {
  const m = /^(\d{4}):(\d{2}):(\d{2})/.exec(String(str || '').trim());
  if (!m) return null;
  const [, y, mo, d] = m;
  if (+y < 1900 || +mo < 1 || +mo > 12 || +d < 1 || +d > 31) return null;
  const dt = new Date(+y, +mo - 1, +d);
  if (dt.getFullYear() !== +y || dt.getMonth() !== +mo - 1 || dt.getDate() !== +d) return null;
  if (dt.getTime() > Date.now() + 86400e3) return null; // saat farkı toleransı ile gelecek tarih reddedilir
  return `${y}-${mo}-${d}`;
}

function readAscii(view, off, len) {
  let out = '';
  for (let i = 0; i < len; i++) {
    const c = view.getUint8(off + i);
    if (c === 0) break;
    out += String.fromCharCode(c);
  }
  return out;
}

/**
 * TIFF yapısındaki (EXIF) tarih etiketlerini okur, "YYYY-MM-DD" döner.
 * Öncelik: DateTimeOriginal (0x9003) → DateTimeDigitized (0x9004) → DateTime (0x0132)
 */
function parseTiffDate(view, tiffStart) {
  const end = view.byteLength;
  if (tiffStart + 8 > end) return null;
  const bom = view.getUint16(tiffStart);
  let le;
  if (bom === 0x4949) le = true; else if (bom === 0x4d4d) le = false; else return null;
  if (view.getUint16(tiffStart + 2, le) !== 0x2a) return null;
  const u16 = (o) => view.getUint16(o, le);
  const u32 = (o) => view.getUint32(o, le);

  const found = {};
  function readIFD(offset, depth) {
    const base = tiffStart + offset;
    if (depth > 2 || base < tiffStart || base + 2 > end) return;
    const n = u16(base);
    for (let i = 0; i < n; i++) {
      const e = base + 2 + i * 12;
      if (e + 12 > end) return;
      const tag = u16(e), type = u16(e + 2), count = u32(e + 4);
      if (tag === 0x8769) { readIFD(u32(e + 8), depth + 1); continue; } // Exif IFD işaretçisi
      if ((tag === 0x9003 || tag === 0x9004 || tag === 0x0132) && type === 2 && count >= 10) {
        const valOff = count > 4 ? tiffStart + u32(e + 8) : e + 8;
        if (valOff + count <= end) found[tag] = readAscii(view, valOff, count);
      }
    }
  }
  readIFD(u32(tiffStart + 4), 0);
  // Tercih edilen etiket boş/geçersizse (bazı cihazlar "    :  :  " yazar) sıradakine düşülür
  for (const tag of [0x9003, 0x9004, 0x0132]) {
    const iso = exifDateToISO(found[tag]);
    if (iso) return iso;
  }
  return null;
}

/** JPEG: APP1 "Exif\0\0" segmentini bulur */
function findJpegExif(view) {
  if (view.byteLength < 4 || view.getUint16(0) !== 0xffd8) return null;
  let off = 2;
  while (off + 4 <= view.byteLength) {
    if (view.getUint8(off) !== 0xff) return null;
    const marker = view.getUint8(off + 1);
    if (marker === 0xd8 || marker === 0x01 || (marker >= 0xd0 && marker <= 0xd7)) { off += 2; continue; }
    if (marker === 0xda || marker === 0xd9) return null; // görüntü verisi başladı — EXIF yok
    const len = view.getUint16(off + 2);
    if (len < 2) return null;
    if (marker === 0xe1 && off + 10 <= view.byteLength && readAscii(view, off + 4, 4) === 'Exif') {
      return parseTiffDate(view, off + 10);
    }
    off += 2 + len;
  }
  return null;
}

/** WebP (RIFF): "EXIF" parçasını bulur */
function findWebpExif(view) {
  if (view.byteLength < 12 || readAscii(view, 0, 4) !== 'RIFF' || readAscii(view, 8, 4) !== 'WEBP') return null;
  let off = 12;
  while (off + 8 <= view.byteLength) {
    const id = readAscii(view, off, 4);
    const size = view.getUint32(off + 4, true);
    if (id === 'EXIF') {
      let start = off + 8;
      if (readAscii(view, start, 4) === 'Exif') start += 6; // bazı yazıcılar başlığı da koyar
      return parseTiffDate(view, start);
    }
    off += 8 + size + (size & 1);
  }
  return null;
}

/** PNG: "eXIf" parçasını bulur */
function findPngExif(view) {
  if (view.byteLength < 8 || view.getUint32(0) !== 0x89504e47) return null;
  let off = 8;
  while (off + 8 <= view.byteLength) {
    const size = view.getUint32(off);
    const type = readAscii(view, off + 4, 4);
    if (type === 'eXIf') return parseTiffDate(view, off + 8);
    if (type === 'IDAT' || type === 'IEND') return null;
    off += 12 + size;
  }
  return null;
}

/**
 * Dosyanın EXIF verisinden çekim tarihini okur (JPEG, WebP, PNG).
 * Döner: "YYYY-MM-DD" ya da bulunamazsa null. Hiçbir zaman hata fırlatmaz.
 */
export async function readExifDate(file) {
  try {
    const buf = await file.slice(0, EXIF_HEAD_BYTES).arrayBuffer();
    const view = new DataView(buf);
    return findJpegExif(view) || findWebpExif(view) || findPngExif(view) || null;
  } catch {
    return null;
  }
}

/* Blob URL önbelleği — görünüm değişince serbest bırakılır */
const urlCache = new Map();
export function blobURL(key, blob) {
  if (!blob) return '';
  if (!urlCache.has(key)) urlCache.set(key, URL.createObjectURL(blob));
  return urlCache.get(key);
}
export function releaseURLs() {
  urlCache.forEach((u) => URL.revokeObjectURL(u));
  urlCache.clear();
}

/** Etiket metnini normalize eder: "Burun , Profil" → ["Burun", "Profil"] */
export function parseTags(text) {
  const set = new Set();
  String(text || '').split(/[,;\n]/).map((t) => t.trim()).filter(Boolean)
    .forEach((t) => set.add(t.charAt(0).toLocaleUpperCase('tr') + t.slice(1)));
  return [...set];
}
