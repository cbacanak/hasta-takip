/* Veri katmanı — IndexedDB
 * Tüm kalıcı veri erişimi bu dosya üzerinden yapılır.
 * Depolar: patients, procedures, photos, appointments, settings
 */

const DB_NAME = 'hasta-takip';
const DB_VERSION = 1;

let _db = null;

export function uid() {
  if (crypto.randomUUID) return crypto.randomUUID();
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 10);
}

export function nowISO() {
  return new Date().toISOString();
}

export function openDB() {
  if (_db) return Promise.resolve(_db);
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, DB_VERSION);
    req.onupgradeneeded = () => {
      const db = req.result;
      if (!db.objectStoreNames.contains('patients')) {
        const s = db.createObjectStore('patients', { keyPath: 'id' });
        s.createIndex('lastName', 'lastName');
        s.createIndex('updatedAt', 'updatedAt');
      }
      if (!db.objectStoreNames.contains('procedures')) {
        const s = db.createObjectStore('procedures', { keyPath: 'id' });
        s.createIndex('patientId', 'patientId');
        s.createIndex('date', 'date');
      }
      if (!db.objectStoreNames.contains('photos')) {
        const s = db.createObjectStore('photos', { keyPath: 'id' });
        s.createIndex('patientId', 'patientId');
        s.createIndex('procedureId', 'procedureId');
      }
      if (!db.objectStoreNames.contains('appointments')) {
        const s = db.createObjectStore('appointments', { keyPath: 'id' });
        s.createIndex('patientId', 'patientId');
        s.createIndex('date', 'date');
        s.createIndex('procedureId', 'procedureId');
      }
      if (!db.objectStoreNames.contains('settings')) {
        db.createObjectStore('settings', { keyPath: 'key' });
      }
    };
    req.onsuccess = () => {
      _db = req.result;
      _db.onversionchange = () => { _db.close(); _db = null; };
      resolve(_db);
    };
    req.onerror = () => reject(req.error);
    req.onblocked = () => reject(new Error('Veritabanı başka bir sekmede açık.'));
  });
}

function promisify(req) {
  return new Promise((res, rej) => {
    req.onsuccess = () => res(req.result);
    req.onerror = () => rej(req.error);
  });
}

/** Bir transaction içinde çalıştırır. fn içinde yalnızca IDB isteklerini await edin. */
async function run(storeNames, mode, fn) {
  const db = await openDB();
  const names = Array.isArray(storeNames) ? storeNames : [storeNames];
  const t = db.transaction(names, mode);
  const stores = {};
  names.forEach((n) => { stores[n] = t.objectStore(n); });
  const done = new Promise((res, rej) => {
    t.oncomplete = () => res();
    t.onerror = () => rej(t.error);
    t.onabort = () => rej(t.error || new Error('İşlem iptal edildi'));
  });
  const result = await fn(Array.isArray(storeNames) ? stores : stores[storeNames], t);
  await done;
  return result;
}

function baseStore(name) {
  return {
    all: () => run(name, 'readonly', (s) => promisify(s.getAll())),
    get: (id) => run(name, 'readonly', (s) => promisify(s.get(id))),
    put: (obj) => run(name, 'readwrite', (s) => promisify(s.put(obj))).then(() => obj),
    remove: (id) => run(name, 'readwrite', (s) => promisify(s.delete(id))),
    byIndex: (idx, val) => run(name, 'readonly', (s) => promisify(s.index(idx).getAll(val))),
    count: () => run(name, 'readonly', (s) => promisify(s.count())),
    clear: () => run(name, 'readwrite', (s) => promisify(s.clear())),
  };
}

function stamp(obj) {
  const now = nowISO();
  return { ...obj, id: obj.id || uid(), createdAt: obj.createdAt || now, updatedAt: now };
}

/* ---------------- Hastalar ---------------- */
const _patients = baseStore('patients');
export const Patients = {
  ..._patients,
  async save(p) {
    const obj = stamp(p);
    obj.firstName = (obj.firstName || '').trim();
    obj.lastName = (obj.lastName || '').trim();
    await _patients.put(obj);
    return obj;
  },
  /** Hastayı ve ona bağlı tüm kayıtları siler. */
  removeCascade(id) {
    return run(['patients', 'procedures', 'photos', 'appointments'], 'readwrite', async (s) => {
      for (const name of ['procedures', 'photos', 'appointments']) {
        const keys = await promisify(s[name].index('patientId').getAllKeys(id));
        keys.forEach((k) => s[name].delete(k));
      }
      s.patients.delete(id);
    });
  },
  async search(q) {
    const all = await _patients.all();
    const needle = normalize(q);
    const list = needle
      ? all.filter((p) => normalize(`${p.firstName} ${p.lastName} ${p.phone || ''}`).includes(needle))
      : all;
    return list.sort(byName);
  },
};

export function fullName(p) {
  return `${p.firstName || ''} ${p.lastName || ''}`.trim() || 'İsimsiz';
}

export function byName(a, b) {
  return fullName(a).localeCompare(fullName(b), 'tr');
}

export function normalize(s) {
  return (s || '').toLocaleLowerCase('tr').replace(/\s+/g, ' ').trim();
}

/* ---------------- İşlemler ---------------- */
const _procedures = baseStore('procedures');
export const Procedures = {
  ..._procedures,
  save: (p) => _procedures.put(stamp(p)),
  async byPatient(patientId) {
    const list = await _procedures.byIndex('patientId', patientId);
    return list.sort((a, b) => b.date.localeCompare(a.date));
  },
  /** İşlemi ve ona bağlı otomatik kontrol randevularını siler. Fotoğraflarda işlem bağı kaldırılır. */
  removeCascade(id) {
    return run(['procedures', 'appointments', 'photos'], 'readwrite', async (s) => {
      const apps = await promisify(s.appointments.index('procedureId').getAll(id));
      apps.filter((a) => a.auto).forEach((a) => s.appointments.delete(a.id));
      apps.filter((a) => !a.auto).forEach((a) => s.appointments.put({ ...a, procedureId: null }));
      const photos = await promisify(s.photos.index('procedureId').getAll(id));
      photos.forEach((ph) => s.photos.put({ ...ph, procedureId: null }));
      s.procedures.delete(id);
    });
  },
};

/* ---------------- Fotoğraflar ---------------- */
/*
 * Görsel verisi IndexedDB'ye Blob değil ArrayBuffer olarak yazılır. Bazı Chromium
 * sürümleri (özellikle Android) Blob yazarken "Error preparing Blob/File data to be
 * stored in object store" hatası verir; ArrayBuffer bu yoldan geçmez. Okurken
 * görünümler için Blob'a çevrilir; eski kayıtlardaki Blob'lar da olduğu gibi çalışır.
 */
const PHOTO_MIME = 'image/jpeg';
async function dehydrate(v) { return v instanceof Blob ? await v.arrayBuffer() : v; }
function hydrate(v, mime) { return v instanceof ArrayBuffer ? new Blob([v], { type: mime || PHOTO_MIME }) : v; }
function hydratePhoto(p) { return p ? { ...p, blob: hydrate(p.blob, p.mime), thumb: hydrate(p.thumb, p.mime) } : p; }
async function dehydratePhoto(p) {
  const mime = p.mime || (p.blob instanceof Blob && p.blob.type) || PHOTO_MIME;
  return { ...p, mime, blob: await dehydrate(p.blob), thumb: await dehydrate(p.thumb) };
}

const _photos = baseStore('photos');
export const Photos = {
  ..._photos,
  all: async () => (await _photos.all()).map(hydratePhoto),
  get: async (id) => hydratePhoto(await _photos.get(id)),
  byIndex: async (idx, val) => (await _photos.byIndex(idx, val)).map(hydratePhoto),
  async save(p) {
    const obj = await dehydratePhoto(stamp(p));
    await _photos.put(obj);
    return hydratePhoto(obj);
  },
  async byPatient(patientId) {
    const list = await Photos.byIndex('patientId', patientId);
    return list.sort((a, b) => (b.date || '').localeCompare(a.date || '') || b.createdAt.localeCompare(a.createdAt));
  },
  async countByPatient(patientId) {
    return run('photos', 'readonly', (s) => promisify(s.index('patientId').count(patientId)));
  },
  async allTags() {
    const all = await _photos.all();
    const set = new Set();
    all.forEach((p) => (p.tags || []).forEach((t) => set.add(t)));
    return [...set].sort((a, b) => a.localeCompare(b, 'tr'));
  },
};

/* ---------------- Randevular ---------------- */
const _appointments = baseStore('appointments');
export const Appointments = {
  ..._appointments,
  save: (a) => _appointments.put(stamp(a)),
  saveMany(list) {
    const stamped = list.map(stamp);
    return run('appointments', 'readwrite', (s) => { stamped.forEach((a) => s.put(a)); return stamped; });
  },
  async byPatient(patientId) {
    const list = await _appointments.byIndex('patientId', patientId);
    return list.sort((a, b) => a.date.localeCompare(b.date));
  },
  async byRange(fromISO, toISO) {
    return run('appointments', 'readonly', (s) =>
      promisify(s.index('date').getAll(IDBKeyRange.bound(fromISO, toISO))));
  },
  async allSorted() {
    const list = await _appointments.all();
    return list.sort((a, b) => a.date.localeCompare(b.date));
  },
};

/* ---------------- Ayarlar ---------------- */
const _settings = baseStore('settings');
export const Settings = {
  async get(key, fallback = null) {
    const r = await _settings.get(key);
    return r ? r.value : fallback;
  },
  set: (key, value) => _settings.put({ key, value }),
  remove: (key) => _settings.remove(key),
};

/* ---------------- Toplu işlemler ---------------- */
export async function clearAllData({ keepSettings = true } = {}) {
  const names = ['patients', 'procedures', 'photos', 'appointments'];
  if (!keepSettings) names.push('settings');
  return run(names, 'readwrite', (s) => { names.forEach((n) => s[n].clear()); });
}

export async function counts() {
  const [patients, procedures, photos, appointments] = await Promise.all([
    _patients.count(), _procedures.count(), _photos.count(), _appointments.count(),
  ]);
  return { patients, procedures, photos, appointments };
}

function blobToDataURL(blob) {
  return new Promise((res, rej) => {
    const fr = new FileReader();
    fr.onload = () => res(fr.result);
    fr.onerror = () => rej(fr.error);
    fr.readAsDataURL(blob);
  });
}

async function dataURLToBuffer(url) {
  const r = await fetch(url);
  return r.arrayBuffer();
}

/** Eski kayıtlardaki Blob'ları ArrayBuffer'a çevirir (bir kez, arka planda). */
export async function migratePhotoBlobs() {
  const all = await _photos.all();
  for (const p of all) {
    if (p.blob instanceof Blob || p.thumb instanceof Blob) await _photos.put(await dehydratePhoto(p));
  }
}

/** Tüm veriyi JSON'a dönüştürülebilir düz nesne olarak verir (fotoğraflar base64). */
export async function exportAll() {
  const [patients, procedures, photos, appointments, settings] = await Promise.all([
    _patients.all(), _procedures.all(), _photos.all(), _appointments.all(), _settings.all(),
  ]);
  const photosOut = [];
  for (const p of photos) {
    photosOut.push({
      ...p,
      blob: p.blob ? await blobToDataURL(hydrate(p.blob, p.mime)) : null,
      thumb: p.thumb ? await blobToDataURL(hydrate(p.thumb, p.mime)) : null,
    });
  }
  return {
    app: 'hasta-takip',
    schema: DB_VERSION,
    exportedAt: nowISO(),
    patients, procedures, appointments,
    photos: photosOut,
    settings: settings.filter((s) => s.key !== 'pin'),
  };
}

/** Yedek dosyasından veriyi geri yükler. replace=true ise mevcut veriyi siler. */
export async function importAll(data, { replace = true } = {}) {
  if (!data || data.app !== 'hasta-takip') throw new Error('Geçersiz yedek dosyası.');
  const photos = [];
  for (const p of data.photos || []) {
    photos.push({
      ...p,
      mime: p.mime || PHOTO_MIME,
      blob: p.blob ? await dataURLToBuffer(p.blob) : null,
      thumb: p.thumb ? await dataURLToBuffer(p.thumb) : null,
    });
  }
  const names = ['patients', 'procedures', 'photos', 'appointments', 'settings'];
  return run(names, 'readwrite', (s) => {
    if (replace) ['patients', 'procedures', 'photos', 'appointments'].forEach((n) => s[n].clear());
    (data.patients || []).forEach((x) => s.patients.put(x));
    (data.procedures || []).forEach((x) => s.procedures.put(x));
    (data.appointments || []).forEach((x) => s.appointments.put(x));
    photos.forEach((x) => s.photos.put(x));
    (data.settings || []).filter((x) => x.key !== 'pin').forEach((x) => s.settings.put(x));
  });
}
