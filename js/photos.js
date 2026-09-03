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
