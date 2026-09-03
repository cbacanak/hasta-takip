/* Örnek veri: hastalar, işlemler, kontroller ve yer tutucu fotoğraflar */
import { Patients, Procedures, Appointments, Photos, uid } from './db.js';
import { buildControls, addDays, toLocalISO } from './schedule.js';

const SAMPLE = [
  { firstName: 'Ayşe', lastName: 'Yılmaz', gender: 'F', birthDate: '1991-04-12', phone: '0532 411 23 45', email: 'ayse.yilmaz@example.com', bloodType: 'A Rh+', allergies: '', referral: 'Instagram', notes: 'Sigara kullanmıyor. Daha önce estetik işlem yok. Burun ucu düşüklüğü ve dorsal kambur şikâyeti.',
    procedures: [{ type: 'Rinoplasti', title: 'Açık teknik, dorsal koruyucu', anesthesia: 'Genel', daysAgo: 9, notes: 'Splint 7. günde alındı. Ödem beklenen düzeyde. Bantlama önerildi.' }] },
  { firstName: 'Mehmet', lastName: 'Kaya', gender: 'M', birthDate: '1978-11-03', phone: '0533 785 90 11', email: '', bloodType: '0 Rh+', allergies: 'Penisilin', referral: 'Tavsiye', notes: 'Hipertansiyon, düzenli ilaç kullanıyor (amlodipin). Anestezi konsültasyonu tamam.',
    procedures: [{ type: 'Blefaroplasti', title: 'Üst + alt göz kapağı', anesthesia: 'Lokal + Sedasyon', daysAgo: 35, notes: 'Dikişler 5. günde alındı. Alt kapakta hafif ekimoz, çözüldü.' }] },
  { firstName: 'Zeynep', lastName: 'Demir', gender: 'F', birthDate: '1986-07-28', phone: '0505 233 67 89', email: 'zeynepd@example.com', bloodType: '', allergies: 'Lateks', referral: 'Hekim', notes: 'İki doğum sonrası. Diastasis recti mevcut.',
    procedures: [{ type: 'Abdominoplasti', title: 'Lipoabdominoplasti + rektus plikasyonu', anesthesia: 'Genel', daysAgo: 100, notes: 'Drenler 4. günde çekildi. Korse 6 hafta.' }, { type: 'Liposuction', title: 'Bel + sırt', anesthesia: 'Genel', daysAgo: 100, notes: 'Aynı seansta, 1800 cc aspirat.' }] },
  { firstName: 'Can', lastName: 'Öztürk', gender: 'M', birthDate: '1995-02-19', phone: '0542 901 45 32', email: '', bloodType: 'B Rh+', allergies: '', referral: 'Google', notes: 'Spor yapıyor, protein takviyesi kullanıyor.',
    procedures: [{ type: 'Jinekomasti', title: 'Liposuction + glandüler eksizyon', anesthesia: 'Genel', daysAgo: 2, notes: 'Bilateral. Kompresyon yeleği 4 hafta.' }] },
  { firstName: 'Elif', lastName: 'Şahin', gender: 'F', birthDate: '1999-09-05', phone: '0555 120 88 40', email: 'elif.sahin@example.com', bloodType: 'AB Rh-', allergies: '', referral: 'Instagram', notes: '',
    procedures: [] },
  { firstName: 'Selin', lastName: 'Arslan', gender: 'F', birthDate: '1983-12-21', phone: '0530 667 12 09', email: '', bloodType: 'A Rh-', allergies: '', referral: 'Tavsiye', notes: 'Emzirme bitti (8 ay önce).',
    procedures: [{ type: 'Meme Dikleştirme', title: 'Vertikal skar mastopeksi + implant 275 cc', anesthesia: 'Genel', daysAgo: 200, notes: 'Simetri iyi. Skar bakımı için silikon jel önerildi.' }] },
];

const TAGS = { before: [['Ön'], ['Profil'], ['Bazal']], after: [['Ön'], ['Profil'], ['Bazal']] };

/** Canvas ile yer tutucu fotoğraf üretir (gerçek hasta görseli değildir). */
function placeholder(w, h, phase, label, seed) {
  const c = document.createElement('canvas');
  c.width = w; c.height = h;
  const ctx = c.getContext('2d');
  const hue = phase === 'before' ? 265 : 190;
  const g = ctx.createLinearGradient(0, 0, w, h);
  g.addColorStop(0, `hsl(${hue + seed * 7}, 28%, 88%)`);
  g.addColorStop(1, `hsl(${hue + seed * 7}, 32%, 72%)`);
  ctx.fillStyle = g; ctx.fillRect(0, 0, w, h);
  // stilize yüz silueti
  ctx.fillStyle = 'rgba(255,255,255,.55)';
  ctx.beginPath(); ctx.ellipse(w / 2, h * 0.42, w * 0.22, h * 0.26, 0, 0, Math.PI * 2); ctx.fill();
  ctx.beginPath(); ctx.ellipse(w / 2, h * 0.95, w * 0.4, h * 0.3, 0, 0, Math.PI * 2); ctx.fill();
  ctx.fillStyle = `hsla(${hue}, 40%, 25%, .75)`;
  ctx.font = `600 ${Math.round(w * 0.055)}px -apple-system, Segoe UI, sans-serif`;
  ctx.textAlign = 'center';
  ctx.fillText(phase === 'before' ? 'ÖNCESİ' : 'SONRASI', w / 2, h * 0.86);
  ctx.font = `500 ${Math.round(w * 0.04)}px -apple-system, Segoe UI, sans-serif`;
  ctx.fillText(label + ' · örnek', w / 2, h * 0.86 + w * 0.06);
  return c;
}
/* toDataURL senkron çalışır; arka plandaki sekmelerde toBlob'un ertelenmesini önler */
function toBlob(canvas, q = 0.8) {
  return fetch(canvas.toDataURL('image/jpeg', q)).then((r) => r.blob());
}

export async function loadSampleData({ onProgress } = {}) {
  const now = new Date();
  let seed = 0;
  for (let i = 0; i < SAMPLE.length; i++) {
    const s = SAMPLE[i];
    onProgress?.(`${s.firstName} ${s.lastName} ekleniyor…`);
    const { procedures, ...pdata } = s;
    const patient = await Patients.save({ ...pdata, id: uid() });

    for (const pr of procedures) {
      const date = toLocalISO(addDays(now, -pr.daysAgo)).slice(0, 10);
      const proc = await Procedures.save({ id: uid(), patientId: patient.id, type: pr.type, title: pr.title, anesthesia: pr.anesthesia, date, notes: pr.notes });
      const controls = buildControls(proc, { hour: 10 + (i % 3), minute: (i % 2) * 30 });
      // Geçmiş kontrolleri "yapıldı", biri "gelmedi" olarak işaretle
      controls.forEach((c, k) => {
        if (new Date(c.date) < now) c.status = (i === 1 && k === 1) ? 'missed' : 'done';
      });
      await Appointments.saveMany(controls);

      // Fotoğraflar: öncesi (işlemden 1 gün önce) + sonrası (son kontrol / bugün)
      const beforeDate = toLocalISO(addDays(new Date(date), -1)).slice(0, 10);
      for (const [tag] of TAGS.before) {
        const cv = placeholder(900, 1200, 'before', tag, seed++);
        const th = placeholder(300, 400, 'before', tag, seed - 1);
        await Photos.save({ id: uid(), patientId: patient.id, procedureId: proc.id, phase: 'before', date: beforeDate, tags: [tag], blob: await toBlob(cv), thumb: await toBlob(th, .7), width: 900, height: 1200, sample: true });
      }
      if (pr.daysAgo >= 7) {
        const afterDate = toLocalISO(addDays(new Date(date), Math.min(pr.daysAgo, 30))).slice(0, 10);
        for (const [tag] of TAGS.after.slice(0, pr.daysAgo > 30 ? 3 : 2)) {
          const cv = placeholder(900, 1200, 'after', tag, seed++);
          const th = placeholder(300, 400, 'after', tag, seed - 1);
          await Photos.save({ id: uid(), patientId: patient.id, procedureId: proc.id, phase: 'after', date: afterDate, tags: [tag], blob: await toBlob(cv), thumb: await toBlob(th, .7), width: 900, height: 1200, sample: true });
        }
      }
    }

    // Serbest randevular
    if (i === 4) {
      const d = addDays(now, 3); d.setHours(14, 30, 0, 0);
      await Appointments.save({ patientId: patient.id, date: toLocalISO(d), kind: 'muayene', label: 'İlk muayene · rinoplasti', status: 'planned', auto: false, notes: 'Fotoğraf çekilecek, simülasyon istiyor.' });
    }
    if (i === 0) {
      const d = addDays(now, 0); d.setHours(16, 0, 0, 0);
      await Appointments.save({ patientId: patient.id, date: toLocalISO(d), kind: 'pansuman', label: 'Bant değişimi', status: 'planned', auto: false, notes: '' });
    }
  }
  onProgress?.('Tamamlandı');
}
