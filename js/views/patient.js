/* Hasta kartı — TASARIM.md §5 (hero, istatistik satırı, metin sekmeleri, bilgi listesi, fotoğraf ızgarası) */
import { Patients, Procedures, Photos, Appointments, fullName } from '../db.js';
import {
  esc, el, icon, fmtDate, fmtDateLong, fmtTime, fmtDayMonth, age, relDay, sinceProcedure,
  parseDate, daysBetween, phoneHref, sheet, confirmDialog, actionMenu, toast, statusText, emptyState,
} from '../ui.js';
import { blobURL, releaseURLs } from '../photos.js';
import {
  patientForm, procedureForm, appointmentForm, photoUploadForm, photoEditForm, regenerateControls, APPT_KIND_LABEL,
} from '../forms.js';
import { setTopbar, go, replacePath } from '../nav.js';

const TABS = [['genel', 'Genel'], ['islemler', 'İşlemler'], ['fotograflar', 'Fotoğraflar'], ['randevular', 'Randevular']];
const lower = (s) => String(s || '').toLocaleLowerCase('tr');

const DEFAULT_TAB = 'islemler';

export async function render(root, { id, tab = DEFAULT_TAB }) {
  const state = { id, tab: TABS.some(([k]) => k === tab) ? tab : DEFAULT_TAB, photoFilter: 'all', compare: false, selected: { before: null, after: null } };
  let data;

  async function load() {
    const [patient, procedures, photos, appointments] = await Promise.all([
      Patients.get(id), Procedures.byPatient(id), Photos.byPatient(id), Appointments.byPatient(id),
    ]);
    data = { patient, procedures, photos, appointments };
    data.procById = Object.fromEntries(procedures.map((p) => [p.id, p]));
  }
  async function refresh() { await load(); paint(); }

  await load();
  if (!data.patient) {
    setTopbar({ title: 'Hasta', back: '/' });
    root.classList.remove('has-hero');
    root.innerHTML = `<div class="screen">${emptyState({ title: 'Hasta bulunamadı', text: 'Kayıt silinmiş olabilir.', action: '<a class="btn btn-primary" href="#/">Hasta listesine dön</a>' })}</div>`;
    return;
  }

  /* ---------- Eylemler ---------- */
  async function editPatient() {
    const r = await patientForm(data.patient);
    if (r) { toast('Hasta bilgileri güncellendi'); refresh(); }
  }
  async function patientMenu() {
    const v = await actionMenu(fullName(data.patient), [
      { label: 'Bilgileri düzenle', icon: 'edit', value: 'edit' },
      { label: 'Fotoğraf ekle', icon: 'camera', value: 'photo' },
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
  async function addProcedure() {
    const r = await procedureForm({ patientId: id });
    if (!r) return;
    toast(r.createdControls.length ? `İşlem eklendi · ${r.createdControls.length} kontrol planlandı` : 'İşlem eklendi');
    setTab('islemler');
    refresh();
  }
  async function addAppointment(defaults = {}) {
    const r = await appointmentForm({ patientId: id, procedures: data.procedures, ...defaults });
    if (r) { toast('Randevu eklendi'); refresh(); }
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

  /* ---------- Türetilmiş ---------- */
  const startOfToday = () => { const d = new Date(); d.setHours(0, 0, 0, 0); return d; };
  const isOverdue = (a) => a.status === 'planned' && parseDate(a.date) < startOfToday();
  const controlsOf = (procId) => data.appointments.filter((a) => a.procedureId === procId && a.auto);
  function nextControl() {
    const planned = data.appointments.filter((a) => a.status === 'planned');
    const upcoming = planned.filter((a) => parseDate(a.date) >= startOfToday());
    if (upcoming.length) return upcoming[0];
    const overdue = planned.filter(isOverdue);
    return overdue.length ? overdue[overdue.length - 1] : null;
  }
  /** "7 gün", "bugün", "3 gün gecikti" */
  function daysLabel(a) {
    const n = daysBetween(new Date(), parseDate(a.date));
    if (n === 0) return 'bugün';
    if (n === 1) return 'yarın';
    if (n > 1) return `${n} gün`;
    return `${-n} gün gecikti`;
  }
  const phaseLabel = (ph) => (ph.phase === 'before' ? 'Öncesi' : 'Sonrası');
  const photoCaption = (ph, pr) => {
    const extra = pr && ph.phase === 'after' ? sinceProcedure(pr.date, parseDate(ph.date)) : (ph.tags || [])[0] || '';
    return [phaseLabel(ph), fmtDayMonth(ph.date), extra].filter(Boolean).join(' · ');
  };

  /* ---------- Çizim ---------- */
  function paint() {
    releaseURLs();
    const p = data.patient;
    const name = fullName(p);
    const a = age(p.birthDate);
    const genderLabel = p.gender === 'F' ? 'Kadın' : p.gender === 'M' ? 'Erkek' : '';
    const nc = nextControl();
    const lastProc = data.procedures[0];

    setTopbar({
      title: name, back: '/', center: true, anchor: '.hero-name', tone: 'inverse',
      actions: [{ icon: 'edit', label: 'Düzenle', onClick: editPatient }, { icon: 'more', label: 'Diğer', onClick: patientMenu }],
    });
    root.classList.add('has-hero');

    root.innerHTML = `
      <div class="screen">
      <section class="hero">
        <div class="hero-nav">
          <button class="btn-icon" type="button" data-act="back" aria-label="Geri">${icon('back')}</button>
          <span class="spacer"></span>
          <button class="btn-icon" type="button" data-act="edit" aria-label="Düzenle">${icon('edit')}</button>
          <button class="btn-icon" type="button" data-act="more" aria-label="Diğer">${icon('more')}</button>
        </div>
        <div class="hero-label">${lastProc ? `${esc(lastProc.type)} · ${esc(fmtDate(lastProc.date))}` : 'Henüz işlem yok'}</div>
        <h1 class="hero-name">${esc(name)}</h1>
        <div class="hero-meta">${[a !== null ? `${a} yaş` : null, genderLabel || null, p.bloodType ? esc(p.bloodType) : null, p.phone ? `<a href="${phoneHref(p.phone)}" class="num">${esc(p.phone)}</a>` : null].filter(Boolean).join(' · ') || '<span class="t-tertiary">Bilgi girilmedi</span>'}</div>
        <div class="hero-actions">
          <button class="btn btn-primary" type="button" data-act="add-proc">İşlem ekle</button>
          ${p.phone ? `<a class="btn-outline-icon" href="${phoneHref(p.phone)}" aria-label="Ara" title="Ara">${icon('phone')}</a>` : ''}
          <button class="btn-outline-icon" type="button" data-act="add-photo" aria-label="Fotoğraf ekle" title="Fotoğraf ekle">${icon('camera')}</button>
          <button class="btn-outline-icon" type="button" data-act="add-appt" aria-label="Randevu ekle" title="Randevu ekle">${icon('calendar')}</button>
        </div>
      </section>

      <div class="stats">
        <button class="stat" type="button" data-tab="islemler">
          <div class="stat-value num">${data.procedures.length}</div>
          <div class="stat-label">işlem</div>
        </button>
        <button class="stat" type="button" data-tab="fotograflar">
          <div class="stat-value num">${data.photos.length}</div>
          <div class="stat-label">fotoğraf</div>
        </button>
        <button class="stat end ${nc && isOverdue(nc) ? 'warn' : ''}" type="button" data-tab="randevular">
          <div class="stat-value">${nc ? esc(fmtDayMonth(nc.date)) : '—'}</div>
          <div class="stat-label">${nc ? `${esc(lower(nc.label))} · ${esc(daysLabel(nc))}` : 'Planlı kontrol yok'}</div>
        </button>
      </div>

      <div class="tabs sticky" role="tablist">
        ${TABS.map(([k, l]) => `<button class="tab-btn ${state.tab === k ? 'on' : ''}" type="button" role="tab" data-tab="${k}" aria-selected="${state.tab === k}">${l}</button>`).join('')}
      </div>
      <div id="tab-body"></div>
      </div>`;

    root.querySelector('[data-act=back]').onclick = () => go('/');
    root.querySelector('[data-act=edit]').onclick = editPatient;
    root.querySelector('[data-act=more]').onclick = patientMenu;
    root.querySelector('[data-act=add-proc]').onclick = addProcedure;
    root.querySelector('[data-act=add-photo]').onclick = () => addPhoto();
    root.querySelector('[data-act=add-appt]').onclick = () => addAppointment();
    root.querySelectorAll('[data-tab]').forEach((b) => { b.onclick = () => { setTab(b.dataset.tab); syncTabs(); paintTab(); }; });
    paintTab();
  }

  function syncTabs() {
    root.querySelectorAll('.tab-btn').forEach((b) => { const on = b.dataset.tab === state.tab; b.classList.toggle('on', on); b.setAttribute('aria-selected', on); });
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
    const row = (label, value, { empty = '—', block = false } = {}) => `
      <div class="info-row ${block ? 'block' : ''}"><div class="info-label">${esc(label)}</div><div class="info-value ${value ? '' : 'is-empty'}">${value || empty}</div></div>`;
    const overdue = data.appointments.filter(isOverdue);
    const upcoming = data.appointments.filter((x) => x.status === 'planned' && !isOverdue(x)).slice(0, 3);
    const recent = [...data.photos].sort((x, y) => (y.date || '').localeCompare(x.date || '')).slice(0, 2);

    body.innerHTML = `
      ${p.allergies ? `<div class="alert">Alerji · ${esc(p.allergies)}</div>` : ''}
      ${overdue.length ? `<div class="alert danger">${overdue.length} gecikmiş kontrol · ${esc(overdue.map((x) => `${lower(x.label)} (${fmtDayMonth(x.date)})`).join(', '))}</div>` : ''}
      <div class="info" style="margin-top:6px">
        ${row('Doğum tarihi', p.birthDate ? `${esc(fmtDate(p.birthDate))}${a !== null ? ` <span class="t-secondary">· ${a}</span>` : ''}` : '')}
        ${row('Kan grubu', esc(p.bloodType))}
        ${row('E-posta', p.email ? `<a href="mailto:${esc(p.email)}">${esc(p.email)}</a>` : '')}
        ${row('Yönlendiren', esc(p.referral))}
        ${row('Alerjiler', esc(p.allergies))}
        ${row('Kayıt', esc(fmtDate(p.createdAt)))}
        ${p.notes ? row('Notlar', esc(p.notes), { block: true }) : ''}
      </div>

      <section class="section">
        <div class="section-head">
          <div class="section-title">Son fotoğraflar</div>
          ${data.photos.length ? `<button class="section-link" type="button" data-tab-link="fotograflar">Tümü</button>` : ''}
        </div>
        ${recent.length
          ? `<div class="photo-grid">${recent.map((ph) => photoTile(ph, ph.procedureId ? data.procById[ph.procedureId] : null)).join('')}</div>`
          : emptyState({ title: 'Henüz fotoğraf yok', text: 'İlk öncesi fotoğrafını ekle.', action: `<button class="btn btn-secondary btn-sm" type="button" data-act="add-photo">Fotoğraf ekle</button>` })}
      </section>

      ${upcoming.length ? `
      <section class="section">
        <div class="section-head">
          <div class="section-title">Yaklaşan kontroller</div>
          <button class="section-link" type="button" data-tab-link="randevular">Tümü</button>
        </div>
        <div class="list">${upcoming.map(apptRow).join('')}</div>
      </section>` : ''}`;

    body.querySelectorAll('[data-tab-link]').forEach((b) => { b.onclick = () => { setTab(b.dataset.tabLink); syncTabs(); paintTab(); }; });
    body.querySelectorAll('[data-act=add-photo]').forEach((b) => { b.onclick = () => addPhoto(); });
    body.querySelectorAll('[data-photo]').forEach((t) => { t.onclick = () => openViewer(data.photos.find((x) => x.id === t.dataset.photo), recent); });
    bindApptRows(body);
  }

  /* ---------- İşlemler ---------- */
  function procedureRow(pr) {
    const controls = controlsOf(pr.id);
    const done = controls.filter((c) => c.status === 'done').length;
    const photos = data.photos.filter((x) => x.procedureId === pr.id).length;
    const line1 = [fmtDate(pr.date), pr.anesthesia ? `${pr.anesthesia} anestezi` : null].filter(Boolean).join(' · ');
    const line2 = [controls.length ? `${done}/${controls.length} kontrol` : null, photos ? `${photos} fotoğraf` : null].filter(Boolean).join(' · ');
    return `
      <button class="row" type="button" data-proc="${pr.id}">
        <div class="row-main">
          <div class="row-title">${esc(pr.type)}${pr.title ? ` <span class="t-secondary">· ${esc(pr.title)}</span>` : ''}</div>
          <div class="row-sub">${esc(line1)}</div>
          ${line2 ? `<div class="row-sub">${esc(line2)}</div>` : ''}
        </div>
        <div class="row-end">${icon('chevron')}</div>
      </button>`;
  }

  function paintProcedures(body) {
    body.innerHTML = data.procedures.length
      ? `<div class="list" style="margin-top:4px">${data.procedures.map(procedureRow).join('')}</div>`
      : emptyState({ title: 'Henüz işlem yok', text: 'İşlem eklendiğinde 1. gün, 1. hafta, 1. ay, 3. ay, 6. ay ve 1. yıl kontrolleri otomatik planlanır.', action: `<button class="btn btn-primary" type="button" data-act="add">İşlem ekle</button>` });
    body.querySelectorAll('[data-act=add]').forEach((b) => { b.onclick = addProcedure; });
    body.querySelectorAll('[data-proc]').forEach((b) => { b.onclick = () => openProcedure(b.dataset.proc); });
  }

  function openProcedure(procId) {
    const pr = data.procById[procId];
    if (!pr) return;
    const controls = controlsOf(pr.id);
    const others = data.appointments.filter((a) => a.procedureId === pr.id && !a.auto);
    const photos = data.photos.filter((x) => x.procedureId === pr.id);
    const done = controls.filter((c) => c.status === 'done').length;
    const info = (label, value) => `<div class="info-row"><div class="info-label">${esc(label)}</div><div class="info-value ${value ? '' : 'is-empty'}">${value || '—'}</div></div>`;
    const s = sheet({
      title: pr.type,
      size: 'md',
      footer: `<button class="btn btn-ghost" type="button" data-act="more">Diğer</button><span class="spacer"></span>
               <button class="btn btn-secondary" type="button" data-act="edit">Düzenle</button>
               <button class="btn btn-primary" type="button" data-act="photo">Fotoğraf ekle</button>`,
      content: `
        <div class="info">
          ${info('Tarih', esc(fmtDateLong(pr.date)))}
          ${info('Geçen süre', esc(sinceProcedure(pr.date)))}
          ${info('Anestezi', esc(pr.anesthesia))}
          ${info('Teknik', esc(pr.title))}
          ${info('Fotoğraf', photos.length ? `${photos.length} · ${photos.filter((x) => x.phase === 'before').length} öncesi, ${photos.filter((x) => x.phase === 'after').length} sonrası` : '')}
          ${pr.notes ? `<div class="info-row block"><div class="info-label">Ameliyat notu</div><div class="info-value">${esc(pr.notes)}</div></div>` : ''}
        </div>
        <section class="section">
          <div class="section-head">
            <div class="section-title">Kontrol takvimi</div>
            ${controls.length ? `<span class="t-caption">${done}/${controls.length} yapıldı</span>` : ''}
          </div>
          ${controls.length ? `<div class="list">${controls.map(apptRow).join('')}</div>`
            : `<div class="empty" style="padding:8px 0 4px"><div class="empty-text">Bu işlem için kontrol takvimi yok.</div><button class="btn btn-secondary btn-sm" type="button" data-act="regen">Kontrol takvimi oluştur</button></div>`}
        </section>
        ${others.length ? `<section class="section"><div class="section-head"><div class="section-title">Diğer randevular</div></div><div class="list">${others.map(apptRow).join('')}</div></section>` : ''}`,
    });
    bindApptRows(s.body, () => s.close());
    s.el.querySelector('[data-act=edit]').onclick = async () => {
      s.close();
      const r = await procedureForm({ patientId: id, existing: pr });
      if (r) { toast('İşlem güncellendi'); refresh(); }
    };
    s.el.querySelector('[data-act=photo]').onclick = () => { s.close(); addPhoto({ defaultProcedureId: pr.id, defaultPhase: daysBetween(parseDate(pr.date), new Date()) > 0 ? 'after' : 'before' }); };
    const regen = s.body.querySelector('[data-act=regen]');
    if (regen) regen.onclick = async () => { s.close(); await regenerateControls(pr); toast('Kontrol takvimi oluşturuldu'); refresh(); };
    s.el.querySelector('[data-act=more]').onclick = async () => {
      s.close();
      const v = await actionMenu(pr.type, [
        { label: 'Kontrol takvimini yeniden oluştur', icon: 'calendar', value: 'regen' },
        { label: 'İşlemi sil', icon: 'trash', value: 'delete', danger: true },
      ]);
      if (v === 'regen') {
        const ok = await confirmDialog({ title: 'Kontroller yeniden oluşturulsun mu?', message: 'Bu işleme bağlı otomatik kontroller silinip işlem tarihine göre yeniden planlanır. Durum bilgileri kaybolur.', okText: 'Yeniden oluştur' });
        if (ok) { await regenerateControls(pr); toast('Kontrol takvimi yenilendi'); refresh(); }
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
    const pr = a.procedureId ? data.procById[a.procedureId] : null;
    const sub = [fmtDayMonth(a.date), fmtTime(a.date), APPT_KIND_LABEL[a.kind] || a.kind, pr ? pr.type : null, pr && a.auto ? sinceProcedure(pr.date, d) : null, a.notes || null].filter(Boolean).join(' · ');
    return `
      <button class="row ${a.status === 'done' || a.status === 'cancelled' ? 'muted' : ''}" type="button" data-appt="${a.id}">
        <div class="row-main">
          <div class="row-title">${esc(a.label)}</div>
          <div class="row-sub">${esc(sub)}</div>
        </div>
        <div class="row-end">${statusText(a.status, { overdue, today })}</div>
      </button>`;
  }
  function bindApptRows(scope, before) {
    scope.querySelectorAll('[data-appt]').forEach((b) => { b.onclick = () => { before?.(); openAppointment(b.dataset.appt); }; });
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
    if (pr) items.push({ label: `İşlemi aç · ${pr.type}`, icon: 'activity', value: 'proc' });
    items.push({ label: 'Randevuyu sil', icon: 'trash', value: 'delete', danger: true });
    const v = await actionMenu(title, items);
    if (!v) return;
    if (['done', 'missed', 'planned'].includes(v)) {
      await Appointments.save({ ...a, status: v });
      toast({ done: 'Yapıldı olarak işaretlendi', missed: 'Gelmedi olarak işaretlendi', planned: 'Planlıya alındı' }[v]);
      refresh();
    } else if (v === 'edit') {
      const r = await appointmentForm({ patientId: id, procedures: data.procedures, existing: a });
      if (r) { toast('Randevu güncellendi'); refresh(); }
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
    const group = (label, list) => list.length ? `<section class="section"><div class="section-label">${label}</div><div class="list">${list.map(apptRow).join('')}</div></section>` : '';
    body.innerHTML = data.appointments.length
      ? `${group('Gecikmiş', overdue)}${group('Yaklaşan', upcoming)}${group('Geçmiş', past)}
         <div class="action-bar"><button class="btn btn-secondary btn-block" type="button" data-act="add">Randevu ekle</button></div>`
      : emptyState({ title: 'Randevu yok', text: 'İşlem eklediğinde kontrol takvimi otomatik oluşur. Serbest randevu da ekleyebilirsin.', action: `<button class="btn btn-primary" type="button" data-act="add">Randevu ekle</button>` });
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
  const sortGroup = (list) => [...list].sort((a, b) => (a.phase === b.phase ? (a.date || '').localeCompare(b.date || '') : a.phase === 'before' ? -1 : 1));

  function photoTile(ph, pr) {
    const sel = state.selected.before?.id === ph.id || state.selected.after?.id === ph.id;
    return `
      <button class="photo ${state.compare ? 'selectable' : ''} ${sel ? 'selected' : ''}" type="button" data-photo="${ph.id}" aria-label="${esc(photoCaption(ph, pr))}">
        <div class="photo-frame">
          <img src="${blobURL(ph.id + ':t', ph.thumb || ph.blob)}" alt="" loading="lazy" decoding="async">
          ${state.compare ? `<span class="photo-check">${sel ? icon('check') : ''}</span>` : ''}
        </div>
        <div class="photo-caption">${esc(photoCaption(ph, pr))}</div>
      </button>`;
  }

  function paintPhotos(body) {
    const photos = filteredPhotos();
    const tags = [...new Set(data.photos.flatMap((x) => x.tags || []))].sort((a, b) => a.localeCompare(b, 'tr'));
    const byProc = new Map();
    photos.forEach((ph) => {
      const key = ph.procedureId && data.procById[ph.procedureId] ? ph.procedureId : '_';
      if (!byProc.has(key)) byProc.set(key, []);
      byProc.get(key).push(ph);
    });
    const groups = [];
    data.procedures.forEach((pr) => { if (byProc.has(pr.id)) groups.push({ pr, list: byProc.get(pr.id) }); });
    if (byProc.has('_')) groups.push({ pr: null, list: byProc.get('_') });
    const hasPair = data.photos.some((x) => x.phase === 'before') && data.photos.some((x) => x.phase === 'after');

    if (!data.photos.length) {
      body.innerHTML = emptyState({ title: 'Henüz fotoğraf yok', text: 'İlk öncesi fotoğrafını ekle.', action: `<button class="btn btn-primary" type="button" data-act="add">Fotoğraf ekle</button>` });
      body.querySelector('[data-act=add]').onclick = () => addPhoto({ defaultPhase: 'before' });
      return;
    }

    body.innerHTML = `
      <div class="chips" style="margin-top:16px">
        ${[['all', 'Tümü'], ['before', 'Öncesi'], ['after', 'Sonrası'], ...tags.map((t) => [t, t])].map(([v, l]) =>
          `<button class="chip ${state.photoFilter === v ? 'on' : ''}" type="button" data-filter="${esc(v)}">${esc(l)}</button>`).join('')}
      </div>
      ${state.compare ? `<div class="compare-hint" id="compare-hint"></div>` : ''}
      ${photos.length ? groups.map(({ pr, list }) => `
        <div class="photo-group">
          <div class="photo-group-head">
            <div class="photo-group-title">${pr ? esc(pr.type) : 'İşleme bağlı olmayan'}</div>
            <div class="photo-group-sub">${pr ? `${esc(fmtDate(pr.date))} · ` : ''}${list.length} fotoğraf</div>
          </div>
          <div class="photo-grid">${sortGroup(list).map((ph) => photoTile(ph, pr)).join('')}</div>
        </div>`).join('')
        : emptyState({ title: 'Bu filtreye uyan fotoğraf yok' })}
      <div class="action-bar sticky">
        ${state.compare
          ? `<button class="btn btn-ghost" type="button" data-act="compare-cancel">Vazgeç</button>
             <button class="btn btn-primary" type="button" data-act="compare-go" disabled>Göster</button>`
          : `<button class="btn btn-primary" type="button" data-act="compare" ${hasPair ? '' : 'disabled'}>Karşılaştır</button>
             <button class="btn-outline-icon" type="button" data-act="add" aria-label="Fotoğraf ekle">${icon('plus')}</button>`}
      </div>`;

    body.querySelectorAll('[data-act=add]').forEach((b) => { b.onclick = () => addPhoto({ defaultPhase: data.photos.some((x) => x.phase === 'before') ? 'after' : 'before' }); });
    body.querySelectorAll('[data-filter]').forEach((b) => { b.onclick = () => { state.photoFilter = b.dataset.filter; paintTab(); }; });
    const cmp = body.querySelector('[data-act=compare]');
    if (cmp) cmp.onclick = () => { state.compare = true; presetCompare(); paintTab(); };
    body.querySelectorAll('[data-photo]').forEach((t) => {
      t.onclick = () => {
        const ph = data.photos.find((x) => x.id === t.dataset.photo);
        if (state.compare) { toggleSelect(ph); updateCompareBar(body); }
        else openViewer(ph, groups.flatMap((g) => sortGroup(g.list)));
      };
    });
    if (state.compare) {
      updateCompareBar(body);
      body.querySelector('[data-act=compare-cancel]').onclick = () => { state.compare = false; paintTab(); };
      body.querySelector('[data-act=compare-go]').onclick = () => openCompare();
    }
  }

  function presetCompare() {
    const pr = data.procedures.find((p) => data.photos.some((x) => x.procedureId === p.id && x.phase === 'before') && data.photos.some((x) => x.procedureId === p.id && x.phase === 'after'));
    const pool = pr ? data.photos.filter((x) => x.procedureId === pr.id) : data.photos;
    const befores = pool.filter((x) => x.phase === 'before').sort((a, b) => (a.date || '').localeCompare(b.date || ''));
    const afters = pool.filter((x) => x.phase === 'after').sort((a, b) => (b.date || '').localeCompare(a.date || ''));
    let b = befores[0], a = afters[0];
    for (const x of befores) {
      const match = afters.find((y) => (y.tags || []).some((t) => (x.tags || []).includes(t)));
      if (match) { b = x; a = match; break; }
    }
    state.selected = { before: b || null, after: a || null };
  }
  function toggleSelect(ph) {
    state.selected[ph.phase] = state.selected[ph.phase]?.id === ph.id ? null : ph;
    root.querySelectorAll('[data-photo]').forEach((t) => {
      const on = state.selected.before?.id === t.dataset.photo || state.selected.after?.id === t.dataset.photo;
      t.classList.toggle('selected', on);
      const chk = t.querySelector('.photo-check');
      if (chk) chk.innerHTML = on ? icon('check') : '';
    });
  }
  function updateCompareBar(body) {
    const { before, after } = state.selected;
    const hint = body.querySelector('#compare-hint');
    if (hint) hint.textContent = `${before ? `Öncesi · ${fmtDayMonth(before.date)}` : 'Bir öncesi seç'} · ${after ? `Sonrası · ${fmtDayMonth(after.date)}` : 'bir sonrası seç'}`;
    const go = body.querySelector('[data-act=compare-go]');
    if (go) go.disabled = !(before && after);
  }

  /* ---------- Görüntüleyici ---------- */
  function openViewer(photo, list) {
    let idx = Math.max(0, list.findIndex((x) => x.id === photo.id));
    const v = el(`
      <div class="viewer" role="dialog" aria-modal="true" aria-label="Fotoğraf">
        <div class="viewer-head">
          <button class="btn-icon" type="button" data-act="close" aria-label="Kapat">${icon('x')}</button>
          <div class="viewer-title"></div>
          <button class="btn-icon" type="button" data-act="edit" aria-label="Düzenle">${icon('edit')}</button>
          <button class="btn-icon" type="button" data-act="delete" aria-label="Sil">${icon('trash')}</button>
        </div>
        <div class="viewer-stage">
          <img alt="">
          ${list.length > 1 ? `<button class="viewer-nav prev" type="button" data-act="prev" aria-label="Önceki">${icon('left')}</button><button class="viewer-nav next" type="button" data-act="next" aria-label="Sonraki">${icon('right')}</button>` : ''}
        </div>
        <div class="viewer-foot">
          <div class="viewer-meta"></div>
          <div class="viewer-sub"></div>
        </div>
      </div>`);
    const img = v.querySelector('img');
    const show = () => {
      const ph = list[idx];
      const pr = ph.procedureId ? data.procById[ph.procedureId] : null;
      img.src = blobURL(ph.id, ph.blob);
      v.querySelector('.viewer-title').textContent = `${idx + 1} / ${list.length}`;
      v.querySelector('.viewer-meta').textContent = `${phaseLabel(ph)} · ${fmtDateLong(ph.date)}`;
      v.querySelector('.viewer-sub').textContent = [pr ? pr.type : null, pr ? sinceProcedure(pr.date, parseDate(ph.date)) : null, ...(ph.tags || [])].filter(Boolean).join(' · ') || 'Etiket yok';
    };
    const close = () => { document.removeEventListener('keydown', onKey); v.remove(); };
    const prev = () => { idx = (idx - 1 + list.length) % list.length; show(); };
    const next = () => { idx = (idx + 1) % list.length; show(); };
    const onKey = (e) => { if (e.key === 'Escape') close(); if (e.key === 'ArrowLeft') prev(); if (e.key === 'ArrowRight') next(); };
    v.querySelector('[data-act=close]').onclick = close;
    v.querySelector('[data-act=prev]')?.addEventListener('click', prev);
    v.querySelector('[data-act=next]')?.addEventListener('click', next);
    v.querySelector('[data-act=edit]').onclick = async () => {
      const ph = list[idx];
      const r = await photoEditForm(ph, data.procedures);
      if (r) { list[idx] = r; await load(); paint(); show(); toast('Fotoğraf güncellendi'); }
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
          <button class="btn-icon" type="button" data-act="close" aria-label="Kapat">${icon('x')}</button>
          <div class="viewer-title">${esc(fullName(data.patient))}${pr ? ` · ${esc(pr.type)}` : ''}</div>
          <button class="btn-icon" type="button" data-act="swap" aria-label="Yer değiştir">${icon('swap')}</button>
        </div>
        <div class="compare" style="padding-bottom:calc(16px + var(--safe-b))">
          <div class="compare-pane">
            <div class="compare-label"><b>Öncesi</b>${esc(fmtDate(before.date))}</div>
            <div class="frame"><img src="${blobURL(before.id, before.blob)}" alt="Öncesi"></div>
          </div>
          <div class="compare-pane">
            <div class="compare-label"><b>Sonrası</b>${esc(fmtDate(after.date))}${pr ? ` · ${esc(sinceProcedure(pr.date, parseDate(after.date)))}` : ''}</div>
            <div class="frame"><img src="${blobURL(after.id, after.blob)}" alt="Sonrası"></div>
          </div>
        </div>
      </div>`);
    // Kapatınca seçim modu biter, galeri normal hâline döner
    const close = () => { document.removeEventListener('keydown', onKey); v.remove(); state.compare = false; paintTab(); };
    const onKey = (e) => { if (e.key === 'Escape') close(); };
    v.querySelector('[data-act=close]').onclick = close;
    v.querySelector('[data-act=swap]').onclick = () => { const c = v.querySelector('.compare'); c.appendChild(c.firstElementChild); };
    document.addEventListener('keydown', onKey);
    document.getElementById('layer').appendChild(v);
  }

  paint();
  return () => { releaseURLs(); root.classList.remove('has-hero'); };
}
