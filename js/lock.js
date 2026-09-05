/* PIN kilidi
 * PIN düz metin saklanmaz: PBKDF2-SHA256 (rastgele tuz) türevi ayarlar deposunda tutulur.
 * Açılışta ve arka planda belirli süre kaldıktan sonra tam ekran PIN sorulur.
 * Yedek dosyasına PIN kaydı yazılmaz (db.js exportAll/importAll 'pin' anahtarını dışlar).
 */
import { Settings, clearAllData } from './db.js';
import { el, icon, esc, toast } from './ui.js';

const PIN_KEY = 'pin';
const DELAY_KEY = 'lockDelay';            // saniye; 0 = hemen
const FAIL_KEY = 'hasta-takip:pin-fail';  // deneme sayacı (kaba kuvvet frenleme)
const ITER = 150000;
export const LOCK_DELAYS = [[0, 'Hemen'], [60, '1 dakika'], [300, '5 dakika'], [900, '15 dakika']];
export const DEFAULT_DELAY = 60;

/* ---------------- Kriptografi ---------------- */
const enc = new TextEncoder();
const b64 = (buf) => btoa(String.fromCharCode(...new Uint8Array(buf)));
const unb64 = (s) => Uint8Array.from(atob(s), (c) => c.charCodeAt(0));
export const cryptoAvailable = () => !!(globalThis.crypto && crypto.subtle && crypto.getRandomValues);

async function derive(pin, salt, iter) {
  const key = await crypto.subtle.importKey('raw', enc.encode(pin), 'PBKDF2', false, ['deriveBits']);
  const bits = await crypto.subtle.deriveBits({ name: 'PBKDF2', hash: 'SHA-256', salt, iterations: iter }, key, 256);
  return b64(bits);
}

export async function hasPin() { return !!(await Settings.get(PIN_KEY)); }
export async function setPin(pin) {
  const salt = crypto.getRandomValues(new Uint8Array(16));
  await Settings.set(PIN_KEY, { v: 1, salt: b64(salt), hash: await derive(pin, salt, ITER), iter: ITER, len: pin.length });
}
export async function verifyPin(pin) {
  const rec = await Settings.get(PIN_KEY);
  if (!rec) return true;
  return (await derive(pin, unb64(rec.salt), rec.iter || ITER)) === rec.hash;
}
export const clearPin = () => Settings.remove(PIN_KEY);
export const getLockDelay = () => Settings.get(DELAY_KEY, DEFAULT_DELAY);
export const setLockDelay = (sec) => Settings.set(DELAY_KEY, sec);

/* ---------------- Deneme frenleme ---------------- */
function failState() { try { return JSON.parse(localStorage.getItem(FAIL_KEY)) || { n: 0, until: 0 }; } catch { return { n: 0, until: 0 }; } }
function saveFail(st) { try { localStorage.setItem(FAIL_KEY, JSON.stringify(st)); } catch { /* yok say */ } }
function recordFail() {
  const st = failState();
  st.n += 1;
  if (st.n >= 5) st.until = Date.now() + (st.n >= 10 ? 300 : 30) * 1000;
  saveFail(st);
  return st;
}
export function resetFail() { saveFail({ n: 0, until: 0 }); }

/* ---------------- PIN giriş ekranı ---------------- */
/**
 * Tam ekran tuş takımı. Döner: girilen PIN ya da vazgeçildiyse null.
 *  - length verilirse o kadar hane girilince kendiliğinden gönderilir; verilmezse 4–6 hane + Tamam.
 *  - verify(pin) → true (kabul) | string (hata mesajı, tekrar sorulur). verify yoksa ilk giriş döner.
 *  - throttle: yanlış girişleri sayıp bekletme uygular (yalnızca gerçek PIN doğrulamasında).
 *  - forgot: "PIN'i unuttum" akışı (kilit ekranı); tüm veriyi siler.
 */
export function pinEntry({ title, sub = '', length = null, minLength = 4, maxLength = 6, cancel = true, verify = null, throttle = false, forgot = false }) {
  return new Promise((resolve) => {
    let val = '';
    let busy = false;
    const max = length || maxLength;
    const root = el(`
      <div class="lock" role="dialog" aria-modal="true" aria-label="${esc(title)}">
        <div class="lock-head">${cancel ? `<button class="btn-icon" type="button" data-act="cancel" aria-label="Vazgeç">${icon('x')}</button>` : ''}</div>
        <div class="lock-body">
          <div class="lock-mark">${icon('lock')}</div>
          <h2 class="lock-title">${esc(title)}</h2>
          <div class="lock-sub">${esc(sub)}</div>
          <div class="lock-dots" aria-live="polite"></div>
          <div class="lock-msg" role="alert"></div>
          <div class="lock-pad">
            ${[1, 2, 3, 4, 5, 6, 7, 8, 9].map((n) => `<button type="button" data-k="${n}">${n}</button>`).join('')}
            <button type="button" class="lock-ok ${length ? 'ghost' : ''}" data-act="ok" aria-label="Tamam" disabled ${length ? 'tabindex="-1"' : ''}>${icon('check')}</button>
            <button type="button" data-k="0">0</button>
            <button type="button" class="lock-del" data-act="del" aria-label="Sil">${icon('back')}</button>
          </div>
          ${forgot ? `<button type="button" class="lock-extra" data-act="forgot">PIN'i unuttum</button>` : ''}
        </div>
      </div>`);
    const dots = root.querySelector('.lock-dots');
    const msg = root.querySelector('.lock-msg');
    const ok = root.querySelector('[data-act=ok]');

    const draw = () => {
      const n = length || Math.max(minLength, val.length);
      dots.innerHTML = Array.from({ length: n }, (_, i) => `<span class="lock-dot ${i < val.length ? 'on' : ''}"></span>`).join('');
      ok.disabled = val.length < minLength;
    };
    const showMsg = (t) => { msg.textContent = t || ''; };
    const shake = () => { dots.classList.remove('shake'); void dots.offsetWidth; dots.classList.add('shake'); };
    const close = (result) => { document.removeEventListener('keydown', onKey); root.remove(); resolve(result); };

    const submit = async () => {
      if (busy || val.length < minLength) return;
      busy = true;
      if (!verify) { close(val); return; }
      if (throttle) {
        const st = failState();
        if (st.until > Date.now()) {
          showMsg(`Çok fazla deneme. ${Math.ceil((st.until - Date.now()) / 1000)} saniye bekleyin.`);
          shake(); val = ''; draw(); busy = false; return;
        }
      }
      let r;
      try { r = await verify(val); } catch (e) { r = e?.message || 'Doğrulama yapılamadı'; }
      if (r === true) { if (throttle) resetFail(); close(val); return; }
      let text = typeof r === 'string' ? r : 'Yanlış PIN';
      if (throttle) {
        const f = recordFail();
        if (f.n >= 5) text = `Yanlış PIN. ${f.n >= 10 ? '5 dakika' : '30 saniye'} bekleyin.`;
      }
      shake(); showMsg(text);
      val = ''; draw(); busy = false;
    };
    const press = (k) => {
      if (busy || val.length >= max) return;
      showMsg('');
      val += k; draw();
      if (length && val.length === length) submit();
    };
    const del = () => { if (busy) return; val = val.slice(0, -1); draw(); };
    const onKey = (e) => {
      if (/^[0-9]$/.test(e.key)) { e.preventDefault(); press(e.key); }
      else if (e.key === 'Backspace') { e.preventDefault(); del(); }
      else if (e.key === 'Enter') { e.preventDefault(); submit(); }
      else if (e.key === 'Escape' && cancel) close(null);
    };

    // Dokunmatikte touchend ile hemen tepki ver (çift dokunuş algısı ve 300 ms gecikme olmaz); click fare/klavye için kalır
    const tap = (btn, fn) => {
      let touched = false;
      btn.addEventListener('touchend', (e) => { e.preventDefault(); touched = true; fn(); }, { passive: false });
      btn.addEventListener('click', () => { if (touched) { touched = false; return; } fn(); });
    };
    root.querySelectorAll('[data-k]').forEach((b) => tap(b, () => press(b.dataset.k)));
    tap(root.querySelector('[data-act=del]'), del);
    ok.onclick = submit;
    const c = root.querySelector('[data-act=cancel]');
    if (c) c.onclick = () => close(null);
    const f = root.querySelector('[data-act=forgot]');
    if (f) f.onclick = () => forgotPanel(root, close);

    document.addEventListener('keydown', onKey);
    document.getElementById('layer').appendChild(root);
    draw();
  });
}

/** "PIN'i unuttum": tek yol tüm verileri silmektir; onay paneli tuş takımının yerine gelir. */
function forgotPanel(root, close) {
  const body = root.querySelector('.lock-body');
  const pad = root.querySelector('.lock-pad');
  const extra = root.querySelector('.lock-extra');
  pad.classList.add('hidden'); extra.classList.add('hidden');
  root.querySelector('.lock-dots').classList.add('hidden');
  const panel = el(`
    <div class="lock-confirm">
      <p class="muted small" style="margin:0">PIN yalnızca bu cihazda saklanır ve kurtarılamaz. Sıfırlamanın tek yolu <b>tüm hasta verilerini silmektir</b>. Yedeğiniz varsa sonra geri yükleyebilirsiniz.</p>
      <button type="button" class="btn btn-danger" data-act="wipe">${icon('trash')}Tüm verileri sil ve PIN'i kaldır</button>
      <button type="button" class="btn btn-ghost" data-act="back">Vazgeç</button>
    </div>`);
  body.appendChild(panel);
  panel.querySelector('[data-act=back]').onclick = () => {
    panel.remove(); pad.classList.remove('hidden'); extra.classList.remove('hidden'); root.querySelector('.lock-dots').classList.remove('hidden');
  };
  panel.querySelector('[data-act=wipe]').onclick = async () => {
    panel.querySelector('[data-act=wipe]').disabled = true;
    await clearAllData({ keepSettings: false });
    resetFail();
    toast('Tüm veriler silindi, PIN kaldırıldı');
    close(null);
    location.hash = '#/';
  };
}

/* ---------------- Kilit akışı ---------------- */
let locked = false;
let hiddenAt = null;

export async function showLock() {
  if (locked) return;
  const rec = await Settings.get(PIN_KEY);
  if (!rec) return;
  locked = true;
  document.body.classList.add('locked');
  try {
    await pinEntry({ title: 'Hasta Takip', sub: 'Devam etmek için PIN girin', length: rec.len, cancel: false, verify: verifyPin, throttle: true, forgot: true });
  } finally {
    document.body.classList.remove('locked');
    locked = false;
  }
}

/** Açılışta kilitler (PIN varsa) ve arka plandan dönüşleri izler. Kilit açılana dek çözülmez. */
export async function initLock() {
  document.addEventListener('visibilitychange', async () => {
    if (document.hidden) { hiddenAt = Date.now(); return; }
    if (hiddenAt === null || locked) return;
    const away = Date.now() - hiddenAt; hiddenAt = null;
    if (!(await hasPin())) return;
    const delay = await getLockDelay();
    if (away >= delay * 1000) showLock();
  });
  await showLock();
}

/* ---------------- Ayarlar akışları ---------------- */
export async function setupPinFlow() {
  if (!cryptoAvailable()) { toast('PIN için güvenli bağlantı (https) gerekir', { kind: 'danger' }); return false; }
  const first = await pinEntry({ title: 'Yeni PIN', sub: '4–6 haneli bir PIN belirleyin' });
  if (!first) return false;
  const second = await pinEntry({
    title: 'PIN\'i doğrulayın', sub: 'Aynı PIN\'i bir kez daha girin', length: first.length,
    verify: (p) => (p === first ? true : 'PIN\'ler eşleşmedi, tekrar deneyin'),
  });
  if (!second) return false;
  await setPin(first);
  resetFail();
  return true;
}

/** Ayar değişikliği için mevcut PIN'i ister. PIN yoksa doğrudan true. */
export async function requirePin(title = 'Mevcut PIN') {
  const rec = await Settings.get(PIN_KEY);
  if (!rec) return true;
  const r = await pinEntry({ title, sub: 'Devam etmek için mevcut PIN\'i girin', length: rec.len, verify: verifyPin, throttle: true });
  return r !== null;
}
