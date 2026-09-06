/* Hasta listesi — TASARIM.md §5 (Display başlık + dolu (+), arama, yaklaşan kontrol kartı, hairline liste) */
import { Patients, Procedures, Appointments, fullName } from '../db.js';
import { esc, icon, initials, fmtDate, fmtDayMonth, parseDate, daysBetween, emptyState, toast, age } from '../ui.js';
import { patientForm } from '../forms.js';
import { setTopbar, go } from '../nav.js';

let lastQuery = '';
const UPCOMING_DAYS = 30;

export async function render(root) {
  setTopbar({ title: 'Hastalar' });

  async function addPatient() {
    const p = await patientForm();
    if (p) { toast('Hasta eklendi'); go(`/patient/${p.id}`); }
  }

  const [patients, procedures, appointments] = await Promise.all([Patients.all(), Procedures.all(), Appointments.all()]);
  patients.sort((a, b) => `${a.lastName} ${a.firstName}`.localeCompare(`${b.lastName} ${b.firstName}`, 'tr'));
  const pById = Object.fromEntries(patients.map((p) => [p.id, p]));
  const prById = Object.fromEntries(procedures.map((p) => [p.id, p]));
  const lastProc = {};
  procedures.forEach((pr) => { if (!lastProc[pr.patientId] || pr.date > lastProc[pr.patientId].date) lastProc[pr.patientId] = pr; });
  const today = new Date(); today.setHours(0, 0, 0, 0);
  const horizon = new Date(today); horizon.setDate(horizon.getDate() + UPCOMING_DAYS);
  const upcoming = appointments
    .filter((a) => a.status === 'planned' && pById[a.patientId])
    .filter((a) => { const d = parseDate(a.date); return d >= today && d <= horizon; })
    .sort((a, b) => a.date.localeCompare(b.date));

  const daysLabel = (a) => { const n = daysBetween(today, parseDate(a.date)); return n === 0 ? 'bugün' : n === 1 ? 'yarın' : `${n} gün`; };
  const lower = (s) => String(s || '').toLocaleLowerCase('tr');

  root.innerHTML = `
    <div class="screen">
    <div class="page-head">
      <div>
        <h1 class="page-title">Hastalar</h1>
        <div class="page-sub">${patients.length} kayıt${upcoming.length ? ` · ${upcoming.length} yaklaşan kontrol` : ''}</div>
      </div>
      <button class="btn-fill-icon" type="button" data-act="add" aria-label="Yeni hasta">${icon('plus')}</button>
    </div>
    <div class="search">${icon('search')}<input type="search" placeholder="Ad, soyad veya telefon" value="${esc(lastQuery)}" autocomplete="off" aria-label="Hasta ara"></div>
    <div id="list"></div>
    </div>`;

  root.querySelector('[data-act=add]').onclick = addPatient;
  const input = root.querySelector('input');
  const list = root.querySelector('#list');

  function upcomingCard(a) {
    const p = pById[a.patientId];
    const pr = a.procedureId ? prById[a.procedureId] : null;
    return `
      <button class="upcoming-card" type="button" data-open="${p.id}">
        <div>
          <div class="name">${esc(fullName(p))}</div>
          <div class="sub">${[pr ? pr.type : null, lower(a.label)].filter(Boolean).map(esc).join(' · ')}</div>
        </div>
        <div>
          <div class="date">${esc(fmtDayMonth(a.date))}</div>
          <div class="rel">${esc(daysLabel(a))}</div>
        </div>
      </button>`;
  }

  function patientRow(p) {
    const lp = lastProc[p.id];
    const a = age(p.birthDate);
    const sub = [a !== null ? String(a) : null, lp ? `${lp.type} · ${fmtDayMonth(lp.date)}` : 'Henüz işlem yok'].filter(Boolean).join(' · ');
    return `
      <a class="row" href="#/patient/${p.id}">
        <div class="avatar">${esc(initials(fullName(p)))}</div>
        <div class="row-main">
          <div class="row-title">${esc(fullName(p))}</div>
          <div class="row-sub">${esc(sub)}</div>
        </div>
        <div class="row-end">${icon('chevron')}</div>
      </a>`;
  }

  function paint() {
    const q = lastQuery.toLocaleLowerCase('tr').trim();
    const rows = q ? patients.filter((p) => `${fullName(p)} ${p.phone || ''}`.toLocaleLowerCase('tr').includes(q)) : patients;
    if (!patients.length) {
      list.innerHTML = emptyState({ title: 'Henüz hasta yok', text: 'İlk hasta kartını oluşturarak başla.', action: `<button class="btn btn-primary" type="button" data-act="add">Yeni hasta</button>` });
      list.querySelector('[data-act=add]').onclick = addPatient;
      return;
    }
    if (!rows.length) { list.innerHTML = emptyState({ title: 'Sonuç yok', text: `"${lastQuery}" ile eşleşen hasta bulunamadı.` }); return; }
    list.innerHTML = `
      ${!q && upcoming.length ? `
      <section class="section">
        <div class="section-label">Yaklaşan kontrol</div>
        ${upcoming.slice(0, 2).map(upcomingCard).join('')}
      </section>` : ''}
      <section class="section">
        <div class="section-label">${q ? `${rows.length} sonuç` : 'Tüm hastalar'}</div>
        <div class="list">${rows.map(patientRow).join('')}</div>
      </section>`;
    list.querySelectorAll('[data-open]').forEach((b) => { b.onclick = () => go(`/patient/${b.dataset.open}`); });
  }

  input.addEventListener('input', () => { lastQuery = input.value; paint(); });
  paint();
}
