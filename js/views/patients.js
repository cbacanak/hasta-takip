/* Hasta listesi */
import { Patients, Procedures, Appointments, fullName, counts } from '../db.js';
import { esc, icon, initials, fmtDate, fmtDayMonth, relDay, parseDate, emptyState, toast, age } from '../ui.js';
import { patientForm } from '../forms.js';
import { setTopbar, go } from '../nav.js';

let lastQuery = '';

export async function render(root) {
  setTopbar({ title: 'Hastalar', actions: [{ icon: 'plus', label: 'Yeni hasta', onClick: addPatient, primary: true }] });

  async function addPatient() {
    const p = await patientForm();
    if (p) { toast('Hasta eklendi', { kind: 'ok' }); go(`/patient/${p.id}`); }
  }

  const [patients, procedures, appointments] = await Promise.all([Patients.all(), Procedures.all(), Appointments.all()]);
  patients.sort((a, b) => `${a.lastName} ${a.firstName}`.localeCompare(`${b.lastName} ${b.firstName}`, 'tr'));
  const lastProc = {};
  procedures.forEach((pr) => { if (!lastProc[pr.patientId] || pr.date > lastProc[pr.patientId].date) lastProc[pr.patientId] = pr; });
  const today = new Date(); today.setHours(0, 0, 0, 0);
  const nextAppt = {};
  appointments.filter((a) => a.status === 'planned').sort((a, b) => a.date.localeCompare(b.date)).forEach((a) => {
    const d = parseDate(a.date);
    if (!nextAppt[a.patientId] && d >= today) nextAppt[a.patientId] = a;
  });

  root.innerHTML = `
    <div class="page-head">
      <div><div class="page-title">Hastalar</div><div class="page-sub">${patients.length} kayıt</div></div>
    </div>
    <div class="search">${icon('search')}<input type="search" placeholder="Ad, soyad veya telefon ara" value="${esc(lastQuery)}" autocomplete="off"></div>
    <div id="list" class="section"></div>`;

  const input = root.querySelector('input');
  const list = root.querySelector('#list');

  function paint() {
    const q = lastQuery.toLocaleLowerCase('tr').trim();
    const rows = q ? patients.filter((p) => `${fullName(p)} ${p.phone || ''}`.toLocaleLowerCase('tr').includes(q)) : patients;
    if (!patients.length) {
      list.innerHTML = emptyState({
        icon: 'users', title: 'Henüz hasta kaydı yok', text: 'İlk hasta kartını oluşturarak başlayın.',
        action: `<button class="btn btn-primary" data-act="add">${icon('plus')}Yeni hasta</button>`,
      });
      list.querySelector('[data-act=add]').onclick = addPatient;
      return;
    }
    if (!rows.length) { list.innerHTML = emptyState({ icon: 'search', title: 'Sonuç yok', text: `"${lastQuery}" ile eşleşen hasta bulunamadı.` }); return; }

    // Harfe göre grupla
    const groups = new Map();
    rows.forEach((p) => {
      const k = (p.lastName || p.firstName || '#')[0].toLocaleUpperCase('tr');
      if (!groups.has(k)) groups.set(k, []);
      groups.get(k).push(p);
    });
    list.innerHTML = [...groups.entries()].map(([k, ps]) => `
      <div class="day-group">
        <div class="day-label">${esc(k)}</div>
        <div class="card"><div class="list">${ps.map((p) => {
          const lp = lastProc[p.id];
          const na = nextAppt[p.id];
          const a = age(p.birthDate);
          return `
            <a class="row" href="#/patient/${p.id}">
              <div class="avatar ${p.gender === 'F' ? 'f' : p.gender === 'M' ? 'm' : ''}">${esc(initials(fullName(p)))}</div>
              <div class="row-main">
                <div class="row-title">${esc(p.lastName)}, ${esc(p.firstName)}${a !== null ? ` <span class="muted-3" style="font-weight:400">· ${a}</span>` : ''}</div>
                <div class="row-sub">${lp ? `${esc(lp.type)} · ${esc(fmtDate(lp.date))}` : (p.phone ? esc(p.phone) : 'İşlem kaydı yok')}</div>
              </div>
              <div class="row-end">
                ${na ? `<span class="pill ${relDay(na.date) === 'Bugün' ? 'pill-accent' : ''}">${icon('calendar')}${esc(fmtDayMonth(na.date))}</span>` : ''}
                ${icon('chevron')}
              </div>
            </a>`;
        }).join('')}</div></div>
      </div>`).join('');
  }

  input.addEventListener('input', () => { lastQuery = input.value; paint(); });
  paint();
}
