/* Ajanda: gecikmiş + yaklaşan randevular, güne göre gruplu */
import { Appointments, Patients, Procedures, fullName } from '../db.js';
import { esc, icon, initials, fmtTime, fmtDateLong, weekdayShort, parseDate, daysBetween, relDay, statusPill, emptyState, toast, actionMenu, confirmDialog } from '../ui.js';
import { APPT_KIND_LABEL, appointmentForm } from '../forms.js';
import { setTopbar, go } from '../nav.js';

export async function render(root) {
  setTopbar({ title: 'Ajanda' });
  const [appointments, patients, procedures] = await Promise.all([Appointments.allSorted(), Patients.all(), Procedures.all()]);
  const pById = Object.fromEntries(patients.map((p) => [p.id, p]));
  const prById = Object.fromEntries(procedures.map((p) => [p.id, p]));
  const today = new Date(); today.setHours(0, 0, 0, 0);
  const horizon = new Date(today); horizon.setDate(horizon.getDate() + 60);

  const overdue = appointments.filter((a) => a.status === 'planned' && parseDate(a.date) < today);
  const upcoming = appointments.filter((a) => parseDate(a.date) >= today && parseDate(a.date) <= horizon && a.status !== 'cancelled');
  const later = appointments.filter((a) => parseDate(a.date) > horizon && a.status === 'planned');

  const byDay = new Map();
  upcoming.forEach((a) => { const k = a.date.slice(0, 10); if (!byDay.has(k)) byDay.set(k, []); byDay.get(k).push(a); });

  const row = (a) => {
    const p = pById[a.patientId];
    const pr = a.procedureId ? prById[a.procedureId] : null;
    return `
      <button class="appt" data-appt="${a.id}">
        <div class="avatar" style="width:38px;height:38px;font-size:13px">${esc(initials(p ? fullName(p) : '?'))}</div>
        <div class="appt-main">
          <div class="appt-title">${esc(p ? fullName(p) : 'Silinmiş hasta')} <span class="muted" style="font-weight:500">· ${esc(a.label)}</span></div>
          <div class="appt-sub">${esc(fmtTime(a.date))} · ${esc(APPT_KIND_LABEL[a.kind] || a.kind)}${pr ? ` · ${esc(pr.type)}` : ''}${a.notes ? ` · ${esc(a.notes)}` : ''}</div>
        </div>
        ${a.status === 'planned' && parseDate(a.date) < today ? '<span class="pill pill-warn">Gecikti</span>' : statusPill(a.status)}
      </button>`;
  };

  root.innerHTML = `
    <div class="page-head">
      <div><div class="page-title">Ajanda</div><div class="page-sub">${esc(fmtDateLong(new Date()))}</div></div>
    </div>
    ${overdue.length ? `
      <div class="day-group"><div class="day-label" style="color:var(--warn)">Gecikmiş · ${overdue.length}</div>
      <div class="card"><div class="list">${overdue.map(row).join('')}</div></div></div>` : ''}
    ${byDay.size ? [...byDay.entries()].map(([k, list]) => {
      const n = daysBetween(today, parseDate(k));
      const title = n === 0 ? 'Bugün' : n === 1 ? 'Yarın' : `${weekdayShort(k)} · ${fmtDateLong(k).replace(/^[^ ]+ /, '')}`;
      return `<div class="day-group"><div class="day-label" ${n === 0 ? 'style="color:var(--accent)"' : ''}>${esc(title)} · ${list.length}</div>
        <div class="card"><div class="list">${list.map(row).join('')}</div></div></div>`;
    }).join('') : (overdue.length ? '' : emptyState({ icon: 'calendar', title: 'Önümüzdeki 60 günde randevu yok', text: 'İşlem eklendiğinde kontrol takvimi buraya düşer.' }))}
    ${later.length ? `<p class="small muted-3 section" style="text-align:center">60 günden sonra ${later.length} planlı randevu daha var.</p>` : ''}`;

  root.querySelectorAll('[data-appt]').forEach((b) => {
    b.onclick = async () => {
      const a = appointments.find((x) => x.id === b.dataset.appt);
      const p = pById[a.patientId];
      const items = [{ label: 'Hasta kartını aç', icon: 'user', value: 'open' }];
      if (a.status !== 'done') items.push({ label: 'Yapıldı olarak işaretle', icon: 'check', value: 'done' });
      if (a.status !== 'missed') items.push({ label: 'Gelmedi', icon: 'alert', value: 'missed' });
      if (a.status !== 'planned') items.push({ label: 'Planlıya al', icon: 'clock', value: 'planned' });
      items.push({ label: 'Düzenle', icon: 'edit', value: 'edit' });
      items.push({ label: 'Sil', icon: 'trash', value: 'delete', danger: true });
      const v = await actionMenu(`${p ? fullName(p) : ''} · ${a.label}`, items);
      if (v === 'open') go(`/patient/${a.patientId}/randevular`);
      else if (['done', 'missed', 'planned'].includes(v)) { await Appointments.save({ ...a, status: v }); toast('Güncellendi', { kind: 'ok' }); render(root); }
      else if (v === 'edit') { const r = await appointmentForm({ patientId: a.patientId, procedures: procedures.filter((x) => x.patientId === a.patientId), existing: a }); if (r) { toast('Randevu güncellendi', { kind: 'ok' }); render(root); } }
      else if (v === 'delete') { if (await confirmDialog({ title: 'Randevu silinsin mi?', okText: 'Sil', danger: true })) { await Appointments.remove(a.id); toast('Silindi'); render(root); } }
    };
  });
}
