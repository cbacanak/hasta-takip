/* Ayarlar — bölüm etiketi + hairline satırlar; yıkıcı eylem yalnızca kırmızı metin */
import { counts, clearAllData } from '../db.js';
import { esc, icon, toast, confirmDialog, actionMenu } from '../ui.js';
import { setTopbar } from '../nav.js';
import { storageInfo, requestPersist, fmtBytes, downloadBackup, pickBackupFile, restoreBackup } from '../storage.js';
import { hasPin, getLockDelay, setLockDelay, clearPin, setupPinFlow, requirePin, LOCK_DELAYS } from '../lock.js';

export const APP_VERSION = '0.2.1';

export async function render(root) {
  setTopbar({ title: 'Ayarlar' });
  const [c, st, pinOn, lockDelay] = await Promise.all([counts(), storageInfo(), hasPin(), getLockDelay()]);
  const delayLabel = (LOCK_DELAYS.find(([v]) => v === lockDelay) || [0, 'Hemen'])[1];
  const modeTitle = st.inApp ? 'Uygulama içi tarayıcı' : st.standalone ? 'Ana ekran uygulaması' : 'Tarayıcı sekmesi';
  const modeSub = st.inApp
    ? 'Veriler kalıcı olmayabilir. Safari veya Chrome ile açıp ana ekrana ekle.'
    : st.standalone ? 'Veriler bu uygulamaya özel saklanır.'
    : st.ios ? 'Safari 7 gün kullanılmayan site verilerini silebilir. Ana ekrana ekle.'
    : 'Ana ekrana eklersen uygulama gibi açılır.';
  const persistTitle = st.persisted === true ? 'Kalıcı depolama açık' : st.persisted === false ? 'Kalıcı depolama kapalı' : 'Kalıcı depolama';
  const persistSub = st.persisted === true ? 'Tarayıcı yer açmak için bu verileri silmez.'
    : st.persisted === false ? 'Tarayıcı yer darlığında verileri silebilir. Dokunarak iste.'
    : 'Bu tarayıcı kalıcı depolama isteğini desteklemiyor.';

  const rowBtn = (act, title, sub, { value = '', danger = false, disabled = false } = {}) => `
    <button class="setting-row ${danger ? 'danger' : ''}" type="button" data-act="${act}" ${disabled ? 'disabled' : ''}>
      <div class="setting-main"><div class="setting-title">${title}</div>${sub ? `<div class="setting-sub">${sub}</div>` : ''}</div>
      ${value ? `<div class="setting-value">${value}</div>` : ''}${disabled ? '' : icon('chevron')}
    </button>`;
  const rowInfo = (title, sub, value = '') => `
    <div class="setting-row">
      <div class="setting-main"><div class="setting-title">${title}</div>${sub ? `<div class="setting-sub">${sub}</div>` : ''}</div>
      ${value ? `<div class="setting-value">${value}</div>` : ''}
    </div>`;

  root.innerHTML = `
    <div class="screen">
    <div class="page-head">
      <div>
        <h1 class="page-title">Ayarlar</h1>
        <div class="page-sub">Veriler yalnızca bu cihazda saklanır</div>
      </div>
    </div>

    <section class="section">
      <div class="section-label">Güvenlik</div>
      ${rowBtn('pin', 'PIN kilidi', pinOn ? `Arka plana alındıktan ${esc(delayLabel === 'Hemen' ? 'hemen sonra' : delayLabel + ' sonra')} kilitlenir.` : 'Açılışta ve arka plandan dönüşte PIN sorulur.', { value: pinOn ? 'Açık' : 'Kapalı' })}
    </section>

    <section class="section">
      <div class="section-label">Yedekleme</div>
      ${rowBtn('backup', 'Yedek al', 'Tüm veriler fotoğraflarla birlikte tek dosyaya kaydedilir.')}
      ${rowBtn('restore', 'Yedeği geri yükle', 'Başka cihazdan veya Safari\'den alınan yedeği aktarır.')}
    </section>

    <section class="section">
      <div class="section-label">Depolama</div>
      ${rowInfo(esc(modeTitle), esc(modeSub))}
      ${st.persisted === false ? rowBtn('persist', esc(persistTitle), esc(persistSub)) : rowInfo(esc(persistTitle), esc(persistSub))}
      ${rowInfo('Kullanılan alan', '', `${esc(fmtBytes(st.usage))}${st.quota ? ` / ${esc(fmtBytes(st.quota))}` : ''}`)}
      ${rowInfo('Kayıtlar', '', `${c.patients} hasta · ${c.procedures} işlem · ${c.photos} fotoğraf · ${c.appointments} randevu`)}
    </section>

    <section class="section">
      <div class="section-label">Veri</div>
      ${rowBtn('clear', 'Tüm verileri sil', 'Hasta, işlem, fotoğraf ve randevular kalıcı olarak silinir.', { danger: true })}
    </section>

    <p class="t-caption section" style="color:var(--text-tertiary)">Hasta Takip · sürüm ${APP_VERSION}</p>
    </div>`;

  root.querySelector('[data-act=pin]').onclick = async () => {
    if (!pinOn) {
      if (await setupPinFlow()) { toast('PIN kilidi açıldı'); render(root); }
      return;
    }
    const v = await actionMenu('PIN kilidi', [
      { label: 'PIN\'i değiştir', value: 'change' },
      { label: `Kilitleme süresi · ${delayLabel}`, value: 'delay' },
      { label: 'PIN kilidini kaldır', danger: true, value: 'remove' },
    ]);
    if (v === 'change') {
      if (!(await requirePin())) return;
      if (await setupPinFlow()) { toast('PIN değiştirildi'); render(root); }
    } else if (v === 'delay') {
      const d = await actionMenu('Arka plana alındıktan sonra kilitle', LOCK_DELAYS.map(([sec, label]) => ({ label, value: String(sec), checked: sec === lockDelay })));
      if (d == null) return;
      await setLockDelay(Number(d));
      render(root);
    } else if (v === 'remove') {
      if (!(await requirePin())) return;
      await clearPin();
      toast('PIN kilidi kaldırıldı');
      render(root);
    }
  };
  root.querySelector('[data-act=backup]').onclick = async () => {
    const b = root.querySelector('[data-act=backup]');
    b.disabled = true;
    try {
      const r = await downloadBackup();
      if (r) toast(r.shared ? 'Yedek paylaşıldı' : `Yedek indirildi · ${fmtBytes(r.size)}`);
    } catch (e) { toast(`Yedek alınamadı: ${e.message || e}`, { kind: 'danger', duration: 5000 }); }
    b.disabled = false;
  };
  root.querySelector('[data-act=restore]').onclick = async () => {
    const f = await pickBackupFile();
    if (!f) return;
    try {
      const r = await restoreBackup(f);
      if (r) render(root);
    } catch (e) { toast(e.message || 'Geri yükleme başarısız', { kind: 'danger', duration: 5000 }); }
  };
  const persist = root.querySelector('[data-act=persist]');
  if (persist) persist.onclick = async () => {
    const ok = await requestPersist();
    toast(ok ? 'Kalıcı depolama açıldı' : 'Tarayıcı kalıcı depolamaya izin vermedi');
    render(root);
  };
  root.querySelector('[data-act=clear]').onclick = async () => {
    const ok = await confirmDialog({ title: 'Tüm veriler silinsin mi?', message: `${c.patients} hasta, ${c.photos} fotoğraf ve tüm randevular kalıcı olarak silinecek. Bu işlem geri alınamaz.`, okText: 'Hepsini sil', danger: true });
    if (!ok) return;
    await clearAllData();
    toast('Tüm veriler silindi');
    render(root);
  };
}
