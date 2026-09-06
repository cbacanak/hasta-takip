/* Ajanda — liste (gecikmiş + yaklaşan) ve aylık takvim; TASARIM.md metin sekmeleri, hairline liste, kutusuz takvim */
import { Appointments, Patients, Procedures, fullName } from '../db.js';
import { esc, icon, initials, fmtTime, fmtDateLong, fmtDayMonth, weekdayShort, parseDate, daysBetween, statusText, emptyState, toast, actionMenu, confirmDialog } from '../ui.js';
import { APPT_KIND_LABEL, appointmentForm } from '../forms.js';
import { setTopbar, go } from '../nav.js';

const VIEW_KEY = 'ajanda-view';
let viewMode = (() => { try { return localStorage.getItem(VIEW_KEY) || 'list'; } catch { return 'list'; } })();
let calMonth = null;      // görüntülenen ay (Date, ayın 1'i)
let selectedDay = null;   // "YYYY-MM-DD"

const pad = (n) => String(n).padStart(2, '0');
const keyOf = (d) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
const lower = (s) => String(s || '').toLocaleLowerCase('tr');

export async function render(root) {
  setTopbar({ title: 'Ajanda' });
  const [appointments, patients, procedures] = await Promise.all([Appointments.allSorted(), Patients.all(), Procedures.all()]);
  const pById = Object.fromEntries(patients.map((p) => [p.id, p]));
  const prById = Object.fromEntries(procedures.map((p) => [p.id, p]));
  const today = new Date(); today.setHours(0, 0, 0, 0);
  const todayKey = keyOf(today);
  if (!calMonth) calMonth = new Date(today.getFullYear(), today.getMonth(), 1);
  if (!selectedDay) selectedDay = todayKey;
  const planned = appointments.filter((a) => a.status === 'planned');
  const todayCount = planned.filter((a) => a.date.slice(0, 10) === todayKey).length;

  const row = (a, { withDate = false } = {}) => {
    const p = pById[a.patientId];
    const pr = a.procedureId ? prById[a.procedureId] : null;
    const d = parseDate(a.date);
    const overdue = a.status === 'planned' && d < today;
    const sub = [withDate ? fmtDayMonth(a.date) : null, fmtTime(a.date), lower(a.label), pr ? pr.type : (APPT_KIND_LABEL[a.kind] || a.kind), a.notes || null].filter(Boolean).join(' · ');
    return `
      <button class="row ${a.status === 'done' || a.status === 'cancelled' ? 'muted' : ''}" type="button" data-appt="${a.id}">
        <div class="avatar sm">${esc(initials(p ? fullName(p) : '?'))}</div>
        <div class="row-main">
          <div class="row-title">${esc(p ? fullName(p) : 'Silinmiş hasta')}</div>
          <div class="row-sub">${esc(sub)}</div>
        </div>
        <div class="row-end">${a.status === 'planned' && !overdue ? `<span class="status">${esc(daysLeft(d))}</span>` : statusText(a.status, { overdue, today: daysBetween(today, d) === 0 })}</div>
      </button>`;
  };
  /** Planlı randevular için "Bugün", "Yarın", "6 gün" */
  const daysLeft = (d) => { const n = daysBetween(today, d); return n === 0 ? 'Bugün' : n === 1 ? 'Yarın' : `${n} gün`; };
  const upcomingCard = (a) => {
    const p = pById[a.patientId];
    const pr = a.procedureId ? prById[a.procedureId] : null;
    return `
      <button class="upcoming-card" type="button" data-appt="${a.id}">
        <div>
          <div class="name">${esc(p ? fullName(p) : 'Silinmiş hasta')}</div>
          <div class="sub">${[pr ? pr.type : null, lower(a.label), fmtTime(a.date)].filter(Boolean).map(esc).join(' · ')}</div>
        </div>
        <div>
          <div class="date">${esc(fmtDayMonth(a.date))}</div>
          <div class="rel">${esc(lower(daysLeft(parseDate(a.date))))}</div>
        </div>
      </button>`;
  };

  root.innerHTML = `
    <div class="screen">
    <div class="page-head">
      <div>
        <h1 class="page-title">Ajanda</h1>
        <div class="page-sub">${esc(fmtDateLong(new Date()))}${todayCount ? ` · bugün ${todayCount} randevu` : ''}</div>
      </div>
    </div>
    <div class="tabs" role="tablist">
      <button class="tab-btn ${viewMode === 'list' ? 'on' : ''}" type="button" role="tab" data-view="list">Liste</button>
      <button class="tab-btn ${viewMode === 'month' ? 'on' : ''}" type="button" role="tab" data-view="month">Takvim</button>
    </div>
    <div id="ajanda-body"></div>
    </div>`;
  root.querySelectorAll('[data-view]').forEach((b) => {
    b.onclick = () => {
      viewMode = b.dataset.view;
      try { localStorage.setItem(VIEW_KEY, viewMode); } catch { /* yok say */ }
      root.querySelectorAll('[data-view]').forEach((x) => x.classList.toggle('on', x === b));
      paint();
    };
  });

  const body = root.querySelector('#ajanda-body');
  function paint() { (viewMode === 'month' ? paintMonth : paintList)(); }

  /* ---------- Liste ---------- */
  function paintList() {
    const horizon = new Date(today); horizon.setDate(horizon.getDate() + 60);
    const overdue = appointments.filter((a) => a.status === 'planned' && parseDate(a.date) < today);
    const upcoming = appointments.filter((a) => parseDate(a.date) >= today && parseDate(a.date) <= horizon && a.status !== 'cancelled');
    const later = appointments.filter((a) => parseDate(a.date) > horizon && a.status === 'planned');
    // En yakın planlı randevu lacivert kart olarak öne çıkar; kalanlar güne göre listelenir
    const next = upcoming.find((a) => a.status === 'planned') || null;
    const rest = upcoming.filter((a) => a !== next);
    const byDay = new Map();
    rest.forEach((a) => { const k = a.date.slice(0, 10); if (!byDay.has(k)) byDay.set(k, []); byDay.get(k).push(a); });

    body.innerHTML = `
      ${overdue.length ? `<section class="section"><div class="section-label t-danger">Gecikmiş · ${overdue.length}</div><div class="list">${overdue.map((a) => row(a, { withDate: true })).join('')}</div></section>` : ''}
      ${next ? `<section class="section"><div class="section-label">Yaklaşan kontrol</div>${upcomingCard(next)}</section>` : ''}
      ${byDay.size ? [...byDay.entries()].map(([k, list]) => {
        const n = daysBetween(today, parseDate(k));
        const title = n === 0 ? 'Bugün' : n === 1 ? 'Yarın' : `${weekdayShort(k)} · ${fmtDayMonth(k)}`;
        return `<section class="section"><div class="section-label">${esc(title)}</div><div class="list">${list.map((a) => row(a)).join('')}</div></section>`;
      }).join('') : (overdue.length || next ? '' : emptyState({ title: 'Önümüzdeki 60 günde randevu yok', text: 'İşlem eklendiğinde kontrol takvimi buraya düşer.' }))}
      ${later.length ? `<p class="t-caption section">60 günden sonra ${later.length} planlı randevu daha var.</p>` : ''}`;
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
    const dot = (a) => `<i class="cal-dot ${a.status === 'done' ? 'done' : a.status === 'missed' ? 'warn' : (parseDate(a.date) < today && a.status === 'planned') ? 'warn' : ''}"></i>`;

    body.innerHTML = `
      <div class="cal-head">
        <div class="cal-title"><span class="cal-month">${esc(monthTitle)}</span><span>${monthCount} randevu</span></div>
        <button class="btn btn-ghost btn-sm" type="button" data-cal="today">Bugün</button>
        <button class="btn-icon" type="button" data-cal="prev" aria-label="Önceki ay">${icon('left')}</button>
        <button class="btn-icon" type="button" data-cal="next" aria-label="Sonraki ay">${icon('right')}</button>
      </div>
      <div class="cal-weekdays">${['Pzt', 'Sal', 'Çar', 'Per', 'Cum', 'Cmt', 'Paz'].map((w) => `<span>${w}</span>`).join('')}</div>
      <div class="cal-grid">
        ${cells.map(({ d, out }) => {
          const k = keyOf(d);
          const list = (byDay.get(k) || []).filter((a) => a.status !== 'cancelled');
          return `<button class="cal-cell ${out ? 'out' : ''} ${k === todayKey ? 'today' : ''} ${k === selectedDay ? 'sel' : ''}" type="button" data-day="${k}" aria-label="${esc(fmtDateLong(k))}">
            <span class="cal-num">${d.getDate()}</span>
            <span class="cal-dots">${list.slice(0, 3).map(dot).join('')}${list.length > 3 ? `<i class="cal-more">+${list.length - 3}</i>` : ''}</span>
          </button>`;
        }).join('')}
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
    const rel = n === 0 ? ' · Bugün' : n === 1 ? ' · Yarın' : n === -1 ? ' · Dün' : '';
    box.innerHTML = `
      <div class="section-head">
        <div class="section-title">${esc(parseDate(selectedDay).toLocaleDateString('tr-TR', { day: 'numeric', month: 'long', weekday: 'long' }))}<span class="t-caption">${rel}</span></div>
        <button class="section-link" type="button" data-act="add">Randevu ekle</button>
      </div>
      ${list.length ? `<div class="list">${list.map((a) => row(a)).join('')}</div>` : `<div class="empty" style="padding:8px 0"><div class="empty-text">Bu günde randevu yok.</div></div>`}`;
    box.querySelector('[data-act=add]').onclick = async () => {
      if (!patients.length) { toast('Önce hasta ekleyin'); return; }
      const pick = await actionMenu('Hangi hasta için?', patients.map((p) => ({ label: fullName(p), value: p.id })));
      if (!pick) return;
      const r = await appointmentForm({ patientId: pick, procedures: procedures.filter((x) => x.patientId === pick), defaultDate: `${selectedDay}T10:00` });
      if (r) { toast('Randevu eklendi'); render(root); }
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
        else if (['done', 'missed', 'planned'].includes(v)) { await Appointments.save({ ...a, status: v }); toast('Güncellendi'); render(root); }
        else if (v === 'edit') { const r = await appointmentForm({ patientId: a.patientId, procedures: procedures.filter((x) => x.patientId === a.patientId), existing: a }); if (r) { toast('Randevu güncellendi'); render(root); } }
        else if (v === 'delete') { if (await confirmDialog({ title: 'Randevu silinsin mi?', okText: 'Sil', danger: true })) { await Appointments.remove(a.id); toast('Silindi'); render(root); } }
      };
    });
  }

  paint();
}
