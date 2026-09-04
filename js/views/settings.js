/* Ayarlar: veri temizleme, sürüm (PIN ve yedekleme sonraki aşamada) */
import { counts, clearAllData } from '../db.js';
import { esc, icon, toast, confirmDialog, actionMenu } from '../ui.js';
import { setTopbar } from '../nav.js';
import { storageInfo, requestPersist, fmtBytes, downloadBackup, pickBackupFile, restoreBackup } from '../storage.js';
import { hasPin, getLockDelay, setLockDelay, clearPin, setupPinFlow, requirePin, LOCK_DELAYS } from '../lock.js';

export const APP_VERSION = '0.1.9';

export async function render(root) {
  setTopbar({ title: 'Ayarlar' });
  const [c, st, pinOn, lockDelay] = await Promise.all([counts(), storageInfo(), hasPin(), getLockDelay()]);
  const delayLabel = (LOCK_DELAYS.find(([v]) => v === lockDelay) || [0, 'Hemen'])[1];
  const modeTitle = st.inApp ? 'Uygulama içi tarayıcı' : st.standalone ? 'Ana ekran uygulaması' : 'Tarayıcı sekmesi';
  const modeSub = st.inApp
    ? 'Veriler kalıcı olmayabilir. Safari veya Chrome ile açıp ana ekrana ekleyin.'
    : st.standalone ? 'Veriler bu uygulamaya özel olarak saklanır.'
    : st.ios ? 'Safari 7 gün kullanılmayan site verilerini silebilir. Ana ekrana ekleyin.'
    : 'Ana ekrana eklerseniz uygulama gibi açılır.';
  const persistTitle = st.persisted === true ? 'Kalıcı depolama açık' : st.persisted === false ? 'Kalıcı depolama kapalı' : 'Kalıcı depolama';
  const persistSub = st.persisted === true ? 'Tarayıcı yer açmak için bu verileri silmez.'
    : st.persisted === false ? 'Tarayıcı yer darlığında verileri silebilir. Dokunarak isteyin.'
    : 'Bu tarayıcı kalıcı depolama isteğini desteklemiyor.';
  root.innerHTML = `
    <div class="page-head"><div><div class="page-title">Ayarlar</div><div class="page-sub">Tüm veriler yalnızca bu cihazda saklanır.</div></div></div>

    <section class="card section">
      <div class="card-head"><div class="card-title">Veri</div></div>
      <div class="list">
        <div class="row"><div class="avatar" style="background:var(--surface-3);color:var(--text-2)">${icon('database')}</div>
          <div class="row-main"><div class="row-title">Kayıtlar</div><div class="row-sub">${c.patients} hasta · ${c.procedures} işlem · ${c.photos} fotoğraf · ${c.appointments} randevu</div></div></div>
        <button class="row" data-act="clear"><div class="avatar" style="background:var(--danger-soft);color:var(--danger)">${icon('trash')}</div>
          <div class="row-main"><div class="row-title" style="color:var(--danger)">Tüm verileri sil</div><div class="row-sub">Hasta, işlem, fotoğraf ve randevular kalıcı olarak silinir.</div></div>${icon('chevron', 'muted-3')}</button>
      </div>
    </section>

    <section class="card section">
      <div class="card-head"><div class="card-title">Yedekleme</div></div>
      <div class="list">
        <button class="row" data-act="backup"><div class="avatar" style="background:var(--accent-soft);color:var(--accent-text)">${icon('download')}</div>
          <div class="row-main"><div class="row-title">Yedek al</div><div class="row-sub">Tüm veriler fotoğraflarla birlikte tek dosyaya kaydedilir.</div></div>${icon('chevron', 'muted-3')}</button>
        <button class="row" data-act="restore"><div class="avatar" style="background:var(--surface-3);color:var(--text-2)">${icon('upload')}</div>
          <div class="row-main"><div class="row-title">Yedeği geri yükle</div><div class="row-sub">Başka cihazdan veya Safari'den alınan yedeği bu uygulamaya aktarır.</div></div>${icon('chevron', 'muted-3')}</button>
      </div>
      <p class="xs muted-3" style="padding:8px 16px 12px;margin:0">Veriler yalnızca bu cihazda, bu tarayıcıda saklanır. Cihaz değişiminde ya da iPhone'da ana ekrana ekledikten sonra verileri taşımak için yedek alın.</p>
    </section>

    <section class="card section">
      <div class="card-head"><div class="card-title">Depolama</div></div>
      <div class="list">
        <div class="row"><div class="avatar" style="background:${st.inApp ? 'var(--danger-soft);color:var(--danger)' : 'var(--surface-3);color:var(--text-2)'}">${icon(st.inApp ? 'alert' : 'info')}</div>
          <div class="row-main"><div class="row-title">${esc(modeTitle)}</div><div class="row-sub" style="white-space:normal">${esc(modeSub)}</div></div></div>
        <button class="row" data-act="persist" ${st.persisted !== false ? 'disabled' : ''}><div class="avatar" style="background:${st.persisted === true ? 'var(--ok-soft);color:var(--ok)' : 'var(--surface-3);color:var(--text-2)'}">${icon(st.persisted === true ? 'check' : 'lock')}</div>
          <div class="row-main"><div class="row-title">${esc(persistTitle)}</div><div class="row-sub" style="white-space:normal">${esc(persistSub)}</div></div></button>
        <div class="row"><div class="avatar" style="background:var(--surface-3);color:var(--text-2)">${icon('database')}</div>
          <div class="row-main"><div class="row-title">Kullanılan alan</div><div class="row-sub">${esc(fmtBytes(st.usage))}${st.quota ? ` · en fazla ${esc(fmtBytes(st.quota))}` : ''}</div></div></div>
      </div>
    </section>

    <section class="card section">
      <div class="card-head"><div class="card-title">Güvenlik</div></div>
      <div class="list">
        <button class="row" data-act="pin"><div class="avatar" style="background:${pinOn ? 'var(--ok-soft);color:var(--ok)' : 'var(--surface-3);color:var(--text-2)'}">${icon('lock')}</div>
          <div class="row-main"><div class="row-title">PIN kilidi ${pinOn ? '<span class="pill pill-ok">Açık</span>' : ''}</div>
            <div class="row-sub">${pinOn ? `Arka plana alındıktan ${esc(delayLabel === 'Hemen' ? 'hemen sonra' : delayLabel + ' sonra')} kilitlenir.` : 'Uygulamayı açarken ve arka plandan dönerken PIN sorulur.'}</div></div>${icon('chevron', 'muted-3')}</button>
      </div>
      ${pinOn ? '' : '<p class="xs muted-3" style="padding:8px 16px 12px;margin:0">Hasta verisi taşıyan bir cihazda PIN kilidi açık olmalıdır.</p>'}
    </section>

    <p class="xs muted-3 section" style="text-align:center">Hasta Takip · sürüm ${APP_VERSION}</p>`;

  root.querySelector('[data-act=backup]').onclick = async () => {
    const b = root.querySelector('[data-act=backup]');
    b.disabled = true;
    try {
      const r = await downloadBackup();
      if (r) toast(r.shared ? 'Yedek paylaşıldı' : `Yedek indirildi (${fmtBytes(r.size)})`, { kind: 'ok' });
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
  root.querySelector('[data-act=persist]').onclick = async () => {
    const ok = await requestPersist();
    toast(ok ? 'Kalıcı depolama açıldı' : 'Tarayıcı kalıcı depolamaya izin vermedi', { kind: ok ? 'ok' : 'default' });
    render(root);
  };
  root.querySelector('[data-act=pin]').onclick = async () => {
    if (!pinOn) {
      if (await setupPinFlow()) { toast('PIN kilidi açıldı', { kind: 'ok' }); render(root); }
      return;
    }
    const v = await actionMenu('PIN kilidi', [
      { label: 'PIN\'i değiştir', icon: 'edit', value: 'change' },
      { label: `Kilitleme süresi · ${delayLabel}`, icon: 'clock', value: 'delay' },
      { label: 'PIN kilidini kaldır', icon: 'trash', danger: true, value: 'remove' },
    ]);
    if (v === 'change') {
      if (!(await requirePin())) return;
      if (await setupPinFlow()) { toast('PIN değiştirildi', { kind: 'ok' }); render(root); }
    } else if (v === 'delay') {
      const d = await actionMenu('Arka plana alındıktan sonra kilitle', LOCK_DELAYS.map(([sec, label]) => ({ label: sec === lockDelay ? `${label} ✓` : label, icon: 'clock', value: String(sec) })));
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
  root.querySelector('[data-act=clear]').onclick = async () => {
    const ok = await confirmDialog({ title: 'Tüm veriler silinsin mi?', message: `${c.patients} hasta, ${c.photos} fotoğraf ve tüm randevular kalıcı olarak silinecek. Bu işlem geri alınamaz.`, okText: 'Hepsini sil', danger: true });
    if (!ok) return;
    await clearAllData();
    toast('Tüm veriler silindi');
    render(root);
  };
}
