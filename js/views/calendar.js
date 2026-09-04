/* Ajanda: liste görünümü (gecikmiş + yaklaşan) ve aylık takvim görünümü */
import { Appointments, Patients, Procedures, fullName } from '../db.js';
import { esc, icon, initials, fmtTime, fmtDateLong, weekdayShort, parseDate, daysBetween, statusPill, emptyState, toast, actionMenu, confirmDialog, segmented, bindSegmented } from '../ui.js';
import { APPT_KIND_LABEL, appointmentForm } from '../forms.js';
import { setTopbar, go } from '../nav.js';

const VIEW_KEY = 'ajanda-view';
let viewMode = (() => { try { return localStorage.getItem(VIEW_KEY) || 'list'; } catch { return 'list'; } })();
let calMonth = null;      // görüntülenen ay (Date, ayın 1'i)
let selectedDay = null;   // "YYYY-MM-DD"

const pad = (n) => String(n).padStart(2, '0');
const keyOf = (d) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;

export async function render(root) {
  setTopbar({ title: 'Ajanda' });
  const [appointments, patients, procedures] = await Promise.all([Appointments.allSorted(), Patients.all(), Procedures.all()]);
  const pById = Object.fromEntries(patients.map((p) => [p.id, p]));
  const prById = Object.fromEntries(procedures.map((p) => [p.id, p]));
  const today = new Date(); today.setHours(0, 0, 0, 0);
  const todayKey = keyOf(today);
  if (!calMonth) calMonth = new Date(today.getFullYear(), today.getMonth(), 1);
  if (!selectedDay) selectedDay = todayKey;

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
      ${segmented({ name: 'view', value: viewMode, cls: 'seg-compact', options: [['list', `${icon('note')}Liste`], ['month', `${icon('calendar')}Takvim`]] })}
    </div>
    <div id="ajanda-body"></div>`;
  bindSegmented(root.querySelector('.seg'), (v) => {
    viewMode = v;
    try { localStorage.setItem(VIEW_KEY, v); } catch { /* yok say */ }
    paint();
  });

  const body = root.querySelector('#ajanda-body');
  function paint() { (viewMode === 'month' ? paintMonth : paintList)(); }

  /* ---------- Liste ---------- */
  function paintList() {
    const horizon = new Date(today); horizon.setDate(horizon.getDate() + 60);
    const overdue = appointments.filter((a) => a.status === 'planned' && parseDate(a.date) < today);
    const upcoming = appointments.filter((a) => parseDate(a.date) >= today && parseDate(a.date) <= horizon && a.status !== 'cancelled');
    const later = appointments.filter((a) => parseDate(a.date) > horizon && a.status === 'planned');
    const byDay = new Map();
    upcoming.forEach((a) => { const k = a.date.slice(0, 10); if (!byDay.has(k)) byDay.set(k, []); byDay.get(k).push(a); });

    body.innerHTML = `
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
    bindRows();
  }

  /* ---------- Aylık takvim ---------- */
  function paintMonth() {
    const y = calMonth.getFullYear(), m = calMonth.getMonth();
    const first = new Date(y, m, 1);
    const daysInMonth = new Date(y, m + 1, 0).getDate();
    const lead = (first.getDay() + 6) % 7; // Pazartesi başlangıç
    const byDay = new Map();
    appointments.forEach((a) => { const k = a.date.slice(0, 10); if (!byDay.has(k)) byDay.set(k, []); byDay.get(k).push(a); });

    const cells = [];
    const prevDays = new Date(y, m, 0).getDate();
    for (let i = lead - 1; i >= 0; i--) cells.push({ d: new Date(y, m - 1, prevDays - i), out: true });
    for (let d = 1; d <= daysInMonth; d++) cells.push({ d: new Date(y, m, d), out: false });
    while (cells.length % 7) cells.push({ d: new Date(y, m + 1, cells.length - lead - daysInMonth + 1), out: true });

    const monthTitle = first.toLocaleDateString('tr-TR', { month: 'long', year: 'numeric' });
    const monthCount = appointments.filter((a) => a.date.slice(0, 7) === `${y}-${pad(m + 1)}` && a.status !== 'cancelled').length;
    const dot = (a) => `<i class="cal-dot ${a.status === 'done' ? 'ok' : a.status === 'missed' ? 'warn' : a.status === 'cancelled' ? 'muted' : (parseDate(a.date) < today ? 'warn' : 'plan')}"></i>`;

    body.innerHTML = `
      <div class="card cal">
        <div class="cal-head">
          <button class="btn-icon sm" data-cal="prev" aria-label="Önceki ay">${icon('left')}</button>
          <div class="cal-title"><b>${esc(monthTitle)}</b><span class="muted small">${monthCount} randevu</span></div>
          <button class="btn btn-ghost btn-sm" data-cal="today">Bugün</button>
          <button class="btn-icon sm" data-cal="next" aria-label="Sonraki ay">${icon('right')}</button>
        </div>
        <div class="cal-weekdays">${['Pzt', 'Sal', 'Çar', 'Per', 'Cum', 'Cmt', 'Paz'].map((w) => `<span>${w}</span>`).join('')}</div>
        <div class="cal-grid">
          ${cells.map(({ d, out }) => {
            const k = keyOf(d);
            const list = (byDay.get(k) || []).filter((a) => a.status !== 'cancelled');
            return `<button class="cal-cell ${out ? 'out' : ''} ${k === todayKey ? 'today' : ''} ${k === selectedDay ? 'sel' : ''} ${list.length ? 'has' : ''}" data-day="${k}" aria-label="${esc(fmtDateLong(k))}">
              <span class="cal-num">${d.getDate()}</span>
              <span class="cal-dots">${list.slice(0, 3).map(dot).join('')}${list.length > 3 ? `<i class="cal-more">+${list.length - 3}</i>` : ''}</span>
            </button>`;
          }).join('')}
        </div>
      </div>
      <div id="cal-day" class="section"></div>`;

    body.querySelector('[data-cal=prev]').onclick = () => { calMonth = new Date(y, m - 1, 1); paintMonth(); };
    body.querySelector('[data-cal=next]').onclick = () => { calMonth = new Date(y, m + 1, 1); paintMonth(); };
    body.querySelector('[data-cal=today]').onclick = () => { calMonth = new Date(today.getFullYear(), today.getMonth(), 1); selectedDay = todayKey; paintMonth(); };
    body.querySelectorAll('[data-day]').forEach((c) => {
      c.onclick = () => {
        selectedDay = c.dataset.day;
        const d = parseDate(selectedDay);
        if (d.getMonth() !== m || d.getFullYear() !== y) { calMonth = new Date(d.getFullYear(), d.getMonth(), 1); paintMonth(); return; }
        body.querySelectorAll('.cal-cell').forEach((x) => x.classList.toggle('sel', x.dataset.day === selectedDay));
        paintDay(byDay);
      };
    });
    paintDay(byDay);
  }

  function paintDay(byDay) {
    const box = body.querySelector('#cal-day');
    const list = (byDay.get(selectedDay) || []).sort((a, b) => a.date.localeCompare(b.date));
    const n = daysBetween(today, parseDate(selectedDay));
    const rel = n === 0 ? 'Bugün' : n === 1 ? 'Yarın' : n === -1 ? 'Dün' : '';
    box.innerHTML = `
      <div class="section-head">
        <div class="section-title">${esc(fmtDateLong(selectedDay))}${rel ? `<span class="count">${rel}</span>` : ''}</div>
        <button class="btn btn-ghost btn-sm" data-act="add">${icon('plus')}Randevu</button>
      </div>
      ${list.length ? `<div class="card"><div class="list">${list.map(row).join('')}</div></div>`
        : `<div class="card"><div class="empty" style="padding:20px"><div class="empty-text">Bu günde randevu yok.</div></div></div>`}`;
    box.querySelector('[data-act=add]').onclick = async () => {
      if (!patients.length) { toast('Önce hasta ekleyin'); return; }
      const pick = await actionMenu('Hangi hasta için?', patients.map((p) => ({ label: fullName(p), icon: 'user', value: p.id })));
      if (!pick) return;
      const r = await appointmentForm({ patientId: pick, procedures: procedures.filter((x) => x.patientId === pick), defaultDate: `${selectedDay}T10:00` });
      if (r) { toast('Randevu eklendi', { kind: 'ok' }); render(root); }
    };
    bindRows();
  }

  /* ---------- Satır eylemleri ---------- */
  function bindRows() {
    body.querySelectorAll('[data-appt]').forEach((b) => {
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

  paint();
}
