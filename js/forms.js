/* Formlar: hasta, işlem, randevu, fotoğraf */
import { Patients, Procedures, Appointments, Photos } from './db.js';
import { buildControls, todayISO, toLocalISO } from './schedule.js';
import { processImage, parseTags, readExifDate } from './photos.js';
import { sheet, field, selectField, textareaField, segmented, bindSegmented, formData, esc, icon, toast, fmtDate } from './ui.js';

export const PROCEDURE_TYPES = [
  ...[
    'Rinoplasti', 'Revizyon Rinoplasti', 'Septorinoplasti', 'Blefaroplasti', 'Yüz Germe', 'Boyun Germe',
    'Kaş Kaldırma', 'Otoplasti', 'Meme Büyütme', 'Meme Küçültme', 'Meme Dikleştirme', 'Jinekomasti',
    'Liposuction', 'Abdominoplasti', 'Brazilian Butt Lift', 'Kol Germe', 'Uyluk Germe', 'Yağ Enjeksiyonu',
    'Dolgu', 'Botoks', 'Saç Ekimi', 'Skar Revizyonu',
  ].sort((a, b) => a.localeCompare(b, 'tr')),
  'Diğer',
];

export const ANESTHESIA = ['Genel', 'Lokal', 'Sedasyon', 'Lokal + Sedasyon'];
export const APPT_KINDS = [
  ['kontrol', 'Kontrol'], ['muayene', 'Muayene'], ['operasyon', 'Operasyon'],
  ['pansuman', 'Pansuman'], ['diger', 'Diğer'],
];
export const APPT_KIND_LABEL = Object.fromEntries(APPT_KINDS);

function footer(okText = 'Kaydet', extra = '') {
  return `${extra}<button class="btn btn-ghost" type="button" data-act="cancel">Vazgeç</button>
          <button class="btn btn-primary" type="submit" form="sheet-form">${okText}</button>`;
}

function wireForm(s, onSubmit) {
  const form = s.body.querySelector('form');
  s.el.querySelector('[data-act=cancel]').onclick = () => s.close(null);
  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    const err = form.querySelector('.form-error');
    if (err) err.remove();
    const submit = s.el.querySelector('[type=submit]');
    submit.disabled = true;
    try {
      const result = await onSubmit(formData(form), form);
      s.close(result);
    } catch (ex) {
      form.insertAdjacentHTML('afterbegin', `<div class="form-error">${esc(ex.message || 'Kaydedilemedi')}</div>`);
      submit.disabled = false;
    }
  });
  return form;
}

/* ---------------- Hasta ---------------- */
export function patientForm(existing = null) {
  const p = existing || {};
  const s = sheet({
    title: existing ? 'Hastayı düzenle' : 'Yeni hasta',
    footer: footer(existing ? 'Kaydet' : 'Hastayı ekle'),
    content: `
      <form id="sheet-form" class="form" novalidate>
        <div class="form-row">
          ${field({ label: 'Ad', name: 'firstName', value: p.firstName, required: true, attrs: 'autocomplete="off" autocapitalize="words"' })}
          ${field({ label: 'Soyad', name: 'lastName', value: p.lastName, required: true, attrs: 'autocomplete="off" autocapitalize="words"' })}
        </div>
        <div class="form-row">
          ${field({ label: 'Telefon', name: 'phone', type: 'tel', value: p.phone, placeholder: '05xx xxx xx xx', attrs: 'inputmode="tel"' })}
          ${field({ label: 'Doğum tarihi', name: 'birthDate', type: 'date', value: p.birthDate })}
        </div>
        <div class="form-row">
          ${selectField({ label: 'Cinsiyet', name: 'gender', value: p.gender || '', options: [['', 'Belirtilmedi'], ['F', 'Kadın'], ['M', 'Erkek']] })}
          ${selectField({ label: 'Kan grubu', name: 'bloodType', value: p.bloodType || '', options: [['', 'Bilinmiyor'], '0 Rh+', '0 Rh-', 'A Rh+', 'A Rh-', 'B Rh+', 'B Rh-', 'AB Rh+', 'AB Rh-'] })}
        </div>
        ${field({ label: 'E-posta', name: 'email', type: 'email', value: p.email, attrs: 'autocomplete="off"' })}
        ${field({ label: 'Alerjiler', name: 'allergies', value: p.allergies, placeholder: 'Penisilin, lateks…', hint: 'Hasta kartında uyarı olarak gösterilir.' })}
        ${field({ label: 'Yönlendiren', name: 'referral', value: p.referral, placeholder: 'Tavsiye, sosyal medya, hekim…' })}
        ${textareaField({ label: 'Notlar', name: 'notes', value: p.notes, placeholder: 'Sistemik hastalıklar, ilaçlar, sigara, beklentiler…' })}
      </form>`,
  });
  wireForm(s, async (d) => {
    if (!d.firstName || !d.lastName) throw new Error('Ad ve soyad zorunludur.');
    return Patients.save({ ...p, ...d });
  });
  return s.result;
}

/* ---------------- İşlem ---------------- */
export function procedureForm({ patientId, existing = null }) {
  const p = existing || {};
  const isNew = !existing;
  const s = sheet({
    title: isNew ? 'Yeni işlem' : 'İşlemi düzenle',
    footer: footer(isNew ? 'İşlemi ekle' : 'Kaydet'),
    content: `
      <form id="sheet-form" class="form" novalidate>
        ${selectField({ label: 'İşlem türü', name: 'type', value: p.type || 'Rinoplasti', options: PROCEDURE_TYPES, required: true })}
        ${field({ label: 'Açıklama / teknik', name: 'title', value: p.title, placeholder: 'Açık teknik, kıkırdak greft…' })}
        <div class="form-row">
          ${field({ label: 'İşlem tarihi', name: 'date', type: 'date', value: p.date || todayISO(), required: true })}
          ${selectField({ label: 'Anestezi', name: 'anesthesia', value: p.anesthesia || 'Genel', options: ANESTHESIA })}
        </div>
        ${textareaField({ label: 'Ameliyat notu', name: 'notes', value: p.notes, placeholder: 'Bulgular, uygulanan teknik, komplikasyon, öneriler…', rows: 4 })}
        ${isNew ? `
        <label class="check">
          <input type="checkbox" name="autoControls" checked>
          <span>
            <span class="check-title">Kontrol takvimini otomatik oluştur</span>
            <span class="check-text">1. gün, 1. hafta, 1. ay, 3. ay, 6. ay ve 1. yıl kontrolleri randevu olarak eklenir. Pazar gününe düşenler pazartesiye alınır.</span>
          </span>
        </label>
        <div class="form-row">
          ${field({ label: 'Kontrol saati', name: 'controlTime', type: 'time', value: '10:00' })}
        </div>` : ''}
      </form>`,
  });
  wireForm(s, async (d) => {
    if (!d.date) throw new Error('İşlem tarihi zorunludur.');
    const proc = await Procedures.save({
      ...p, patientId, type: d.type, title: d.title, date: d.date, anesthesia: d.anesthesia, notes: d.notes,
    });
    let created = [];
    if (isNew && d.autoControls) {
      const [hh, mm] = (d.controlTime || '10:00').split(':').map(Number);
      created = await Appointments.saveMany(buildControls(proc, { hour: hh, minute: mm }));
    }
    return { procedure: proc, createdControls: created };
  });
  return s.result;
}

/** Var olan bir işlem için kontrolleri (yeniden) üretir. Eski otomatik kontrolleri siler. */
export async function regenerateControls(procedure, { hour = 10, minute = 0 } = {}) {
  const existing = await Appointments.byIndex('procedureId', procedure.id);
  for (const a of existing.filter((x) => x.auto)) await Appointments.remove(a.id);
  return Appointments.saveMany(buildControls(procedure, { hour, minute }));
}

/* ---------------- Randevu ---------------- */
export function appointmentForm({ patientId, procedures = [], existing = null, defaultDate = null }) {
  const a = existing || {};
  const isNew = !existing;
  const dt = a.date ? a.date : (defaultDate || toLocalISO(nextSlot()));
  const [dPart, tPart] = [dt.slice(0, 10), dt.slice(11, 16) || '10:00'];
  const procOpts = [['', 'Bağlı işlem yok'], ...procedures.map((pr) => [pr.id, `${pr.type} · ${fmtDate(pr.date)}`])];
  const s = sheet({
    title: isNew ? 'Yeni Randevu' : 'Randevuyu Düzenle',
    footer: footer(isNew ? 'Randevu Ekle' : 'Kaydet'),
    content: `
      <form id="sheet-form" class="form" novalidate>
        <div class="form-row">
          ${field({ label: 'Tarih', name: 'd', type: 'date', value: dPart, required: true })}
          ${field({ label: 'Saat', name: 't', type: 'time', value: tPart, required: true })}
        </div>
        <div class="form-row">
          ${selectField({ label: 'Tür', name: 'kind', value: a.kind || 'kontrol', options: APPT_KINDS })}
          ${selectField({ label: 'Durum', name: 'status', value: a.status || 'planned', options: [['planned', 'Planlı'], ['done', 'Yapıldı'], ['missed', 'Gelmedi'], ['cancelled', 'İptal']] })}
        </div>
        ${field({ label: 'Başlık', name: 'label', value: a.label, placeholder: 'Dikiş alımı, pansuman, 2. hafta kontrolü…' })}
        ${selectField({ label: 'Bağlı işlem', name: 'procedureId', value: a.procedureId || '', options: procOpts })}
        ${textareaField({ label: 'Not', name: 'notes', value: a.notes, rows: 2 })}
      </form>`,
  });
  wireForm(s, async (d) => {
    if (!d.d || !d.t) throw new Error('Tarih ve saat zorunludur.');
    const label = d.label || APPT_KIND_LABEL[d.kind] || 'Randevu';
    return Appointments.save({
      ...a, patientId, date: `${d.d}T${d.t}`, kind: d.kind, status: d.status, label,
      procedureId: d.procedureId || null, notes: d.notes, auto: a.auto && d.procedureId === a.procedureId ? a.auto : false,
    });
  });
  return s.result;
}

function nextSlot() {
  const d = new Date();
  d.setDate(d.getDate() + 1);
  d.setHours(10, 0, 0, 0);
  return d;
}

/* ---------------- Fotoğraf yükleme ---------------- */
export async function photoUploadForm({ patientId, procedures = [], defaultPhase = 'before', defaultProcedureId = '' }) {
  const allTags = await Photos.allTags();
  const procOpts = [['', 'Bağlı işlem yok'], ...procedures.map((pr) => [pr.id, `${pr.type} · ${fmtDate(pr.date)}`])];
  let phase = defaultPhase;
  let files = [];

  const s = sheet({
    title: 'Fotoğraf ekle',
    size: 'md',
    footer: footer('Ekle'),
    content: `
      <form id="sheet-form" class="form" novalidate>
        <input type="file" name="files" accept="image/*" multiple class="hidden" id="photo-input">
        <div class="upload-zone" id="zone" role="button" tabindex="0">
          <b>Galeriden seç</b>
          <span>Birden fazla fotoğraf seçebilirsiniz. Küçültülmüş kopya saklanır, orijinal cihazınızda kalır.</span>
        </div>
        <div class="preview-grid hidden" id="previews"></div>
        <div class="field">
          <span class="field-label">Aşama</span>
          ${segmented({ name: 'phase', value: phase, options: [['before', 'Öncesi'], ['after', 'Sonrası']] })}
        </div>
        <div class="form-row">
          ${field({ label: 'Çekim tarihi', name: 'date', type: 'date', value: todayISO(), required: true })}
          ${selectField({ label: 'Bağlı işlem', name: 'procedureId', value: defaultProcedureId, options: procOpts })}
        </div>
        ${field({ label: 'Etiketler', name: 'tags', placeholder: 'Profil, Ön, Bazal… (virgülle ayırın)' })}
        ${allTags.length ? `<div class="tag-suggest">${allTags.slice(0, 12).map((t) => `<button type="button" class="chip sm" data-tag="${esc(t)}">${esc(t)}</button>`).join('')}</div>` : ''}
      </form>`,
  });

  const form = s.body.querySelector('form');
  const input = form.querySelector('#photo-input');
  const zone = form.querySelector('#zone');
  const previews = form.querySelector('#previews');
  const tagsInput = form.querySelector('[name=tags]');
  const dateInput = form.querySelector('[name=date]');
  const dateHint = document.createElement('span');
  dateHint.className = 'field-hint';
  dateHint.hidden = true;
  dateInput.closest('.field').appendChild(dateHint);
  let dateTouched = false; // kullanıcı tarihi elle değiştirdiyse EXIF ile üzerine yazma
  dateInput.addEventListener('input', () => { dateTouched = true; syncDate(); });
  bindSegmented(form.querySelector('.seg'), (v) => { phase = v; });
  zone.onclick = () => input.click();
  zone.onkeydown = (e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); input.click(); } };
  form.querySelectorAll('[data-tag]').forEach((b) => {
    b.onclick = () => {
      const cur = parseTags(tagsInput.value);
      const t = b.dataset.tag;
      const next = cur.includes(t) ? cur.filter((x) => x !== t) : [...cur, t];
      tagsInput.value = next.join(', ');
      b.classList.toggle('on', next.includes(t));
    };
  });

  function renderPreviews() {
    previews.classList.toggle('hidden', files.length === 0);
    previews.innerHTML = files.map((f, i) => `
      <div class="preview"><img src="${f.url}" alt=""><button type="button" class="rm" data-i="${i}" aria-label="Kaldır">${icon('x')}</button></div>`).join('');
    previews.querySelectorAll('.rm').forEach((b) => {
      b.onclick = () => { URL.revokeObjectURL(files[+b.dataset.i].url); files.splice(+b.dataset.i, 1); renderPreviews(); syncDate(); };
    });
    zone.querySelector('b').textContent = files.length ? `${files.length} fotoğraf seçildi · daha ekle` : 'Galeriden seç';
  }
  /* EXIF çekim tarihini forma yansıtır */
  function syncDate() {
    const dates = files.map((f) => f.exifDate).filter(Boolean);
    const distinct = [...new Set(dates)];
    if (!dateTouched && distinct.length) dateInput.value = distinct[0];
    let msg = '';
    if (dates.length && !dateTouched) {
      msg = distinct.length > 1
        ? 'Fotoğrafların çekim tarihleri farklı; her biri kendi tarihiyle kaydedilir.'
        : dates.length === files.length ? 'Çekim tarihi fotoğraftan alındı.' : 'Çekim tarihi fotoğraftan alındı; tarih bilgisi olmayanlar bu tarihle kaydedilir.';
    } else if (dates.length && dateTouched && distinct.length > 1) {
      msg = 'Tüm fotoğraflar seçtiğiniz tarihle kaydedilir.';
    }
    dateHint.textContent = msg;
    dateHint.hidden = !msg;
  }

  input.onchange = async () => {
    const added = [...input.files].map((f) => ({ file: f, url: URL.createObjectURL(f), exifDate: null }));
    files.push(...added);
    input.value = '';
    renderPreviews();
    await Promise.all(added.map(async (f) => { f.exifDate = await readExifDate(f.file); }));
    syncDate();
  };

  wireForm(s, async (d) => {
    if (!files.length) throw new Error('En az bir fotoğraf seçin.');
    const submit = s.el.querySelector('[type=submit]');
    const tags = parseTags(d.tags);
    const saved = [];
    for (let i = 0; i < files.length; i++) {
      submit.textContent = `İşleniyor ${i + 1}/${files.length}`;
      const img = await processImage(files[i].file);
      // Kullanıcı tarihi elle seçmediyse her fotoğraf kendi EXIF tarihiyle kaydedilir
      const date = (!dateTouched && files[i].exifDate) || d.date;
      try {
        saved.push(await Photos.save({
          patientId, procedureId: d.procedureId || null, phase, date, tags,
          blob: img.blob, thumb: img.thumb, width: img.width, height: img.height,
          originalName: files[i].file.name, size: img.blob.size,
        }));
      } catch (ex) {
        const done = saved.length ? ` ${saved.length} fotoğraf kaydedildi.` : '';
        throw new Error(`"${files[i].file.name}" kaydedilemedi: ${ex?.message || ex}.${done}`);
      }
      URL.revokeObjectURL(files[i].url);
    }
    toast(`${saved.length} fotoğraf eklendi`, { kind: 'ok' });
    return saved;
  });
  return s.result;
}

/* ---------------- Fotoğraf düzenleme ---------------- */
export async function photoEditForm(photo, procedures = []) {
  const allTags = await Photos.allTags();
  const procOpts = [['', 'Bağlı işlem yok'], ...procedures.map((pr) => [pr.id, `${pr.type} · ${fmtDate(pr.date)}`])];
  let phase = photo.phase;
  const s = sheet({
    title: 'Fotoğraf bilgileri',
    footer: footer('Kaydet'),
    content: `
      <form id="sheet-form" class="form" novalidate>
        <div class="field">
          <span class="field-label">Aşama</span>
          ${segmented({ name: 'phase', value: phase, options: [['before', 'Öncesi'], ['after', 'Sonrası']] })}
        </div>
        <div class="form-row">
          ${field({ label: 'Çekim tarihi', name: 'date', type: 'date', value: photo.date, required: true })}
          ${selectField({ label: 'Bağlı işlem', name: 'procedureId', value: photo.procedureId || '', options: procOpts })}
        </div>
        ${field({ label: 'Etiketler', name: 'tags', value: (photo.tags || []).join(', '), placeholder: 'Profil, Ön, Bazal…' })}
        ${allTags.length ? `<div class="tag-suggest">${allTags.slice(0, 12).map((t) => `<button type="button" class="chip sm ${(photo.tags || []).includes(t) ? 'on' : ''}" data-tag="${esc(t)}">${esc(t)}</button>`).join('')}</div>` : ''}
      </form>`,
  });
  const form = s.body.querySelector('form');
  const tagsInput = form.querySelector('[name=tags]');
  bindSegmented(form.querySelector('.seg'), (v) => { phase = v; });
  form.querySelectorAll('[data-tag]').forEach((b) => {
    b.onclick = () => {
      const cur = parseTags(tagsInput.value);
      const t = b.dataset.tag;
      const next = cur.includes(t) ? cur.filter((x) => x !== t) : [...cur, t];
      tagsInput.value = next.join(', ');
      b.classList.toggle('on', next.includes(t));
    };
  });
  wireForm(s, async (d) => Photos.save({ ...photo, phase, date: d.date, procedureId: d.procedureId || null, tags: parseTags(d.tags) }));
  return s.result;
}
