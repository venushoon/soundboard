// 브라우저 저장 모드 API — 서버 저장 모드(serverApi.js)와 같은 인터페이스를
// IndexedDB(파일) + localStorage(메타데이터)로 구현한다.
// GitHub Pages 같은 정적 호스팅에서 서버 없이 동작하기 위한 모드이며,
// 데이터는 그 브라우저에만 저장된다(원래 GitHub 버전의 방식).
import { computeGainDb, clampTrimDb } from './loudnessCore.js';
import { measureLoudness, decodeBlob } from './browserLoudness.js';
import { synthSeedBlob, audioBufferToWavBlob, sliceBuffer } from './seedSynth.js';
import { loadAllSoundFiles } from '../db.js';
import { STORAGE_KEY, CUE_KEY } from '../constants.js';

const META_KEY = 'soundboard_local_db_v1';
const IDB_NAME = 'soundboard_local';
const IDB_STORE = 'files';

// 서버 DEFAULT_BOARD와 같은 기본 자판
const DEFAULT_BOARD = [
  ['KeyQ', '정답 딩동댕', false], ['KeyW', '오답 땡', false], ['KeyE', '박수 함성', false], ['KeyR', '환호성', false], ['KeyT', '빈 키 T', false],
  ['KeyA', '두구두구', false], ['KeyS', '웃음 소리', false], ['KeyD', '등장 효과음', false], ['KeyF', '빠밤!', false], ['KeyG', '빈 키 G', false],
  ['KeyZ', '띠로링', false], ['KeyX', '뿅 (점프)', false], ['KeyC', '빰빠밤', false], ['KeyV', '휘리릭', false], ['KeyB', '빈 키 B', false],
  ['Numpad7', '메인 테마', true], ['Numpad8', '마을 배경음', true], ['Numpad9', '전투/긴장', true],
  ['Numpad4', '슬픈 장면', true], ['Numpad5', '회상 씬', true], ['Numpad6', '엔딩 크레딧', true],
  ['Numpad1', '쉬는 시간', true], ['Numpad2', '행사 시작', true], ['Numpad3', '시상식', true],
].map(([code, soundLabel, loop]) => ({ code, soundId: null, soundLabel, loop, volume: 1.0 }));

// ---------- IndexedDB (파일 저장) ----------
function openIDB() {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(IDB_NAME, 1);
    req.onupgradeneeded = () => {
      if (!req.result.objectStoreNames.contains(IDB_STORE)) req.result.createObjectStore(IDB_STORE);
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}
async function idbPut(id, blob) {
  const db = await openIDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(IDB_STORE, 'readwrite');
    tx.objectStore(IDB_STORE).put(blob, id);
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
}
async function idbGet(id) {
  const db = await openIDB();
  return new Promise((resolve, reject) => {
    const req = db.transaction(IDB_STORE, 'readonly').objectStore(IDB_STORE).get(id);
    req.onsuccess = () => resolve(req.result || null);
    req.onerror = () => reject(req.error);
  });
}
async function idbDelete(id) {
  const db = await openIDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(IDB_STORE, 'readwrite');
    tx.objectStore(IDB_STORE).delete(id);
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
}

// ---------- 메타데이터 ----------
let meta = null;
let idCounter = 0;
const newId = (prefix) => `${prefix}_${Date.now().toString(36)}_${++idCounter}`;

function persist() {
  try { localStorage.setItem(META_KEY, JSON.stringify(meta)); } catch { /* 용량 초과 등은 무시 */ }
}
function loadMeta() {
  if (meta) return meta;
  try {
    const raw = localStorage.getItem(META_KEY);
    if (raw) { meta = JSON.parse(raw); return meta; }
  } catch { /* ignore */ }
  meta = {
    version: 1, seeded: false,
    categories: [], sounds: [],
    board: { mappings: structuredClone(DEFAULT_BOARD), sfxVolume: 1.0, sfxBank: 'A', banks: null },
    cueList: [],
  };
  return meta;
}
function ensureCategoryByName(name) {
  const m = loadMeta();
  let cat = m.categories.find((c) => c.name === name);
  if (!cat) {
    cat = { id: newId('cat'), name, folder: name };
    m.categories.push(cat);
  }
  return cat;
}

async function analyzeAndFill(sound, blob) {
  try {
    const r = await measureLoudness(blob);
    sound.loudnessLufs = r.loudnessLufs;
    sound.truePeakDb = r.truePeakDb;
    sound.loudnessMethod = r.loudnessMethod;
    sound.durationSec = r.durationSec;
  } catch {
    sound.loudnessLufs = null; sound.truePeakDb = null; sound.loudnessMethod = null; sound.durationSec = null;
  }
  sound.gainDb = computeGainDb(sound);
}

async function addSound({ blob, categoryName, type, name, isExample = false }) {
  const m = loadMeta();
  const cat = ensureCategoryByName(categoryName || '미분류');
  const sound = {
    id: newId('snd'), categoryId: cat.id, name: name || '사운드',
    fileName: '', url: '', type: type || 'sfx', size: blob.size,
    isExample, createdAt: new Date().toISOString(),
    loudnessLufs: null, truePeakDb: null, loudnessMethod: null, durationSec: null,
    normalize: true, trimDb: 0, gainDb: 0,
  };
  await idbPut(sound.id, blob);
  await analyzeAndFill(sound, blob);
  m.sounds.push(sound);
  persist();
  return sound;
}

// ---------- 시드 ----------
async function fetchSeedFile(url) {
  const res = await fetch(url);
  if (!res.ok) throw new Error(`seed fetch ${res.status}`);
  return res.blob();
}

async function realRecordingBlob(kind) {
  // 박수: Freesound 277021 (CC0) / 환호성: Hurray.ogg (퍼블릭 도메인) — Wikimedia Commons 미러
  const src = kind === 'applause'
    ? { url: 'https://upload.wikimedia.org/wikipedia/commons/6/6d/277021_sandermotions_applause-2.wav', from: 0.9, to: 5.7 }
    : { url: 'https://upload.wikimedia.org/wikipedia/commons/e/e8/Hurray.ogg', from: 0.1, to: 3.4 };
  const blob = await fetchSeedFile(src.url);
  const buffer = await decodeBlob(blob);
  return audioBufferToWavBlob(sliceBuffer(buffer, src.from, src.to));
}

async function seedBlobFor(item) {
  const base = import.meta.env.BASE_URL || '/';
  if (item.file === 'wind.mp3' || item.file === 'heartbeat.mp3') {
    return fetchSeedFile(`${base}sound/${item.file}`);
  }
  if (item.file === 'applause.mp3' || item.file === 'cheer.mp3') {
    try { return await realRecordingBlob(item.file === 'applause.mp3' ? 'applause' : 'cheer'); }
    catch { return synthSeedBlob(item.file); }
  }
  const synth = await synthSeedBlob(item.file);
  if (synth) return synth;
  return fetchSeedFile(`${base}seeds/${item.file}`);
}

async function seedFromManifest() {
  const base = import.meta.env.BASE_URL || '/';
  const manifest = await (await fetch(`${base}seeds/manifest.json`)).json();
  const m = loadMeta();
  for (const name of manifest.categories || []) ensureCategoryByName(name);
  const boardByCode = {};
  for (const item of manifest.sounds || []) {
    try {
      const blob = await seedBlobFor(item);
      if (!blob) continue;
      const sound = await addSound({ blob, categoryName: item.category, type: item.type, name: item.name, isExample: true });
      if (item.boardCode) boardByCode[item.boardCode] = { soundId: sound.id, label: item.boardLabel };
    } catch { /* 개별 시드 실패는 건너뜀 */ }
  }
  for (const mp of m.board.mappings) {
    const seed = boardByCode[mp.code];
    if (seed) { mp.soundId = seed.soundId; if (seed.label) mp.soundLabel = seed.label; }
  }
  m.seeded = true;
  persist();
}

// 예전 GitHub 버전(브라우저 저장) 사용자의 데이터를 새 구조로 가져오기
async function importLegacyIfAny() {
  let blobs = {};
  try { blobs = await loadAllSoundFiles(); } catch { blobs = {}; }
  const codes = Object.keys(blobs || {});
  if (!codes.length) return false;
  const m = loadMeta();
  let settings = [];
  try { settings = JSON.parse(localStorage.getItem(STORAGE_KEY) || '[]'); } catch { settings = []; }
  const settingOf = (code) => (Array.isArray(settings) ? settings.find((s) => s && s.code === code) : null);
  const idByCode = {};
  for (const code of codes) {
    const blob = blobs[code];
    if (!blob) continue;
    const st = settingOf(code);
    const isLocal = code.startsWith('local_');
    const type = st?.type === 'bgm' || st?.type === 'sfx' ? st.type : (code.startsWith('Numpad') || isLocal ? 'bgm' : 'sfx');
    const categoryName = isLocal ? '큐 음원' : (type === 'bgm' ? '배경음악' : '효과음');
    const sound = await addSound({ blob, categoryName, type, name: st?.soundLabel || code });
    idByCode[code] = sound.id;
  }
  for (const mp of m.board.mappings) {
    const id = idByCode[mp.code];
    if (!id) continue;
    const st = settingOf(mp.code);
    mp.soundId = id;
    if (st?.soundLabel) mp.soundLabel = st.soundLabel;
    if (typeof st?.loop === 'boolean') mp.loop = st.loop;
    if (typeof st?.volume === 'number') mp.volume = st.volume;
  }
  try {
    const cues = JSON.parse(localStorage.getItem(CUE_KEY) || '[]');
    if (Array.isArray(cues)) {
      m.cueList = cues.map((it) => (it && it.code && idByCode[it.code] ? { ...it, soundId: idByCode[it.code] } : it));
    }
  } catch { /* ignore */ }
  m.seeded = true;
  persist();
  return true;
}

let seedPromise = null;
function ensureSeeded() {
  if (loadMeta().seeded) return Promise.resolve();
  if (!seedPromise) {
    seedPromise = (async () => {
      const imported = await importLegacyIfAny().catch(() => false);
      if (!imported) await seedFromManifest().catch(() => { loadMeta().seeded = true; persist(); });
    })();
  }
  return seedPromise;
}

// ---------- API (serverApi와 동일 인터페이스) ----------
export const localApi = {
  async getState() {
    await ensureSeeded();
    const m = loadMeta();
    return structuredClone({ categories: m.categories, sounds: m.sounds, board: m.board, cueList: m.cueList });
  },
  async createCategory(name) {
    const m = loadMeta();
    const trimmed = String(name || '').trim();
    if (!trimmed) throw new Error('폴더 이름이 필요합니다');
    if (m.categories.some((c) => c.name === trimmed)) throw new Error('같은 이름의 폴더가 있습니다');
    const cat = { id: newId('cat'), name: trimmed, folder: trimmed };
    m.categories.push(cat);
    persist();
    return structuredClone(cat);
  },
  async renameCategory(id, name) {
    const m = loadMeta();
    const cat = m.categories.find((c) => c.id === id);
    if (!cat) throw new Error('폴더 없음');
    cat.name = String(name || '').trim() || cat.name;
    cat.folder = cat.name;
    persist();
    return { ok: true };
  },
  async deleteCategory(id) {
    const m = loadMeta();
    const idx = m.categories.findIndex((c) => c.id === id);
    if (idx < 0) throw new Error('폴더 없음');
    const fallback = ensureCategoryByName('미분류');
    if (fallback.id === id) throw new Error('미분류 폴더는 삭제할 수 없습니다');
    for (const s of m.sounds) if (s.categoryId === id) s.categoryId = fallback.id;
    m.categories.splice(idx, 1);
    persist();
    return { ok: true, movedTo: fallback.id };
  },
  async uploadSound({ file, categoryId, categoryName, type, name }) {
    const m = loadMeta();
    let catName = categoryName;
    if (!catName && categoryId) catName = m.categories.find((c) => c.id === categoryId)?.name;
    const sound = await addSound({
      blob: file,
      categoryName: catName || '미분류',
      type,
      name: name || (file?.name ? file.name.replace(/\.[^.]+$/, '') : '사운드'),
    });
    return structuredClone(sound);
  },
  async updateSound(id, patch) {
    const m = loadMeta();
    const sound = m.sounds.find((s) => s.id === id);
    if (!sound) throw new Error('사운드 없음');
    if (typeof patch.name === 'string' && patch.name.trim()) sound.name = patch.name.trim();
    if (patch.categoryId && m.categories.some((c) => c.id === patch.categoryId)) sound.categoryId = patch.categoryId;
    if (typeof patch.normalize === 'boolean') sound.normalize = patch.normalize;
    if (patch.trimDb !== undefined) sound.trimDb = clampTrimDb(patch.trimDb);
    sound.gainDb = computeGainDb(sound);
    persist();
    return structuredClone(sound);
  },
  async deleteSound(id) {
    const m = loadMeta();
    const idx = m.sounds.findIndex((s) => s.id === id);
    if (idx < 0) throw new Error('사운드 없음');
    m.sounds.splice(idx, 1);
    const clearFrom = (arr) => { if (Array.isArray(arr)) for (const e of arr) if (e && e.soundId === id) e.soundId = null; };
    clearFrom(m.board.mappings);
    if (m.board.banks) { clearFrom(m.board.banks.A); clearFrom(m.board.banks.B); }
    for (const it of m.cueList) if (it && it.soundId === id) it.soundId = null;
    persist();
    await idbDelete(id).catch(() => {});
    return { ok: true };
  },
  async analyzeAll() {
    const m = loadMeta();
    let updated = 0;
    for (const sound of m.sounds) {
      if (typeof sound.loudnessLufs === 'number') continue;
      const blob = await idbGet(sound.id).catch(() => null);
      if (!blob) continue;
      await analyzeAndFill(sound, blob);
      updated++;
    }
    persist();
    return { ok: true, updated };
  },
  async saveBoard(board) {
    const m = loadMeta();
    m.board = {
      mappings: Array.isArray(board?.mappings) ? board.mappings : m.board.mappings,
      sfxVolume: typeof board?.sfxVolume === 'number' ? board.sfxVolume : m.board.sfxVolume,
      sfxBank: board?.sfxBank === 'B' ? 'B' : 'A',
      banks: board?.banks && typeof board.banks === 'object' ? board.banks : m.board.banks,
    };
    persist();
    return { ok: true };
  },
  async saveCues(cueList) {
    const m = loadMeta();
    m.cueList = Array.isArray(cueList) ? cueList : [];
    persist();
    return { ok: true };
  },
  async fetchSoundBlob(soundId) {
    const blob = await idbGet(soundId);
    if (!blob) throw new Error('사운드 파일을 불러올 수 없습니다');
    return blob;
  },
};
