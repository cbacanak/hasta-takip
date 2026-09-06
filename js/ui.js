/* Küçük UI yardımcıları: şablon, ikon, tarih, sheet, onay, toast */

export function esc(s) {
  return String(s ?? '')
    .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;').replace(/'/g, '&#39;');
}

export function el(html) {
  const t = document.createElement('template');
  t.innerHTML = html.trim();
  return t.content.firstElementChild;
}

export function initials(name) {
  return name.split(/\s+/).filter(Boolean).slice(0, 2).map((w) => w[0].toLocaleUpperCase('tr')).join('');
}

/* ---------------- İkonlar ---------------- */
const ICONS = {
  back: '<path d="m15 18-6-6 6-6"/>',
  chevron: '<path d="m9 18 6-6-6-6"/>',
  down: '<path d="m6 9 6 6 6-6"/>',
  plus: '<path d="M12 5v14M5 12h14"/>',
  x: '<path d="M18 6 6 18M6 6l12 12"/>',
  check: '<path d="M20 6 9 17l-5-5"/>',
  search: '<circle cx="11" cy="11" r="8"/><path d="m21 21-4.3-4.3"/>',
  phone: '<path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72c.127.96.361 1.903.7 2.81a2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45c.907.339 1.85.573 2.81.7A2 2 0 0 1 22 16.92z"/>',
  calendar: '<rect x="3" y="4" width="18" height="18" rx="2"/><path d="M16 2v4M8 2v4M3 10h18"/>',
  users: '<path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M22 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75"/>',
  user: '<path d="M19 21v-2a4 4 0 0 0-4-4H9a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/>',
  settings: '<circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z"/>',
  more: '<circle cx="12" cy="5" r="1"/><circle cx="12" cy="12" r="1"/><circle cx="12" cy="19" r="1"/>',
  edit: '<path d="M17 3a2.85 2.83 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5Z"/>',
  trash: '<path d="M3 6h18M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/>',
  image: '<rect x="3" y="3" width="18" height="18" rx="2"/><circle cx="9" cy="9" r="2"/><path d="m21 15-3.1-3.1a2 2 0 0 0-2.8 0L6 21"/>',
  camera: '<path d="M14.5 4h-5L7 7H4a2 2 0 0 0-2 2v9a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2V9a2 2 0 0 0-2-2h-3l-2.5-3z"/><circle cx="12" cy="13" r="3"/>',
  activity: '<path d="M22 12h-4l-3 9L9 3l-3 9H2"/>',
  clock: '<circle cx="12" cy="12" r="10"/><path d="M12 6v6l4 2"/>',
  mail: '<rect x="2" y="4" width="20" height="16" rx="2"/><path d="m22 7-10 7L2 7"/>',
  alert: '<circle cx="12" cy="12" r="10"/><path d="M12 8v4M12 16h.01"/>',
  compare: '<rect x="3" y="3" width="18" height="18" rx="2"/><path d="M12 3v18"/>',
  upload: '<path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4M17 8l-5-5-5 5M12 3v12"/>',
  download: '<path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4M7 10l5 5 5-5M12 15V3"/>',
  lock: '<rect x="3" y="11" width="18" height="11" rx="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/>',
  tag: '<path d="M12.586 2.586A2 2 0 0 0 11.172 2H4a2 2 0 0 0-2 2v7.172a2 2 0 0 0 .586 1.414l8.704 8.704a2.426 2.426 0 0 0 3.42 0l6.58-6.58a2.426 2.426 0 0 0 0-3.42z"/><circle cx="7.5" cy="7.5" r=".5" fill="currentColor"/>',
  droplet: '<path d="M12 22a7 7 0 0 0 7-7c0-2-1-3.9-3-5.5s-3.5-4-4-6.5c-.5 2.5-2 4.9-4 6.5C6 11.1 5 13 5 15a7 7 0 0 0 7 7z"/>',
  note: '<path d="M14.5 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7.5L14.5 2z"/><path d="M14 2v6h6M16 13H8M16 17H8M10 9H8"/>',
  cake: '<path d="M20 21v-8a2 2 0 0 0-2-2H6a2 2 0 0 0-2 2v8M4 16s.5-1 2-1 2.5 2 4 2 2.5-2 4-2 2.5 2 4 2 2-1 2-1M2 21h20M7 8v3M12 8v3M17 8v3M7 4h.01M12 4h.01M17 4h.01"/>',
  info: '<circle cx="12" cy="12" r="10"/><path d="M12 16v-4M12 8h.01"/>',
  database: '<ellipse cx="12" cy="5" rx="9" ry="3"/><path d="M3 5v14a9 3 0 0 0 18 0V5M3 12a9 3 0 0 0 18 0"/>',
  sparkle: '<path d="M12 3l1.9 5.6L19.5 10.5l-5.6 1.9L12 18l-1.9-5.6L4.5 10.5l5.6-1.9z"/>',
  left: '<path d="m15 18-6-6 6-6"/>',
  right: '<path d="m9 18 6-6-6-6"/>',
  zoom: '<circle cx="11" cy="11" r="8"/><path d="m21 21-4.3-4.3M11 8v6M8 11h6"/>',
  backspace: '<path d="M21 4H8l-7 8 7 8h13a2 2 0 0 0 2-2V6a2 2 0 0 0-2-2z"/><path d="m18 9-6 6M12 9l6 6"/>',
  swap: '<path d="M16 3h5v5M4 20 21 3M21 16v5h-5M15 15l6 6M4 4l5 5"/>',
  share: '<path d="M12 3v13M7 8l5-5 5 5"/><path d="M5 12v7a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2v-7"/>',
};

export function icon(name, cls = '') {
  return `<svg class="ic ${cls}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${ICONS[name] || ''}</svg>`;
}

/* ---------------- Tarih ---------------- */
const TR = 'tr-TR';

export function parseDate(v) {
  if (!v) return null;
  if (v instanceof Date) return v;
  // "YYYY-MM-DD" veya "YYYY-MM-DDTHH:mm" yerel saat olarak yorumlanır
  const d = new Date(v.length === 10 ? v + 'T00:00:00' : v);
  return isNaN(d) ? null : d;
}

export function fmtDate(v, opts = {}) {
  const d = parseDate(v);
  if (!d) return '—';
  return d.toLocaleDateString(TR, { day: 'numeric', month: 'short', year: 'numeric', ...opts });
}

export function fmtDateLong(v) {
  const d = parseDate(v);
  if (!d) return '—';
  return d.toLocaleDateString(TR, { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });
}

export function fmtTime(v) {
  const d = parseDate(v);
  if (!d) return '';
  return d.toLocaleTimeString(TR, { hour: '2-digit', minute: '2-digit' });
}

export function fmtDateTime(v) {
  const d = parseDate(v);
  if (!d) return '—';
  return `${fmtDate(d)} · ${fmtTime(d)}`;
}

export function fmtDayMonth(v) {
  const d = parseDate(v);
  if (!d) return '—';
  return d.toLocaleDateString(TR, { day: 'numeric', month: 'short' });
}

export function weekdayShort(v) {
  const d = parseDate(v);
  return d ? d.toLocaleDateString(TR, { weekday: 'short' }) : '';
}

export function age(birth) {
  const d = parseDate(birth);
  if (!d) return null;
  const now = new Date();
  let a = now.getFullYear() - d.getFullYear();
  const m = now.getMonth() - d.getMonth();
  if (m < 0 || (m === 0 && now.getDate() < d.getDate())) a--;
  return a;
}

export function startOfDay(d) {
  const x = new Date(d);
  x.setHours(0, 0, 0, 0);
  return x;
}

export function daysBetween(a, b) {
  return Math.round((startOfDay(b) - startOfDay(a)) / 86400000);
}

/** "Bugün", "Yarın", "3 gün sonra", "2 gün önce" */
export function relDay(v) {
  const d = parseDate(v);
  if (!d) return '';
  const n = daysBetween(new Date(), d);
  if (n === 0) return 'Bugün';
  if (n === 1) return 'Yarın';
  if (n === -1) return 'Dün';
  if (n > 1 && n < 30) return `${n} gün sonra`;
  if (n < -1 && n > -30) return `${-n} gün önce`;
  const w = Math.round(n / 7);
  if (Math.abs(n) < 90) return n > 0 ? `${w} hafta sonra` : `${-w} hafta önce`;
  const mo = Math.round(n / 30);
  if (Math.abs(n) < 365) return n > 0 ? `${mo} ay sonra` : `${-mo} ay önce`;
  const y = Math.round(n / 365);
  return n > 0 ? `${y} yıl sonra` : `${-y} yıl önce`;
}

/** İşlem tarihine göre "3. gün", "2. hafta" vb. */
export function sinceProcedure(procDate, at = new Date()) {
  const n = daysBetween(parseDate(procDate), at);
  if (n < 0) return 'işlem öncesi';
  if (n === 0) return 'işlem günü';
  if (n < 7) return `${n}. gün`;
  if (n < 28) return `${Math.floor(n / 7)}. hafta`;
  if (n < 365) return `${Math.floor(n / 30)}. ay`;
  return `${Math.floor(n / 365)}. yıl`;
}

export function phoneHref(phone) {
  return 'tel:' + (phone || '').replace(/[^\d+]/g, '');
}

/* ---------------- Katman: sheet / confirm / toast ---------------- */
const layer = () => document.getElementById('layer');

/* Sheet açıkken arka plandaki sayfanın kaymasını engeller (iOS dahil) */
let openSheets = 0;
let savedScrollY = 0;
function lockScroll() {
  if (openSheets++ > 0) return;
  savedScrollY = window.scrollY;
  document.body.style.top = `-${savedScrollY}px`;
  document.body.classList.add('scroll-locked');
}
function unlockScroll() {
  if (--openSheets > 0) return;
  openSheets = 0;
  document.body.classList.remove('scroll-locked');
  document.body.style.top = '';
  window.scrollTo(0, savedScrollY);
}

/**
 * Alt sayfa (mobil) / diyalog (masaüstü). content: HTML string veya element.
 * Döner: { el, body, close(result) , result: Promise }
 */
export function sheet({ title, content, footer = '', size = 'md', onClose, closeText = 'Vazgeç' } = {}) {
  const root = el(`
    <div class="sheet-backdrop" role="presentation">
      <div class="sheet sheet-${size}" role="dialog" aria-modal="true" aria-label="${esc(title || '')}">
        <div class="sheet-head">
          <div class="sheet-grip" aria-hidden="true"></div>
          <h2 class="sheet-title">${esc(title || '')}</h2>
          <button class="sheet-close" type="button">${esc(closeText)}</button>
        </div>
        <div class="sheet-body"></div>
        ${footer ? `<div class="sheet-foot">${footer}</div>` : ''}
      </div>
    </div>`);
  const body = root.querySelector('.sheet-body');
  if (typeof content === 'string') body.innerHTML = content; else if (content) body.appendChild(content);

  let resolve;
  const result = new Promise((r) => { resolve = r; });
  let closed = false;
  const close = (val = null) => {
    if (closed || !root.isConnected) return;
    closed = true;
    root.classList.add('closing');
    document.removeEventListener('keydown', onKey);
    unlockScroll();
    setTimeout(() => { root.remove(); onClose?.(val); resolve(val); }, 180);
  };
  const onKey = (e) => { if (e.key === 'Escape') close(null); };
  root.addEventListener('click', (e) => { if (e.target === root) close(null); });
  root.querySelector('.sheet-close').addEventListener('click', () => close(null));
  document.addEventListener('keydown', onKey);
  lockScroll();
  layer().appendChild(root);
  setTimeout(() => root.classList.add('open'), 10);
  const first = body.querySelector('input:not([type=hidden]),select,textarea,button');
  if (first && window.matchMedia('(min-width: 880px)').matches) setTimeout(() => first.focus(), 200);
  return { el: root, body, close, result };
}

/** Silme / geri alınamaz eylem onayı — alttan çıkan iOS eylem sayfası (TASARIM.md §5) */
export function confirmDialog({ title = 'Emin misiniz?', message = '', okText = 'Evet', cancelText = 'Vazgeç', danger = false } = {}) {
  return new Promise((resolve) => {
    const root = el(`
      <div class="action-sheet" role="dialog" aria-modal="true" aria-label="${esc(title)}">
        <div class="as-group">
          <div class="as-card">
            <div class="as-head"><div class="as-title">${esc(title)}</div>${message ? `<div class="as-text">${esc(message)}</div>` : ''}</div>
            <button class="as-btn ${danger ? 'danger' : 'primary'}" type="button" data-act="ok">${esc(okText)}</button>
          </div>
          <button class="as-cancel" type="button" data-act="cancel">${esc(cancelText)}</button>
        </div>
      </div>`);
    let done = false;
    const close = (v) => {
      if (done) return; done = true;
      root.classList.remove('open');
      document.removeEventListener('keydown', onKey);
      unlockScroll();
      setTimeout(() => { root.remove(); resolve(v); }, 200);
    };
    const onKey = (e) => { if (e.key === 'Escape') close(false); };
    root.addEventListener('click', (e) => { if (e.target === root) close(false); });
    root.querySelector('[data-act=ok]').onclick = () => close(true);
    root.querySelector('[data-act=cancel]').onclick = () => close(false);
    document.addEventListener('keydown', onKey);
    lockScroll();
    layer().appendChild(root);
    requestAnimationFrame(() => root.classList.add('open'));
  });
}

/** Basit eylem menüsü: items [{label, icon, danger, value}] */
export function actionMenu(title, items) {
  const s = sheet({
    title,
    size: 'sm',
    content: `<div class="menu">${items.map((it, i) => `
      <button class="menu-item ${it.danger ? 'danger' : ''}" data-i="${i}" type="button">
        ${it.icon ? icon(it.icon) : ''}<span>${esc(it.label)}</span>${it.checked ? `<span class="check-mark">${icon('check')}</span>` : ''}
      </button>`).join('')}</div>`,
  });
  s.body.querySelectorAll('.menu-item').forEach((b) => {
    b.onclick = () => s.close(items[+b.dataset.i].value ?? items[+b.dataset.i].label);
  });
  return s.result;
}

let toastTimer;
export function toast(msg, { kind = 'default', duration = 2600 } = {}) {
  let t = document.getElementById('toast');
  if (!t) {
    t = el('<div id="toast" class="toast" role="status" aria-live="polite"></div>');
    layer().appendChild(t);
  }
  t.textContent = msg;
  t.className = `toast toast-${kind} show`;
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => t.classList.remove('show'), duration);
}

/* ---------------- Form yardımcıları ---------------- */
export function formData(form) {
  const out = {};
  new FormData(form).forEach((v, k) => { out[k] = typeof v === 'string' ? v.trim() : v; });
  form.querySelectorAll('input[type=checkbox]').forEach((c) => { out[c.name] = c.checked; });
  return out;
}

/** Alan etiketi: zorunlu değilse "· isteğe bağlı" (optional: false ile kapatılır) */
export function fieldLabel(label, { required = false, optional = true } = {}) {
  return `<span class="field-label">${esc(label)}${!required && optional ? ' <span class="opt">· isteğe bağlı</span>' : ''}</span>`;
}

export function field({ label, name, type = 'text', value = '', placeholder = '', required = false, optional = true, hint = '', attrs = '' }) {
  const input = `<input class="input" type="${type}" name="${name}" value="${esc(value)}" placeholder="${esc(placeholder)}" ${required ? 'required' : ''} ${attrs}>`;
  // iOS Safari tarih/saat kutularına içsel genişlik dayatır; sabit boyutlu sarmalayıcı bunu geçersiz kılar. Sağda ikon; dokununca native seçici.
  const isDate = type === 'date' || type === 'time' || type === 'datetime-local';
  return `
    <label class="field">
      ${fieldLabel(label, { required, optional })}
      ${isDate ? `<span class="date-wrap">${input}${icon(type === 'time' ? 'clock' : 'calendar', 'date-icon')}</span>` : input}
      ${hint ? `<span class="field-hint">${esc(hint)}</span>` : ''}
    </label>`;
}

export function selectField({ label, name, value = '', options = [], required = false, optional = true, hint = '' }) {
  return `
    <label class="field">
      ${fieldLabel(label, { required, optional })}
      <span class="select-wrap">
        <select class="input" name="${name}" ${required ? 'required' : ''}>
          ${options.map((o) => {
            const [v, l] = Array.isArray(o) ? o : [o, o];
            return `<option value="${esc(v)}" ${String(v) === String(value) ? 'selected' : ''}>${esc(l)}</option>`;
          }).join('')}
        </select>${icon('down', 'select-caret')}
      </span>
      ${hint ? `<span class="field-hint">${esc(hint)}</span>` : ''}
    </label>`;
}

export function textareaField({ label, name, value = '', placeholder = '', rows = 3, optional = true }) {
  return `
    <label class="field">
      ${fieldLabel(label, { required: false, optional })}
      <textarea class="input" name="${name}" rows="${rows}" placeholder="${esc(placeholder)}">${esc(value)}</textarea>
    </label>`;
}

/** Segment (sekme) kontrolü; value seçili olanı işaretler */
export function segmented({ name, value, options, cls = '' }) {
  return `<div class="seg ${cls}" role="tablist" data-name="${name}">
    ${options.map(([v, l]) => `<button type="button" role="tab" class="seg-btn ${String(v) === String(value) ? 'on' : ''}" data-value="${esc(v)}" aria-selected="${String(v) === String(value)}">${l}</button>`).join('')}
  </div>`;
}

/** Kısa seçim (cinsiyet, tema): segment kontrol + gizli input. bindChoiceFields(form) ile bağlanır. */
export function segmentField({ label, name, value = '', options = [], required = false, optional = true }) {
  return `
    <div class="field">
      ${label ? fieldLabel(label, { required, optional }) : ''}
      <input type="hidden" name="${name}" value="${esc(value)}">
      ${segmented({ name, value, options, cls: 'seg-field' })}
    </div>`;
}

/** Çok seçenekli kısa liste (işlem türü, kontrol dönemleri): chip grubu + gizli input (çoklu seçimde virgülle) */
export function chipField({ label, name, value = '', options = [], multiple = false, required = false, optional = true }) {
  const selected = new Set(multiple ? String(value || '').split(',').filter(Boolean) : [String(value)]);
  return `
    <div class="field">
      ${label ? fieldLabel(label, { required, optional }) : ''}
      <input type="hidden" name="${name}" value="${esc(value)}">
      <div class="chip-group" data-chips="${name}" data-multiple="${multiple ? '1' : ''}">
        ${options.map((o) => { const [v, l] = Array.isArray(o) ? o : [o, o]; return `<button type="button" class="chip ${selected.has(String(v)) ? 'on' : ''}" data-value="${esc(v)}">${esc(l)}</button>`; }).join('')}
      </div>
    </div>`;
}

/** Formdaki segment ve chip alanlarını gizli input'larına bağlar */
export function bindChoiceFields(form) {
  form.querySelectorAll('.seg-field').forEach((seg) => {
    const hidden = form.querySelector(`input[type=hidden][name="${seg.dataset.name}"]`);
    bindSegmented(seg, (v) => { if (hidden) hidden.value = v; });
  });
  form.querySelectorAll('[data-chips]').forEach((group) => {
    const hidden = form.querySelector(`input[type=hidden][name="${group.dataset.chips}"]`);
    const multiple = !!group.dataset.multiple;
    group.querySelectorAll('.chip').forEach((b) => {
      b.addEventListener('click', () => {
        if (multiple) {
          b.classList.toggle('on');
          hidden.value = [...group.querySelectorAll('.chip.on')].map((x) => x.dataset.value).join(',');
        } else {
          group.querySelectorAll('.chip').forEach((x) => x.classList.toggle('on', x === b));
          hidden.value = b.dataset.value;
        }
      });
    });
  });
}

export function bindSegmented(segEl, onChange) {
  segEl.querySelectorAll('.seg-btn').forEach((b) => {
    b.addEventListener('click', () => {
      segEl.querySelectorAll('.seg-btn').forEach((x) => { x.classList.remove('on'); x.setAttribute('aria-selected', 'false'); });
      b.classList.add('on');
      b.setAttribute('aria-selected', 'true');
      onChange?.(b.dataset.value);
    });
  });
}

/** Durum düz metin olarak; renk yalnızca gerektiğinde (gecikmiş / gelmedi) */
export function statusText(status, { overdue = false, today = false } = {}) {
  if (overdue) return '<span class="status danger">Gecikti</span>';
  const map = { planned: [today ? 'Bugün' : 'Planlı', ''], done: ['Yapıldı', 'muted'], missed: ['Gelmedi', 'warning'], cancelled: ['İptal', 'muted'] };
  const [l, c] = map[status] || [status, ''];
  return `<span class="status ${c}">${esc(l)}</span>`;
}
export const statusPill = statusText;

export function emptyState({ title, text = '', action = '', center = false }) {
  return `<div class="empty ${center ? 'center' : ''}">
    <div class="empty-title">${esc(title)}</div>
    ${text ? `<div class="empty-text">${esc(text)}</div>` : ''}
    ${action}
  </div>`;
}
