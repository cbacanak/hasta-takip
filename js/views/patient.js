/* Hasta detay ekranı */
import { Patients, Procedures, Photos, Appointments, fullName } from '../db.js';
import {
  esc, el, icon, initials, fmtDate, fmtDateLong, fmtTime, fmtDayMonth, weekdayShort, age, relDay, sinceProcedure,
  parseDate, daysBetween, phoneHref, sheet, confirmDialog, actionMenu, toast, statusPill, emptyState, segmented, bindSegmented,
} from '../ui.js';
import { blobURL, releaseURLs } from '../photos.js';
import {
  patientForm, procedureForm, appointmentForm, photoUploadForm, photoEditForm, regenerateControls, APPT_KIND_LABEL,
} from '../forms.js';
import { setTopbar, go, replacePath } from '../nav.js';

const TABS = [['genel', 'Genel'], ['islemler', 'İşlemler'], ['fotograflar', 'Fotoğraflar'], ['randevular', 'Randevular']];

export async function render(root, { id, tab = 'genel' }) {
  const state = { id, tab: TABS.some(([k]) => k === tab) ? tab : 'genel', photoFilter: 'all', compare: false, selected: { before: null, after: null } };
  let data;

  async function load() {
    const [patient, procedures, photos, appointments] = await Promise.all([
      Patients.get(id), Procedures.byPatient(id), Photos.byPatient(id), Appointments.byPatient(id),
    ]);
    data = { patient, procedures, photos, appointments };
    data.procById = Object.fromEntries(procedures.map((p) => [p.id, p]));
  }

  async function refresh() {
    await load();
    paint();
  }

  await load();
  if (!data.patient) {
    setTopbar({ title: 'Hasta', back: '/' });
    root.innerHTML = emptyState({ icon: 'alert', title: 'Hasta bulunamadı', text: 'Kayıt silinmiş olabilir.', action: '<a class="btn btn-outline" href="#/">Hasta listesine dön</a>' });
    return;
  }

  /* ---------- Üst çubuk ---------- */
  function topbar() {
    setTopbar({
      title: fullName(data.patient), back: '/', center: true, anchor: '.profile-name',
      actions: [
        { icon: 'edit', label: 'Düzenle', onClick: editPatient },
        { icon: 'more', label: 'Diğer', onClick: patientMenu },
      ],
    });
  }

  async function editPatient() {
    const r = await patientForm(data.patient);
    if (r) { toast('Hasta bilgileri güncellendi', { kind: 'ok' }); refresh(); }
  }

  async function patientMenu() {
    const v = await actionMenu(fullName(data.patient), [
      { label: 'Düzenle', icon: 'edit', value: 'edit' },
      { label: 'Fotoğraf ekle', icon: 'image', value: 'photo' },
      { label: 'Randevu ekle', icon: 'calendar', value: 'appt' },
      { label: 'Hastayı sil', icon: 'trash', value: 'delete', danger: true },
    ]);
    if (v === 'edit') editPatient();
    if (v === 'photo') addPhoto();
    if (v === 'appt') addAppointment();
    if (v === 'delete') deletePatient();
  }

  async function deletePatient() {
    const ok = await confirmDialog({
      title: 'Hasta silinsin mi?',
      message: `${fullName(data.patient)} ile birlikte ${data.procedures.length} işlem, ${data.photos.length} fotoğraf ve ${data.appointments.length} randevu kalıcı olarak silinecek.`,
      okText: 'Sil', danger: true,
    });
    if (!ok) return;
    await Patients.removeCascade(id);
    toast('Hasta silindi');
    go('/');
  }

  /* ---------- Eylemler ---------- */
  async function addProcedure() {
    const r = await procedureForm({ patientId: id });
    if (!r) return;
    toast(r.createdControls.length ? `İşlem eklendi · ${r.createdControls.length} kontrol planlandı` : 'İşlem eklendi', { kind: 'ok' });
    setTab('islemler');
    refresh();
  }

  async function addAppointment(defaults = {}) {
    const r = await appointmentForm({ patientId: id, procedures: data.procedures, ...defaults });
    if (r) { toast('Randevu eklendi', { kind: 'ok' }); refresh(); }
  }

  async function addPhoto(defaults = {}) {
    const r = await photoUploadForm({ patientId: id, procedures: data.procedures, defaultProcedureId: data.procedures[0]?.id || '', ...defaults });
    if (r && r.length) { setTab('fotograflar'); refresh(); }
  }

  function setTab(t) {
    state.tab = t;
    state.compare = false;
    replacePath(`/patient/${id}/${t}`);
  }

  /* ---------- Türetilmiş veriler ---------- */
  function nextControl() {
    const now = new Date();
    const planned = data.appointments.filter((a) => a.status === 'planned');
    const upcoming = planned.filter((a) => parseDate(a.date) >= startOfToday());
    if (upcoming.length) return upcoming[0];
    const overdue = planned.filter((a) => parseDate(a.date) < startOfToday());
    return overdue.length ? overdue[overdue.length - 1] : null;
  }
  function startOfToday() { const d = new Date(); d.setHours(0, 0, 0, 0); return d; }
  function controlsOf(procId) {
    return data.appointments.filter((a) => a.procedureId === procId && a.auto);
  }
  function isOverdue(a) { return a.status === 'planned' && parseDate(a.date) < startOfToday(); }

  /* ---------- Çizim ---------- */
  function paint() {
    releaseURLs();
    topbar();
    const p = data.patient;
    const a = age(p.birthDate);
    const genderLabel = p.gender === 'F' ? 'Kadın' : p.gender === 'M' ? 'Erkek' : '';
    const nc = nextControl();
    const lastProc = data.procedures[0];

    root.innerHTML = `
      <section class="profile">
        <div class="avatar lg ${p.gender === 'F' ? 'f' : p.gender === 'M' ? 'm' : ''}">${esc(initials(fullName(p)))}</div>
        <div class="profile-main">
          <h1 class="profile-name">${esc(fullName(p))}</h1>
          <div class="profile-meta">
            ${[a !== null ? `${a} yaş` : null, genderLabel || null, p.bloodType ? esc(p.bloodType) : null, p.birthDate ? esc(fmtDate(p.birthDate)) : null]
              .filter(Boolean).map((t, i) => `<span class="${i ? 'dot' : ''}">${t}</span>`).join('')}
          </div>
          ${p.phone ? `<a class="profile-phone mono" href="${phoneHref(p.phone)}">${icon('phone')}${esc(p.phone)}</a>` : ''}
        </div>
        <div class="profile-actions">
          ${p.phone ? `<a class="btn btn-outline btn-sm" href="${phoneHref(p.phone)}">${icon('phone')}Ara</a>` : ''}
          <button class="btn btn-outline btn-sm" data-act="add-photo">${icon('image')}Fotoğraf ekle</button>
          <button class="btn btn-outline btn-sm" data-act="add-appt">${icon('calendar')}Randevu ekle</button>
          <button class="btn btn-primary btn-sm" data-act="add-proc">${icon('plus')}İşlem ekle</button>
        </div>
      </section>

      <section class="stats">
        <button class="stat" data-tab="islemler">
          <div class="stat-label">İşlem</div>
          <div class="stat-value">${data.procedures.length}</div>
          <div class="stat-sub">${lastProc ? `Son: ${esc(lastProc.type)}` : 'Henüz yok'}</div>
        </button>
        <button class="stat" data-tab="fotograflar">
          <div class="stat-label">Fotoğraf</div>
          <div class="stat-value">${data.photos.length}</div>
          <div class="stat-sub">${data.photos.filter((x) => x.phase === 'before').length} öncesi · ${data.photos.filter((x) => x.phase === 'after').length} sonrası</div>
        </button>
        <button class="stat ${nc ? 'highlight' : ''}" data-tab="randevular">
          <div class="stat-label">${nc && isOverdue(nc) ? 'Gecikmiş' : 'Sonraki'}</div>
          <div class="stat-value sm">${nc ? esc(fmtDayMonth(nc.date)) : '—'}</div>
          <div class="stat-sub">${nc ? `${esc(nc.label)} · ${esc(relDay(nc.date))}` : 'Planlı randevu yok'}</div>
        </button>
      </section>

      <div class="seg-tabs">
        ${segmented({ name: 'tab', value: state.tab, cls: '', options: TABS.map(([k, l]) => [k, `${l}<span class="count">${countFor(k)}</span>`]) })}
      </div>
      <div id="tab-body"></div>`;

    root.querySelector('[data-act=add-photo]').onclick = () => addPhoto();
    root.querySelector('[data-act=add-appt]').onclick = () => addAppointment();
    root.querySelector('[data-act=add-proc]').onclick = addProcedure;
    root.querySelectorAll('[data-tab]').forEach((b) => { b.onclick = () => { setTab(b.dataset.tab); paintTab(); syncSeg(); }; });
    bindSegmented(root.querySelector('.seg'), (v) => { setTab(v); paintTab(); });
    paintTab();
  }

  function syncSeg() {
    root.querySelectorAll('.seg-btn').forEach((b) => {
      const on = b.dataset.value === state.tab;
      b.classList.toggle('on', on); b.setAttribute('aria-selected', on);
    });
  }

  function countFor(k) {
    if (k === 'islemler') return data.procedures.length;
    if (k === 'fotograflar') return data.photos.length;
    if (k === 'randevular') return data.appointments.filter((x) => x.status === 'planned').length;
    return '';
  }

  function paintTab() {
    const body = root.querySelector('#tab-body');
    body.innerHTML = '';
    ({ genel: paintGeneral, islemler: paintProcedures, fotograflar: paintPhotos, randevular: paintAppointments })[state.tab](body);
  }

  /* ---------- Genel ---------- */
  function paintGeneral(body) {
    const p = data.patient;
    const a = age(p.birthDate);
    const kv = (label, value, ic, opts = {}) => `
      <div class="kv-item ${opts.wide ? 'wide' : ''}">
        <div class="kv-label">${ic ? icon(ic) : ''}${esc(label)}</div>
        <div class="kv-value ${value ? '' : 'empty'} ${opts.cls || ''}">${value || 'Belirtilmedi'}</div>
      </div>`;
    const upcoming = data.appointments.filter((x) => x.status === 'planned').filter((x) => !isOverdue(x)).slice(0, 3);
    const overdue = data.appointments.filter(isOverdue);

    body.innerHTML = `
      ${p.allergies ? `<div class="alert-box section">${icon('alert')}<div><b>Alerji:</b> ${esc(p.allergies)}</div></div>` : ''}
      ${overdue.length ? `<div class="alert-box section" style="background:var(--danger-soft);color:var(--danger)">${icon('clock')}<div><b>${overdue.length} gecikmiş randevu.</b> ${esc(overdue.map((x) => `${x.label} (${fmtDate(x.date)})`).join(', '))}</div></div>` : ''}

      <section class="card section">
        <div class="card-head"><div class="card-title">Kişisel bilgiler</div><button class="btn btn-ghost btn-sm" data-act="edit">${icon('edit')}Düzenle</button></div>
        <div class="card-pad" style="padding-top:8px">
          <div class="kv">
            ${kv('Telefon', p.phone ? `<a href="${phoneHref(p.phone)}" class="mono">${esc(p.phone)}</a>` : '', 'phone')}
            ${kv('Doğum tarihi', p.birthDate ? `${esc(fmtDate(p.birthDate))}${a !== null ? ` <span class="muted-3">· ${a} yaş</span>` : ''}` : '', 'cake')}
            ${kv('Cinsiyet', p.gender === 'F' ? 'Kadın' : p.gender === 'M' ? 'Erkek' : '', 'user')}
            ${kv('E-posta', p.email ? `<a href="mailto:${esc(p.email)}">${esc(p.email)}</a>` : '', 'mail', { cls: 'break' })}
            ${kv('Kan grubu', esc(p.bloodType), 'droplet')}
            ${kv('Yönlendiren', esc(p.referral), 'users')}
            ${kv('Alerjiler', p.allergies ? `<span style="color:var(--warn)">${esc(p.allergies)}</span>` : 'Bilinen alerji yok', 'alert')}
            ${kv('Kayıt', esc(fmtDate(p.createdAt)), 'calendar')}
          </div>
        </div>
      </section>

      <section class="card section">
        <div class="card-head"><div class="card-title">Notlar</div><button class="btn btn-ghost btn-sm" data-act="edit">${icon('edit')}Düzenle</button></div>
        <div class="card-pad" style="padding-top:6px">
          ${p.notes ? `<div class="note-box">${esc(p.notes)}</div>` : `<p class="muted small">Not eklenmemiş.</p>`}
        </div>
      </section>

      <section class="section">
        <div class="section-head">
          <div class="section-title">Yaklaşan randevular</div>
          <button class="btn btn-ghost btn-sm" data-tab-link="randevular">Tümü ${icon('chevron')}</button>
        </div>
        <div class="card">
          ${upcoming.length ? `<div class="list">${upcoming.map(apptRow).join('')}</div>`
            : `<div class="empty" style="padding:22px"><div class="empty-title">Planlı randevu yok</div><div class="empty-text">İşlem eklediğinizde kontrol takvimi otomatik oluşur.</div></div>`}
        </div>
      </section>

      ${data.procedures.length ? `
      <section class="section">
        <div class="section-head">
          <div class="section-title">Son işlem</div>
          <button class="btn btn-ghost btn-sm" data-tab-link="islemler">Tümü ${icon('chevron')}</button>
        </div>
        <div class="card">${procedureCard(data.procedures[0], { compact: true })}</div>
      </section>` : ''}`;

    body.querySelectorAll('[data-act=edit]').forEach((b) => { b.onclick = editPatient; });
    body.querySelectorAll('[data-tab-link]').forEach((b) => { b.onclick = () => { setTab(b.dataset.tabLink); paintTab(); syncSeg(); }; });
    bindApptRows(body);
    bindProcedureCards(body);
  }

  /* ---------- İşlemler ---------- */
  function procedureCard(pr, { compact = false } = {}) {
    const controls = controlsOf(pr.id);
    const done = controls.filter((c) => c.status === 'done').length;
    const photos = data.photos.filter((x) => x.procedureId === pr.id).length;
    const next = controls.find((c) => c.status === 'planned');
    return `
      <button class="tl-card ${compact ? '' : 'card'}" data-proc="${pr.id}">
        <div class="tl-top">
          <div>
            <div class="tl-title">${esc(pr.type)}</div>
            <div class="tl-date">${esc(fmtDate(pr.date))} · ${esc(relDay(pr.date))}${pr.anesthesia ? ` · ${esc(pr.anesthesia)}` : ''}</div>
          </div>
          ${icon('chevron', 'muted-3')}
        </div>
        ${pr.title ? `<div class="tl-notes" style="margin-top:6px;color:var(--text)">${esc(pr.title)}</div>` : ''}
        ${!compact && pr.notes ? `<div class="tl-notes">${esc(pr.notes.length > 160 ? pr.notes.slice(0, 160) + '…' : pr.notes)}</div>` : ''}
        <div class="tl-foot">
          ${controls.length ? `<div class="progress" title="${done}/${controls.length} kontrol yapıldı"><i style="width:${Math.round(done / controls.length * 100)}%"></i></div>
            <span class="xs muted">${done}/${controls.length} kontrol</span>` : '<span class="xs muted-3">Kontrol takvimi yok</span>'}
          <span class="pill">${icon('image')}${photos}</span>
          ${next ? `<span class="pill pill-accent">${esc(next.label.replace(' Kontrolü', ''))} · ${esc(fmtDayMonth(next.date))}</span>` : ''}
        </div>
      </button>`;
  }

  function paintProcedures(body) {
    body.innerHTML = `
      <div class="section-head section">
        <div class="section-title">İşlem geçmişi<span class="count">${data.procedures.length}</span></div>
        <button class="btn btn-primary btn-sm" data-act="add">${icon('plus')}İşlem ekle</button>
      </div>
      ${data.procedures.length
        ? `<div class="timeline">${data.procedures.map((pr) => `<div class="tl-item">${procedureCard(pr)}</div>`).join('')}</div>`
        : emptyState({ icon: 'activity', title: 'Henüz işlem kaydı yok', text: 'İşlem eklendiğinde 1. gün, 1. hafta, 1. ay, 3. ay, 6. ay ve 1. yıl kontrolleri otomatik planlanır.', action: `<button class="btn btn-primary" data-act="add">${icon('plus')}İlk işlemi ekle</button>` })}`;
    body.querySelectorAll('[data-act=add]').forEach((b) => { b.onclick = addProcedure; });
    bindProcedureCards(body);
  }

  function bindProcedureCards(scope) {
    scope.querySelectorAll('[data-proc]').forEach((b) => { b.onclick = () => openProcedure(b.dataset.proc); });
  }

  function openProcedure(procId) {
    const pr = data.procById[procId];
    if (!pr) return;
    const controls = controlsOf(pr.id);
    const others = data.appointments.filter((a) => a.procedureId === pr.id && !a.auto);
    const photos = data.photos.filter((x) => x.procedureId === pr.id);
    const s = sheet({
      title: pr.type,
      size: 'md',
      footer: `<button class="btn btn-ghost" data-act="more">${icon('more')}Diğer</button><span class="spacer"></span>
               <button class="btn btn-outline" data-act="edit">${icon('edit')}Düzenle</button>
               <button class="btn btn-primary" data-act="photo">${icon('image')}Fotoğraf ekle</button>`,
      content: `
        <div class="stack">
          <div class="kv">
            <div class="kv-item"><div class="kv-label">Tarih</div><div class="kv-value">${esc(fmtDateLong(pr.date))}</div></div>
            <div class="kv-item"><div class="kv-label">Geçen süre</div><div class="kv-value">${esc(sinceProcedure(pr.date))}</div></div>
            <div class="kv-item"><div class="kv-label">Anestezi</div><div class="kv-value ${pr.anesthesia ? '' : 'empty'}">${esc(pr.anesthesia) || 'Belirtilmedi'}</div></div>
            ${pr.title ? `<div class="kv-item wide"><div class="kv-label">Teknik / açıklama</div><div class="kv-value">${esc(pr.title)}</div></div>` : ''}
          </div>
          <div>
            <div class="kv-label" style="margin-bottom:6px">Ameliyat notu</div>
            ${pr.notes ? `<div class="note-box">${esc(pr.notes)}</div>` : '<p class="muted small">Not yok.</p>'}
          </div>
          <div>
            <div class="section-head" style="margin-bottom:6px">
              <div class="kv-label">Kontrol takvimi</div>
              ${controls.length ? `<span class="xs muted">${controls.filter((c) => c.status === 'done').length}/${controls.length} yapıldı</span>` : ''}
            </div>
            <div class="card">
              ${controls.length ? `<div class="list">${controls.map(apptRow).join('')}</div>`
                : `<div class="empty" style="padding:18px"><div class="empty-text">Bu işlem için kontrol takvimi yok.</div><button class="btn btn-soft btn-sm" data-act="regen">Kontrol takvimi oluştur</button></div>`}
            </div>
          </div>
          ${others.length ? `<div><div class="kv-label" style="margin-bottom:6px">Diğer randevular</div><div class="card"><div class="list">${others.map(apptRow).join('')}</div></div></div>` : ''}
          <div class="inline small muted">${icon('image', 'ic-sm')}${photos.length} fotoğraf · ${photos.filter((x) => x.phase === 'before').length} öncesi, ${photos.filter((x) => x.phase === 'after').length} sonrası</div>
        </div>`,
    });
    bindApptRows(s.body, () => { s.close(); });
    s.el.querySelector('[data-act=edit]').onclick = async () => {
      s.close();
      const r = await procedureForm({ patientId: id, existing: pr });
      if (r) { toast('İşlem güncellendi', { kind: 'ok' }); refresh(); }
    };
    s.el.querySelector('[data-act=photo]').onclick = () => { s.close(); addPhoto({ defaultProcedureId: pr.id, defaultPhase: daysBetween(parseDate(pr.date), new Date()) > 0 ? 'after' : 'before' }); };
    const regen = s.body.querySelector('[data-act=regen]');
    if (regen) regen.onclick = async () => { s.close(); await regenerateControls(pr); toast('Kontrol takvimi oluşturuldu', { kind: 'ok' }); refresh(); };
    s.el.querySelector('[data-act=more]').onclick = async () => {
      s.close();
      const v = await actionMenu(pr.type, [
        { label: 'Kontrol takvimini yeniden oluştur', icon: 'calendar', value: 'regen' },
        { label: 'İşlemi sil', icon: 'trash', value: 'delete', danger: true },
      ]);
      if (v === 'regen') {
        const ok = await confirmDialog({ title: 'Kontroller yeniden oluşturulsun mu?', message: 'Bu işleme bağlı otomatik kontroller silinip işlem tarihine göre yeniden planlanır. Durum bilgileri kaybolur.', okText: 'Yeniden oluştur' });
        if (ok) { await regenerateControls(pr); toast('Kontrol takvimi yenilendi', { kind: 'ok' }); refresh(); }
      }
      if (v === 'delete') {
        const ok = await confirmDialog({ title: 'İşlem silinsin mi?', message: `${pr.type} kaydı ve ${controls.length} otomatik kontrol randevusu silinecek. Fotoğraflar korunur.`, okText: 'Sil', danger: true });
        if (ok) { await Procedures.removeCascade(pr.id); toast('İşlem silindi'); refresh(); }
      }
    };
  }

  /* ---------- Randevular ---------- */
  function apptRow(a) {
    const d = parseDate(a.date);
    const today = daysBetween(new Date(), d) === 0;
    const overdue = isOverdue(a);
    const past = d < startOfToday();
    const pr = a.procedureId ? data.procById[a.procedureId] : null;
    const sub = [fmtTime(a.date), APPT_KIND_LABEL[a.kind] || a.kind, pr ? pr.type : null, pr && a.auto ? sinceProcedure(pr.date, d) : null].filter(Boolean).join(' · ');
    return `
      <button class="appt ${a.status === 'done' ? 'done' : ''} ${overdue ? 'overdue' : ''}" data-appt="${a.id}">
        <div class="appt-date ${today ? 'today' : ''} ${past && !overdue ? 'past' : ''}">
          <div class="d">${d.getDate()}</div>
          <div class="m">${esc(d.toLocaleDateString('tr-TR', { month: 'short' }))}</div>
        </div>
        <div class="appt-main">
          <div class="appt-title">${esc(a.label)}</div>
          <div class="appt-sub">${esc(sub)}${a.notes ? ` · ${esc(a.notes)}` : ''}</div>
        </div>
        ${overdue ? '<span class="pill pill-warn">Gecikti</span>' : today && a.status === 'planned' ? '<span class="pill pill-accent">Bugün</span>' : statusPill(a.status)}
      </button>`;
  }

  function bindApptRows(scope, before) {
    scope.querySelectorAll('[data-appt]').forEach((b) => {
      b.onclick = () => { before?.(); openAppointment(b.dataset.appt); };
    });
  }

  async function openAppointment(apptId) {
    const a = data.appointments.find((x) => x.id === apptId);
    if (!a) return;
    const pr = a.procedureId ? data.procById[a.procedureId] : null;
    const title = `${a.label} · ${fmtDate(a.date)} ${fmtTime(a.date)}`;
    const items = [];
    if (a.status !== 'done') items.push({ label: 'Yapıldı olarak işaretle', icon: 'check', value: 'done' });
    if (a.status !== 'missed') items.push({ label: 'Gelmedi', icon: 'alert', value: 'missed' });
    if (a.status !== 'planned') items.push({ label: 'Planlıya al', icon: 'clock', value: 'planned' });
    items.push({ label: 'Düzenle / tarihi değiştir', icon: 'edit', value: 'edit' });
    if (pr) items.push({ label: `İşlemi aç: ${pr.type}`, icon: 'activity', value: 'proc' });
    items.push({ label: 'Randevuyu sil', icon: 'trash', value: 'delete', danger: true });
    const v = await actionMenu(title, items);
    if (!v) return;
    if (['done', 'missed', 'planned'].includes(v)) {
      await Appointments.save({ ...a, status: v });
      toast({ done: 'Yapıldı olarak işaretlendi', missed: 'Gelmedi olarak işaretlendi', planned: 'Planlıya alındı' }[v], { kind: 'ok' });
      refresh();
    } else if (v === 'edit') {
      const r = await appointmentForm({ patientId: id, procedures: data.procedures, existing: a });
      if (r) { toast('Randevu güncellendi', { kind: 'ok' }); refresh(); }
    } else if (v === 'proc') {
      openProcedure(pr.id);
    } else if (v === 'delete') {
      const ok = await confirmDialog({ title: 'Randevu silinsin mi?', message: title, okText: 'Sil', danger: true });
      if (ok) { await Appointments.remove(a.id); toast('Randevu silindi'); refresh(); }
    }
  }

  function paintAppointments(body) {
    const overdue = data.appointments.filter(isOverdue);
    const upcoming = data.appointments.filter((a) => a.status === 'planned' && !isOverdue(a));
    const past = data.appointments.filter((a) => a.status !== 'planned').sort((x, y) => y.date.localeCompare(x.date));
    const group = (title, list, cls = '') => list.length ? `
      <div class="day-group">
        <div class="day-label" ${cls ? `style="color:${cls}"` : ''}>${title} · ${list.length}</div>
        <div class="card"><div class="list">${list.map(apptRow).join('')}</div></div>
      </div>` : '';
    body.innerHTML = `
      <div class="section-head section">
        <div class="section-title">Randevular</div>
        <button class="btn btn-primary btn-sm" data-act="add">${icon('plus')}Randevu ekle</button>
      </div>
      ${data.appointments.length ? `
        ${group('Gecikmiş', overdue, 'var(--warn)')}
        ${group('Yaklaşan', upcoming)}
        ${group('Geçmiş', past)}`
        : emptyState({ icon: 'calendar', title: 'Randevu yok', text: 'İşlem eklediğinizde kontrol takvimi otomatik oluşur. Serbest randevu da ekleyebilirsiniz.', action: `<button class="btn btn-primary" data-act="add">${icon('plus')}Randevu ekle</button>` })}`;
    body.querySelectorAll('[data-act=add]').forEach((b) => { b.onclick = () => addAppointment(); });
    bindApptRows(body);
  }

  /* ---------- Fotoğraflar ---------- */
  function filteredPhotos() {
    const f = state.photoFilter;
    if (f === 'all') return data.photos;
    if (f === 'before' || f === 'after') return data.photos.filter((x) => x.phase === f);
    return data.photos.filter((x) => (x.tags || []).includes(f));
  }

  function paintPhotos(body) {
    const photos = filteredPhotos();
    const tags = [...new Set(data.photos.flatMap((x) => x.tags || []))].sort((a, b) => a.localeCompare(b, 'tr'));
    const groups = [];
    const byProc = new Map();
    photos.forEach((ph) => {
      const key = ph.procedureId && data.procById[ph.procedureId] ? ph.procedureId : '_';
      if (!byProc.has(key)) byProc.set(key, []);
      byProc.get(key).push(ph);
    });
    data.procedures.forEach((pr) => { if (byProc.has(pr.id)) groups.push({ pr, list: byProc.get(pr.id) }); });
    if (byProc.has('_')) groups.push({ pr: null, list: byProc.get('_') });
    const sortGroup = (list) => [...list].sort((a, b) => (a.phase === b.phase ? (a.date || '').localeCompare(b.date || '') : a.phase === 'before' ? -1 : 1));

    const hasPair = data.photos.some((x) => x.phase === 'before') && data.photos.some((x) => x.phase === 'after');
    body.innerHTML = `
      <div class="section-head section">
        <div class="section-title">Fotoğraflar<span class="count">${photos.length}</span></div>
        <div class="inline">
          ${hasPair ? `<button class="btn ${state.compare ? 'btn-soft' : 'btn-outline'} btn-sm" data-act="compare">${icon('compare')}Karşılaştır</button>` : ''}
          <button class="btn btn-primary btn-sm" data-act="add">${icon('plus')}Ekle</button>
        </div>
      </div>
      ${data.photos.length ? `
      <div class="chips" style="margin-bottom:12px">
        ${[['all', 'Tümü'], ['before', 'Öncesi'], ['after', 'Sonrası'], ...tags.map((t) => [t, t])].map(([v, l]) =>
          `<button class="chip ${state.photoFilter === v ? 'on' : ''}" data-filter="${esc(v)}">${esc(l)}</button>`).join('')}
      </div>` : ''}
      ${photos.length ? groups.map(({ pr, list }) => `
        <div class="photo-group">
          <div class="photo-group-head">
            <div class="photo-group-title">${pr ? esc(pr.type) : 'İşleme bağlı olmayan'}</div>
            <div class="photo-group-sub">${pr ? esc(fmtDate(pr.date)) : ''} · ${list.length} fotoğraf</div>
          </div>
          <div class="photo-grid">${sortGroup(list).map((ph) => photoTile(ph, pr)).join('')}</div>
        </div>`).join('')
        : emptyState({ icon: 'image', title: data.photos.length ? 'Bu filtreye uyan fotoğraf yok' : 'Henüz fotoğraf yok', text: data.photos.length ? '' : 'Galeriden seçilen fotoğraflar küçültülerek cihazda saklanır.', action: data.photos.length ? '' : `<button class="btn btn-primary" data-act="add">${icon('plus')}Fotoğraf ekle</button>` })}
      ${state.compare ? `
        <div class="compare-bar" id="compare-bar">
          <div class="info"></div>
          <button class="btn btn-ghost btn-sm" data-act="compare-cancel">Vazgeç</button>
          <button class="btn btn-primary btn-sm" data-act="compare-go" disabled>${icon('compare')}Göster</button>
        </div>` : ''}`;

    body.querySelectorAll('[data-act=add]').forEach((b) => { b.onclick = () => addPhoto({ defaultPhase: data.photos.some((x) => x.phase === 'before') ? 'after' : 'before' }); });
    body.querySelectorAll('[data-filter]').forEach((b) => { b.onclick = () => { state.photoFilter = b.dataset.filter; paintTab(); }; });
    const cmp = body.querySelector('[data-act=compare]');
    if (cmp) cmp.onclick = () => { state.compare = !state.compare; if (state.compare) presetCompare(); paintTab(); };
    body.querySelectorAll('[data-photo]').forEach((t) => {
      t.onclick = () => {
        const ph = data.photos.find((x) => x.id === t.dataset.photo);
        if (state.compare) { toggleSelect(ph); updateCompareBar(body); }
        else openViewer(ph, sortedVisible(groups, sortGroup));
      };
    });
    if (state.compare) {
      updateCompareBar(body);
      body.querySelector('[data-act=compare-cancel]').onclick = () => { state.compare = false; paintTab(); };
      body.querySelector('[data-act=compare-go]').onclick = () => openCompare();
    }
  }

  function sortedVisible(groups, sortGroup) {
    return groups.flatMap((g) => sortGroup(g.list));
  }

  function photoTile(ph, pr) {
    const sel = state.selected.before?.id === ph.id || state.selected.after?.id === ph.id;
    return `
      <button class="photo ${state.compare ? 'selectable' : ''} ${sel ? 'selected' : ''}" data-photo="${ph.id}" aria-label="${ph.phase === 'before' ? 'Öncesi' : 'Sonrası'} ${esc(fmtDate(ph.date))}">
        <img src="${blobURL(ph.id + ':t', ph.thumb || ph.blob)}" alt="" loading="lazy" decoding="async">
        <span class="photo-badge ${ph.phase}">${ph.phase === 'before' ? 'ÖNCESİ' : 'SONRASI'}</span>
        ${state.compare ? `<span class="photo-check">${sel ? icon('check') : ''}</span>` : ''}
        <span class="photo-date">${esc(fmtDayMonth(ph.date))} · ${pr && ph.phase === 'after' ? esc(sinceProcedure(pr.date, parseDate(ph.date))) : esc((ph.tags || [])[0] || '')}</span>
      </button>`;
  }

  function presetCompare() {
    const pr = data.procedures.find((p) => data.photos.some((x) => x.procedureId === p.id && x.phase === 'before') && data.photos.some((x) => x.procedureId === p.id && x.phase === 'after'));
    const pool = pr ? data.photos.filter((x) => x.procedureId === pr.id) : data.photos;
    const befores = pool.filter((x) => x.phase === 'before').sort((a, b) => (a.date || '').localeCompare(b.date || ''));
    const afters = pool.filter((x) => x.phase === 'after').sort((a, b) => (b.date || '').localeCompare(a.date || ''));
    // Aynı etiketli çifti tercih et
    let b = befores[0], a = afters[0];
    for (const x of befores) {
      const match = afters.find((y) => (y.tags || []).some((t) => (x.tags || []).includes(t)));
      if (match) { b = x; a = match; break; }
    }
    state.selected = { before: b || null, after: a || null };
  }

  function toggleSelect(ph) {
    const key = ph.phase;
    state.selected[key] = state.selected[key]?.id === ph.id ? null : ph;
    root.querySelectorAll('[data-photo]').forEach((t) => {
      const id2 = t.dataset.photo;
      const on = state.selected.before?.id === id2 || state.selected.after?.id === id2;
      t.classList.toggle('selected', on);
      const chk = t.querySelector('.photo-check');
      if (chk) chk.innerHTML = on ? icon('check') : '';
    });
  }

  function updateCompareBar(body) {
    const bar = body.querySelector('#compare-bar');
    if (!bar) return;
    const { before, after } = state.selected;
    bar.querySelector('.info').innerHTML = `<b>Karşılaştırma</b>${before ? `Öncesi: ${esc(fmtDayMonth(before.date))}` : '<span style="color:#fbbf24">Bir öncesi seçin</span>'} · ${after ? `Sonrası: ${esc(fmtDayMonth(after.date))}` : '<span style="color:#fbbf24">bir sonrası seçin</span>'}`;
    bar.querySelector('[data-act=compare-go]').disabled = !(before && after);
  }

  /* ---------- Görüntüleyici ---------- */
  function openViewer(photo, list) {
    let idx = Math.max(0, list.findIndex((x) => x.id === photo.id));
    const v = el(`
      <div class="viewer" role="dialog" aria-modal="true" aria-label="Fotoğraf">
        <div class="viewer-head">
          <button class="btn-icon" data-act="close" aria-label="Kapat">${icon('x')}</button>
          <div class="viewer-title"></div>
          <button class="btn-icon" data-act="edit" aria-label="Düzenle">${icon('edit')}</button>
          <button class="btn-icon" data-act="delete" aria-label="Sil">${icon('trash')}</button>
        </div>
        <div class="viewer-stage">
          <img alt="">
          ${list.length > 1 ? `<button class="viewer-nav prev" data-act="prev" aria-label="Önceki">${icon('left')}</button><button class="viewer-nav next" data-act="next" aria-label="Sonraki">${icon('right')}</button>` : ''}
        </div>
        <div class="viewer-foot">
          <div class="viewer-meta"></div>
          <div class="viewer-tags"></div>
        </div>
      </div>`);
    const img = v.querySelector('img');
    const show = () => {
      const ph = list[idx];
      const pr = ph.procedureId ? data.procById[ph.procedureId] : null;
      img.src = blobURL(ph.id, ph.blob);
      v.querySelector('.viewer-title').textContent = `${idx + 1} / ${list.length}`;
      v.querySelector('.viewer-meta').innerHTML = `
        <span class="pill ${ph.phase === 'before' ? 'pill-before' : 'pill-after'}">${ph.phase === 'before' ? 'Öncesi' : 'Sonrası'}</span>
        <span>${esc(fmtDateLong(ph.date))}</span>
        ${pr ? `<span>· ${esc(pr.type)} · ${esc(sinceProcedure(pr.date, parseDate(ph.date)))}</span>` : ''}
        ${ph.width ? `<span class="muted-3">· ${ph.width}×${ph.height}</span>` : ''}`;
      v.querySelector('.viewer-tags').innerHTML = (ph.tags || []).map((t) => `<span class="chip sm">${icon('tag')}${esc(t)}</span>`).join('') || '<span class="xs" style="color:#94a3b8">Etiket yok</span>';
    };
    const close = () => { document.removeEventListener('keydown', onKey); v.remove(); };
    const onKey = (e) => {
      if (e.key === 'Escape') close();
      if (e.key === 'ArrowLeft') prev();
      if (e.key === 'ArrowRight') next();
    };
    const prev = () => { idx = (idx - 1 + list.length) % list.length; show(); };
    const next = () => { idx = (idx + 1) % list.length; show(); };
    v.querySelector('[data-act=close]').onclick = close;
    v.querySelector('[data-act=prev]')?.addEventListener('click', prev);
    v.querySelector('[data-act=next]')?.addEventListener('click', next);
    v.querySelector('[data-act=edit]').onclick = async () => {
      const ph = list[idx];
      const r = await photoEditForm(ph, data.procedures);
      // Arkadaki sayfa (galeri, sayaçlar) da yeniden çizilir; paint() blob URL'lerini serbest bıraktığı için show() ondan sonra
      if (r) { list[idx] = r; await load(); paint(); show(); toast('Fotoğraf güncellendi', { kind: 'ok' }); }
    };
    v.querySelector('[data-act=delete]').onclick = async () => {
      const ph = list[idx];
      const ok = await confirmDialog({ title: 'Fotoğraf silinsin mi?', message: 'Bu işlem geri alınamaz.', okText: 'Sil', danger: true });
      if (!ok) return;
      await Photos.remove(ph.id);
      list.splice(idx, 1);
      toast('Fotoğraf silindi');
      if (!list.length) { close(); refresh(); return; }
      idx = Math.min(idx, list.length - 1);
      await load(); paint(); show();
    };
    // Dokunmatik kaydırma
    let sx = null;
    v.querySelector('.viewer-stage').addEventListener('touchstart', (e) => { sx = e.touches[0].clientX; }, { passive: true });
    v.querySelector('.viewer-stage').addEventListener('touchend', (e) => {
      if (sx === null) return;
      const dx = e.changedTouches[0].clientX - sx; sx = null;
      if (Math.abs(dx) > 50 && list.length > 1) (dx < 0 ? next : prev)();
    });
    document.addEventListener('keydown', onKey);
    document.getElementById('layer').appendChild(v);
    show();
  }

  function openCompare() {
    const { before, after } = state.selected;
    if (!before || !after) return;
    const pr = (after.procedureId && data.procById[after.procedureId]) || (before.procedureId && data.procById[before.procedureId]) || null;
    const v = el(`
      <div class="viewer" role="dialog" aria-modal="true" aria-label="Karşılaştırma">
        <div class="viewer-head">
          <button class="btn-icon" data-act="close" aria-label="Kapat">${icon('x')}</button>
          <div class="viewer-title">${esc(fullName(data.patient))}${pr ? ` · ${esc(pr.type)}` : ''}</div>
          <button class="btn-icon" data-act="swap" aria-label="Yer değiştir" title="Yer değiştir">${icon('compare')}</button>
        </div>
        <div class="compare" style="padding-bottom:calc(12px + var(--safe-b))">
          <div class="compare-pane">
            <div class="compare-label"><b>Öncesi</b><span>${esc(fmtDate(before.date))}</span></div>
            <div class="frame"><img src="${blobURL(before.id, before.blob)}" alt="Öncesi"></div>
          </div>
          <div class="compare-pane">
            <div class="compare-label"><b>Sonrası</b><span>${esc(fmtDate(after.date))}${pr ? ` · ${esc(sinceProcedure(pr.date, parseDate(after.date)))}` : ''}</span></div>
            <div class="frame"><img src="${blobURL(after.id, after.blob)}" alt="Sonrası"></div>
          </div>
        </div>
      </div>`);
    const close = () => { document.removeEventListener('keydown', onKey); v.remove(); };
    const onKey = (e) => { if (e.key === 'Escape') close(); };
    v.querySelector('[data-act=close]').onclick = close;
    v.querySelector('[data-act=swap]').onclick = () => {
      const c = v.querySelector('.compare');
      c.appendChild(c.firstElementChild);
    };
    document.addEventListener('keydown', onKey);
    document.getElementById('layer').appendChild(v);
  }

  paint();
  return () => releaseURLs();
}
