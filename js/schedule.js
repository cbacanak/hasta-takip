/* Otomatik kontrol takvimi */

export const CONTROL_SCHEDULE = [
  { key: 'd1', label: '1. Gün Kontrolü', short: '1. Gün', add: (d) => addDays(d, 1) },
  { key: 'w1', label: '1. Hafta Kontrolü', short: '1. Hafta', add: (d) => addDays(d, 7) },
  { key: 'm1', label: '1. Ay Kontrolü', short: '1. Ay', add: (d) => addMonths(d, 1) },
  { key: 'm3', label: '3. Ay Kontrolü', short: '3. Ay', add: (d) => addMonths(d, 3) },
  { key: 'm6', label: '6. Ay Kontrolü', short: '6. Ay', add: (d) => addMonths(d, 6) },
  { key: 'y1', label: '1. Yıl Kontrolü', short: '1. Yıl', add: (d) => addMonths(d, 12) },
];

export function addDays(date, n) {
  const d = new Date(date);
  d.setDate(d.getDate() + n);
  return d;
}

export function addMonths(date, n) {
  const d = new Date(date);
  const day = d.getDate();
  d.setDate(1);
  d.setMonth(d.getMonth() + n);
  const last = new Date(d.getFullYear(), d.getMonth() + 1, 0).getDate();
  d.setDate(Math.min(day, last));
  return d;
}

/** Pazar gününe düşen kontrolü pazartesiye kaydırır. */
export function skipSunday(date) {
  const d = new Date(date);
  if (d.getDay() === 0) d.setDate(d.getDate() + 1);
  return d;
}

/**
 * Bir işlem için kontrol randevularını üretir.
 * @param {object} procedure  { id, patientId, date (YYYY-MM-DD), type }
 * @param {object} opts       { hour, minute, avoidSunday }
 */
export function buildControls(procedure, { hour = 10, minute = 0, avoidSunday = true, keys = null } = {}) {
  const base = new Date(procedure.date + 'T00:00:00');
  return CONTROL_SCHEDULE.filter((c) => !keys || keys.includes(c.key)).map((c) => {
    let d = c.add(base);
    if (avoidSunday) d = skipSunday(d);
    d.setHours(hour, minute, 0, 0);
    return {
      patientId: procedure.patientId,
      procedureId: procedure.id,
      date: toLocalISO(d),
      kind: 'kontrol',
      label: c.label,
      scheduleKey: c.key,
      status: 'planned',
      auto: true,
      notes: '',
    };
  });
}

/** Yerel saatle, saat dilimi kaymadan ISO benzeri "YYYY-MM-DDTHH:mm" verir. */
export function toLocalISO(d) {
  const p = (n) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}T${p(d.getHours())}:${p(d.getMinutes())}`;
}

export function todayISO() {
  return toLocalISO(new Date()).slice(0, 10);
}
