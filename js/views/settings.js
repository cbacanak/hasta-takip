/* Ayarlar: örnek veri, veri temizleme, sürüm (PIN ve yedekleme sonraki aşamada) */
import { counts, clearAllData } from '../db.js';
import { esc, icon, toast, confirmDialog } from '../ui.js';
import { loadSampleData } from '../seed.js';
import { setTopbar, go } from '../nav.js';

export const APP_VERSION = '0.1.0';

export async function render(root) {
  setTopbar({ title: 'Ayarlar' });
  const c = await counts();
  root.innerHTML = `
    <div class="page-head"><div><div class="page-title">Ayarlar</div><div class="page-sub">Tüm veriler yalnızca bu cihazda saklanır.</div></div></div>

    <section class="card section">
      <div class="card-head"><div class="card-title">Veri</div></div>
      <div class="list">
        <div class="row"><div class="avatar" style="background:var(--surface-3);color:var(--text-2)">${icon('database')}</div>
          <div class="row-main"><div class="row-title">Kayıtlar</div><div class="row-sub">${c.patients} hasta · ${c.procedures} işlem · ${c.photos} fotoğraf · ${c.appointments} randevu</div></div></div>
        <button class="row" data-act="seed"><div class="avatar" style="background:var(--accent-soft);color:var(--accent-text)">${icon('sparkle')}</div>
          <div class="row-main"><div class="row-title">Örnek veri yükle</div><div class="row-sub">Uygulamayı tanımak için 6 örnek hasta, işlem ve yer tutucu fotoğraf ekler.</div></div>${icon('chevron', 'muted-3')}</button>
        <button class="row" data-act="clear"><div class="avatar" style="background:var(--danger-soft);color:var(--danger)">${icon('trash')}</div>
          <div class="row-main"><div class="row-title" style="color:var(--danger)">Tüm verileri sil</div><div class="row-sub">Hasta, işlem, fotoğraf ve randevular kalıcı olarak silinir.</div></div>${icon('chevron', 'muted-3')}</button>
      </div>
    </section>

    <section class="card section">
      <div class="card-head"><div class="card-title">Güvenlik ve yedekleme</div></div>
      <div class="list">
        <div class="row"><div class="avatar" style="background:var(--surface-3);color:var(--text-3)">${icon('lock')}</div>
          <div class="row-main"><div class="row-title muted">PIN kilidi</div><div class="row-sub">Sonraki aşamada eklenecek.</div></div></div>
        <div class="row"><div class="avatar" style="background:var(--surface-3);color:var(--text-3)">${icon('download')}</div>
          <div class="row-main"><div class="row-title muted">Yedek al / geri yükle</div><div class="row-sub">Sonraki aşamada eklenecek.</div></div></div>
      </div>
    </section>

    <p class="xs muted-3 section" style="text-align:center">Hasta Takip · sürüm ${APP_VERSION}</p>`;

  root.querySelector('[data-act=seed]').onclick = async (e) => {
    const ok = c.patients ? await confirmDialog({ title: 'Örnek veri eklensin mi?', message: 'Mevcut kayıtlar korunur, örnek hastalar eklenir.', okText: 'Ekle' }) : true;
    if (!ok) return;
    e.currentTarget.disabled = true;
    toast('Örnek veri yükleniyor…');
    await loadSampleData();
    toast('Örnek veri yüklendi', { kind: 'ok' });
    go('/');
  };
  root.querySelector('[data-act=clear]').onclick = async () => {
    const ok = await confirmDialog({ title: 'Tüm veriler silinsin mi?', message: `${c.patients} hasta, ${c.photos} fotoğraf ve tüm randevular kalıcı olarak silinecek. Bu işlem geri alınamaz.`, okText: 'Hepsini sil', danger: true });
    if (!ok) return;
    await clearAllData();
    toast('Tüm veriler silindi');
    render(root);
  };
}
