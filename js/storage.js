/* Depolama sağlığı: ortam tespiti, kalıcı depolama isteği, yedek al / geri yükle */
import { exportAll, importAll } from './db.js';
import { esc, icon, sheet, toast } from './ui.js';

const ua = navigator.userAgent || '';

export function isIOS() {
  return /iPad|iPhone|iPod/.test(ua) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
}
export function isStandalone() {
  return window.matchMedia?.('(display-mode: standalone)').matches || navigator.standalone === true;
}
/** Uygulama içi tarayıcı (WhatsApp, Instagram, Telegram, Android WebView…) — depolama çoğunlukla geçicidir */
export function isInAppBrowser() {
  if (isStandalone()) return false;
  if (/FBAN|FBAV|Instagram|Line\/|MicroMessenger|Telegram|Snapchat|TikTok|Bytedance|; wv\)|WebView/i.test(ua)) return true;
  // iOS'ta Safari dışı gömülü görünümlerin UA'sında "Safari/" bulunmaz (CriOS/FxiOS'ta bulunur)
  return isIOS() && /Mobile\//.test(ua) && !/Safari\//.test(ua);
}
export function isMobile() {
  return isIOS() || /Android/i.test(ua);
}

/** Tarayıcıdan verilerin baskı altında silinmemesini ister. Sessizce çalışır. */
export async function requestPersist() {
  try {
    if (!navigator.storage?.persist) return null;
    if (await navigator.storage.persisted()) return true;
    return await navigator.storage.persist();
  } catch { return null; }
}

export async function storageInfo() {
  const info = { standalone: isStandalone(), ios: isIOS(), inApp: isInAppBrowser(), persisted: null, usage: null, quota: null };
  try { if (navigator.storage?.persisted) info.persisted = await navigator.storage.persisted(); } catch { /* yok say */ }
  try {
    if (navigator.storage?.estimate) { const e = await navigator.storage.estimate(); info.usage = e.usage ?? null; info.quota = e.quota ?? null; }
  } catch { /* yok say */ }
  return info;
}

export function fmtBytes(n) {
  if (n == null) return '—';
  if (n < 1024 * 1024) return `${Math.max(1, Math.round(n / 1024))} KB`;
  if (n < 1024 * 1024 * 1024) return `${(n / 1024 / 1024).toFixed(1)} MB`;
  return `${(n / 1024 / 1024 / 1024).toFixed(1)} GB`;
}

/* ---------------- Uyarı bandı ---------------- */
const NOTICE_KEY = 'hasta-takip:notice-dismissed';
function dismissed(id) { try { return localStorage.getItem(NOTICE_KEY) === id; } catch { return false; } }
function dismiss(id) { try { localStorage.setItem(NOTICE_KEY, id); } catch { /* yok say */ } }

/** Ortama göre gösterilecek uyarı: { id, kind, title, text } ya da null */
export function storageNotice() {
  if (isInAppBrowser()) {
    return {
      id: 'inapp', kind: 'danger', dismissable: false,
      title: 'Veriler burada kalıcı olmayabilir',
      text: 'Sayfa bir uygulama içi tarayıcıda (mesajlaşma uygulaması vb.) açıldı; bu tarayıcılar kapanınca verileri silebilir. Bağlantıyı Safari veya Chrome ile açın ve ana ekrana ekleyin.',
    };
  }
  if (isIOS() && !isStandalone()) {
    return {
      id: 'ios-tab', kind: 'warn', dismissable: true,
      title: 'Ana ekrana ekleyin',
      text: 'Safari, 7 gün açılmayan sitelerin verilerini silebilir. Paylaş → Ana Ekrana Ekle ile kurup uygulamayı oradan açın. Ana ekrandaki uygulamanın verileri Safari\'dekinden ayrıdır; mevcut verileri Ayarlar → Yedek al ile taşıyın.',
    };
  }
  if (isMobile() && !isStandalone()) {
    return {
      id: 'mobile-tab', kind: 'info', dismissable: true,
      title: 'Ana ekrana ekleyin',
      text: 'Tarayıcı menüsünden "Ana ekrana ekle" ile kurarsanız uygulama gibi açılır ve verileriniz korunur.',
    };
  }
  return null;
}

export function renderNotice(host) {
  const n = storageNotice();
  host.innerHTML = '';
  if (!n || (n.dismissable && dismissed(n.id))) return;
  host.innerHTML = `
    <div class="notice notice-${n.kind}" role="status">
      <div class="notice-main"><b>${esc(n.title)}</b><div>${esc(n.text)}</div></div>
      ${n.dismissable ? `<button class="btn-icon" type="button" data-act="dismiss" aria-label="Kapat">${icon('x')}</button>` : ''}
    </div>`;
  const b = host.querySelector('[data-act=dismiss]');
  if (b) b.onclick = () => { dismiss(n.id); host.innerHTML = ''; };
}

/* ---------------- Yedek al / geri yükle ---------------- */
function backupName() {
  const d = new Date();
  const p = (n) => String(n).padStart(2, '0');
  return `hasta-takip-yedek-${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}.json`;
}

/** Yedeği dosya olarak verir: iOS'ta paylaşım sayfası, diğerlerinde indirme. */
export async function downloadBackup() {
  const data = await exportAll();
  const json = JSON.stringify(data);
  const name = backupName();
  const file = new File([json], name, { type: 'application/json' });
  if (navigator.canShare && navigator.canShare({ files: [file] }) && isMobile()) {
    try {
      await navigator.share({ files: [file], title: 'Hasta Takip yedeği' });
      return { shared: true, name, size: file.size };
    } catch (e) {
      if (e && e.name === 'AbortError') return null; // kullanıcı vazgeçti
      /* paylaşım olmadı — indirmeye düş */
    }
  }
  const url = URL.createObjectURL(file);
  const a = document.createElement('a');
  a.href = url; a.download = name; a.rel = 'noopener';
  document.body.appendChild(a); a.click(); a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 60_000);
  return { shared: false, name, size: file.size };
}

export function pickBackupFile() {
  return new Promise((res) => {
    const input = document.createElement('input');
    input.type = 'file'; input.accept = 'application/json,.json';
    input.onchange = () => res(input.files[0] || null);
    input.click();
  });
}

export async function readBackup(file) {
  let data;
  try { data = JSON.parse(await file.text()); } catch { throw new Error('Dosya okunamadı; geçerli bir yedek dosyası değil.'); }
  if (!data || data.app !== 'hasta-takip') throw new Error('Bu dosya bir Hasta Takip yedeği değil.');
  return data;
}

/** Kullanıcıya birleştir / değiştir / vazgeç seçeneği sunar, seçime göre içe aktarır. */
export async function restoreBackup(file) {
  const data = await readBackup(file);
  const c = { patients: (data.patients || []).length, photos: (data.photos || []).length, appointments: (data.appointments || []).length };
  const when = data.exportedAt ? new Date(data.exportedAt).toLocaleString('tr-TR', { dateStyle: 'medium', timeStyle: 'short' }) : '';
  const s = sheet({
    title: 'Yedeği geri yükle',
    size: 'sm',
    content: `
      <p class="muted" style="margin:0 0 10px">${when ? `${esc(when)} tarihli yedek: ` : 'Yedek: '}<b>${c.patients} hasta</b>, ${c.photos} fotoğraf, ${c.appointments} randevu.</p>
      <p class="muted small" style="margin:0"><b>Birleştir</b> mevcut kayıtları korur, aynı kayıtları günceller. <b>Değiştir</b> önce mevcut tüm verileri siler.</p>`,
    footer: `<button class="btn btn-ghost" data-act="cancel">Vazgeç</button>
             <button class="btn btn-danger-soft" data-act="replace">Değiştir</button>
             <button class="btn btn-primary" data-act="merge">Birleştir</button>`,
  });
  s.el.querySelector('[data-act=cancel]').onclick = () => s.close(null);
  s.el.querySelector('[data-act=replace]').onclick = () => s.close('replace');
  s.el.querySelector('[data-act=merge]').onclick = () => s.close('merge');
  const mode = await s.result;
  if (!mode) return null;
  await importAll(data, { replace: mode === 'replace' });
  toast(`${c.patients} hasta geri yüklendi`, { kind: 'ok' });
  return c;
}
