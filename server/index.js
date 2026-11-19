/* eslint-disable no-undef */
// 사운드보드 서버 — 파일은 DATA_DIR/files/<카테고리 폴더>/<파일> 에 실제로 저장되고,
// 메타데이터(카테고리/사운드/자판 배치/큐 목록)는 DATA_DIR/db.json 한 파일로 관리한다.
// 브라우저 저장(IndexedDB/localStorage)에 의존하지 않으므로 기기를 바꿔도 그대로 복원된다.
import express from 'express';
import multer from 'multer';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { analyzeLoudness, computeGainDb, clampTrimDb, TARGET_LUFS } from './loudness.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const APP_DIR = path.join(__dirname, '..');
const DATA_DIR = process.env.DATA_DIR || path.join(APP_DIR, 'data');
const FILES_DIR = path.join(DATA_DIR, 'files');
const DB_PATH = path.join(DATA_DIR, 'db.json');
const SEEDS_DIR = path.join(APP_DIR, 'public', 'seeds');
const DIST_DIR = path.join(APP_DIR, 'dist');
const PORT = process.env.PORT || 8900;

const ALLOWED_EXT = new Set(['.mp3', '.wav', '.ogg', '.oga', '.m4a', '.aac', '.flac', '.webm', '.opus']);
let seq = 1;
const newId = (prefix) => `${prefix}_${Date.now().toString(36)}_${(seq++).toString(36)}`;

function sanitizeFolder(name) {
  const cleaned = String(name || '').trim().replace(/[\\/:*?"<>|]/g, '_').replace(/\s+/g, ' ').slice(0, 60);
  return cleaned || '미분류';
}
function sanitizeBase(name) {
  return String(name || 'sound').trim().replace(/[\\/:*?"<>|]/g, '_').slice(0, 80) || 'sound';
}

// 프론트엔드 INITIAL_MAPPINGS와 같은 기본 자판 (서버가 비어 있을 때 초기값)
const DEFAULT_BOARD = [
  ['KeyQ', '정답 딩동댕', false], ['KeyW', '오답 땡', false], ['KeyE', '박수 함성', false], ['KeyR', '환호성', false], ['KeyT', '빈 키 T', false],
  ['KeyA', '두구두구', false], ['KeyS', '웃음 소리', false], ['KeyD', '등장 효과음', false], ['KeyF', '빠밤!', false], ['KeyG', '빈 키 G', false],
  ['KeyZ', '띠로링', false], ['KeyX', '뿅 (점프)', false], ['KeyC', '빰빠밤', false], ['KeyV', '휘리릭', false], ['KeyB', '빈 키 B', false],
  ['Numpad7', '메인 테마', true], ['Numpad8', '마을 배경음', true], ['Numpad9', '전투/긴장', true],
  ['Numpad4', '슬픈 장면', true], ['Numpad5', '회상 씬', true], ['Numpad6', '엔딩 크레딧', true],
  ['Numpad1', '쉬는 시간', true], ['Numpad2', '행사 시작', true], ['Numpad3', '시상식', true],
].map(([code, soundLabel, loop]) => ({ code, soundId: null, soundLabel, loop, volume: 1.0 }));

// ---------- DB ----------
let db = null;
function saveDB() {
  const tmp = DB_PATH + '.tmp';
  fs.writeFileSync(tmp, JSON.stringify(db, null, 1));
  fs.renameSync(tmp, DB_PATH);
}
function categoryFolder(cat) { return path.join(FILES_DIR, cat.folder); }
function soundPath(sound) {
  const cat = db.categories.find(c => c.id === sound.categoryId);
  if (!cat) return null;
  return path.join(FILES_DIR, cat.folder, sound.fileName);
}
function uniqueFolder(base, excludeId = null) {
  let folder = base; let n = 2;
  while (db.categories.some(c => c.folder === folder && c.id !== excludeId)) folder = `${base}_${n++}`;
  return folder;
}
function ensureCategoryByName(name) {
  let cat = db.categories.find(c => c.name === name);
  if (!cat) {
    cat = { id: newId('cat'), name, folder: uniqueFolder(sanitizeFolder(name)) };
    db.categories.push(cat);
    fs.mkdirSync(categoryFolder(cat), { recursive: true });
  }
  return cat;
}

function seedIfEmpty() {
  if (db && db.seeded) return;
  const manifestPath = path.join(SEEDS_DIR, 'manifest.json');
  if (!fs.existsSync(manifestPath)) { db.seeded = true; saveDB(); return; }
  const manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf8'));
  for (const name of manifest.categories || []) ensureCategoryByName(name);
  const boardByCode = {};
  for (const item of manifest.sounds || []) {
    const src = path.join(SEEDS_DIR, item.file);
    if (!fs.existsSync(src)) continue;
    const cat = ensureCategoryByName(item.category);
    const id = newId('snd');
    const ext = path.extname(item.file).toLowerCase();
    const fileName = `${id}__${sanitizeBase(item.name)}${ext}`;
    fs.copyFileSync(src, path.join(categoryFolder(cat), fileName));
    db.sounds.push({
      id, categoryId: cat.id, name: item.name, fileName,
      type: item.type || 'sfx', size: fs.statSync(src).size,
      isExample: true, createdAt: new Date().toISOString(),
      normalize: true, trimDb: 0, gainDb: 0, fadeInSec: 0, fadeOutSec: 0, startSec: 0, endSec: null,
    });
    if (item.boardCode) boardByCode[item.boardCode] = { soundId: id, label: item.boardLabel || null };
  }
  for (const m of db.board.mappings) {
    const seed = boardByCode[m.code];
    if (seed) { m.soundId = seed.soundId; if (seed.label) m.soundLabel = seed.label; }
  }
  db.seeded = true;
  saveDB();
  console.log(`[seed] 예시 사운드 ${Object.keys(boardByCode).length}개 자판 배치 완료`);
}

function loadDB() {
  fs.mkdirSync(FILES_DIR, { recursive: true });
  if (fs.existsSync(DB_PATH)) {
    db = JSON.parse(fs.readFileSync(DB_PATH, 'utf8'));
  } else {
    db = { version: 1, seeded: false, categories: [], sounds: [], board: { mappings: [], sfxVolume: 1.0, sfxBank: 'A', banks: null }, cueList: [] };
  }
  if (!Array.isArray(db.categories)) db.categories = [];
  if (!Array.isArray(db.sounds)) db.sounds = [];
  if (!db.board) db.board = { mappings: [], sfxVolume: 1.0, sfxBank: 'A', banks: null };
  if (!Array.isArray(db.board.mappings) || db.board.mappings.length === 0) {
    db.board.mappings = DEFAULT_BOARD.map(m => ({ ...m }));
  }
  if (!Array.isArray(db.cueList)) db.cueList = [];
  for (const cat of db.categories) fs.mkdirSync(categoryFolder(cat), { recursive: true });
  seedIfEmpty();
}

// ---------- app ----------
const app = express();
app.use(express.json({ limit: '2mb' }));
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 200 * 1024 * 1024 },
});

const publicSound = (s) => ({
  id: s.id, categoryId: s.categoryId, name: s.name, type: s.type,
  size: s.size, isExample: !!s.isExample, createdAt: s.createdAt,
  url: `/api/sounds/${s.id}/file`,
  // 음량 정규화: 측정값 + 사용자 설정 + 최종 적용 게인(dB)
  loudnessLufs: typeof s.loudnessLufs === 'number' ? s.loudnessLufs : null,
  truePeakDb: typeof s.truePeakDb === 'number' ? s.truePeakDb : null,
  loudnessMethod: s.loudnessMethod || null,
  durationSec: typeof s.durationSec === 'number' ? s.durationSec : null,
  normalize: s.normalize !== false,
  trimDb: typeof s.trimDb === 'number' ? s.trimDb : 0,
  gainDb: typeof s.gainDb === 'number' ? s.gainDb : 0,
  // 재생 구간·페이드 (사운드별): 초 단위, endSec null = 끝까지
  fadeInSec: typeof s.fadeInSec === 'number' ? s.fadeInSec : 0,
  fadeOutSec: typeof s.fadeOutSec === 'number' ? s.fadeOutSec : 0,
  startSec: typeof s.startSec === 'number' ? s.startSec : 0,
  endSec: typeof s.endSec === 'number' ? s.endSec : null,
});

// 사운드 파일을 분석해 측정값과 적용 게인을 레코드에 채운다. 실패해도 앱은 계속 동작한다.
async function analyzeInto(sound) {
  const p = soundPath(sound);
  if (!p || !fs.existsSync(p)) return false;
  try {
    const r = await analyzeLoudness(p);
    sound.loudnessLufs = r.lufs;
    sound.truePeakDb = r.truePeakDb;
    sound.loudnessMethod = r.method;
    sound.durationSec = r.durationSec;
    sound.loudnessAnalyzed = true;
    sound.gainDb = computeGainDb(sound);
    return true;
  } catch (e) {
    console.warn('[loudness] 분석 실패', sound.name, e?.message || e);
    return false;
  }
}

// 아직 분석 안 된 사운드(기존 데이터 포함)를 기동 시 한 번씩 분석한다.
async function analyzeMissing() {
  const targets = db.sounds.filter(s => s.loudnessAnalyzed !== true);
  if (!targets.length) return;
  console.log(`[loudness] 미분석 사운드 ${targets.length}개 분석 시작`);
  for (const s of targets) await analyzeInto(s);
  saveDB();
  console.log('[loudness] 미분석 사운드 분석 완료');
}

app.get('/api/health', (req, res) => res.json({ ok: true, sounds: db.sounds.length, categories: db.categories.length }));

app.get('/api/state', (req, res) => {
  res.json({
    categories: db.categories,
    sounds: db.sounds.map(publicSound),
    board: db.board,
    cueList: db.cueList,
  });
});

app.get('/api/stats', (req, res) => {
  const totalBytes = db.sounds.reduce((a, s) => a + (s.size || 0), 0);
  res.json({ sounds: db.sounds.length, categories: db.categories.length, totalBytes });
});

// ----- categories (폴더) -----
app.post('/api/categories', (req, res) => {
  const name = sanitizeFolder(req.body?.name);
  if (db.categories.some(c => c.name === name)) return res.status(409).json({ error: '같은 이름의 폴더가 이미 있습니다' });
  const cat = { id: newId('cat'), name, folder: uniqueFolder(name) };
  db.categories.push(cat);
  fs.mkdirSync(categoryFolder(cat), { recursive: true });
  saveDB();
  res.status(201).json(cat);
});

app.patch('/api/categories/:id', (req, res) => {
  const cat = db.categories.find(c => c.id === req.params.id);
  if (!cat) return res.status(404).json({ error: '폴더 없음' });
  const name = sanitizeFolder(req.body?.name);
  if (!name) return res.status(400).json({ error: '이름이 비었습니다' });
  if (db.categories.some(c => c.name === name && c.id !== cat.id)) return res.status(409).json({ error: '같은 이름의 폴더가 이미 있습니다' });
  const oldDir = categoryFolder(cat);
  cat.name = name;
  cat.folder = uniqueFolder(name, cat.id);
  const newDir = categoryFolder(cat);
  if (oldDir !== newDir && fs.existsSync(oldDir)) fs.renameSync(oldDir, newDir);
  fs.mkdirSync(newDir, { recursive: true });
  saveDB();
  res.json(cat);
});

app.delete('/api/categories/:id', (req, res) => {
  const idx = db.categories.findIndex(c => c.id === req.params.id);
  if (idx < 0) return res.status(404).json({ error: '폴더 없음' });
  const cat = db.categories[idx];
  const fallback = ensureCategoryByName('미분류');
  if (fallback.id === cat.id) return res.status(400).json({ error: '미분류 폴더는 삭제할 수 없습니다' });
  // 안에 있던 사운드는 미분류로 이동 (파일도 함께)
  for (const s of db.sounds.filter(s => s.categoryId === cat.id)) {
    const from = soundPath(s);
    s.categoryId = fallback.id;
    const to = soundPath(s);
    if (from && fs.existsSync(from)) fs.renameSync(from, to);
  }
  db.categories.splice(idx, 1);
  const dir = path.join(FILES_DIR, cat.folder);
  if (fs.existsSync(dir) && fs.readdirSync(dir).length === 0) fs.rmdirSync(dir);
  saveDB();
  res.json({ ok: true, movedTo: fallback.id });
});

// ----- sounds -----
app.post('/api/sounds/upload', upload.single('file'), async (req, res) => {
  if (!req.file) return res.status(400).json({ error: '파일이 없습니다' });
  const ext = path.extname(req.file.originalname).toLowerCase();
  if (!ALLOWED_EXT.has(ext)) return res.status(400).json({ error: `지원하지 않는 형식입니다 (${ext || '확장자 없음'})` });
  let cat = db.categories.find(c => c.id === req.body?.categoryId);
  if (!cat && req.body?.categoryName) cat = ensureCategoryByName(String(req.body.categoryName));
  if (!cat) cat = ensureCategoryByName('미분류');
  const id = newId('snd');
  const displayName = sanitizeBase(req.body?.name || path.basename(req.file.originalname, ext));
  const fileName = `${id}__${displayName}${ext}`;
  fs.writeFileSync(path.join(categoryFolder(cat), fileName), req.file.buffer);
  const sound = {
    id, categoryId: cat.id, name: displayName, fileName,
    type: req.body?.type === 'bgm' ? 'bgm' : 'sfx',
    size: req.file.size, isExample: false, createdAt: new Date().toISOString(),
    normalize: true, trimDb: 0, gainDb: 0, fadeInSec: 0, fadeOutSec: 0, startSec: 0, endSec: null,
  };
  db.sounds.push(sound);
  await analyzeInto(sound); // 업로드 즉시 음량 분석 → 기준 음량 보정값 계산
  saveDB();
  res.status(201).json(publicSound(sound));
});

let analyzeAllRunning = false;
app.post('/api/sounds/analyze-all', async (req, res) => {
  if (analyzeAllRunning) return res.status(409).json({ error: '이미 음량 분석이 진행 중입니다' });
  analyzeAllRunning = true;
  try {
    let analyzed = 0;
    for (const s of db.sounds) { if (await analyzeInto(s)) analyzed++; }
    saveDB();
    res.json({ ok: true, analyzed, total: db.sounds.length, targetLufs: TARGET_LUFS });
  } finally {
    analyzeAllRunning = false;
  }
});

app.patch('/api/sounds/:id', (req, res) => {
  const s = db.sounds.find(x => x.id === req.params.id);
  if (!s) return res.status(404).json({ error: '사운드 없음' });
  const from = soundPath(s);
  if (typeof req.body?.name === 'string' && req.body.name.trim()) {
    s.name = sanitizeBase(req.body.name);
    const ext = path.extname(s.fileName);
    s.fileName = `${s.id}__${s.name}${ext}`;
  }
  if (req.body?.type === 'sfx' || req.body?.type === 'bgm') s.type = req.body.type;
  if (typeof req.body?.normalize === 'boolean') s.normalize = req.body.normalize;
  if (typeof req.body?.trimDb === 'number' && Number.isFinite(req.body.trimDb)) s.trimDb = clampTrimDb(req.body.trimDb);
  if (typeof req.body?.normalize === 'boolean' || typeof req.body?.trimDb === 'number') s.gainDb = computeGainDb(s);
  // 재생 구간·페이드: 페이드 0~30초, 시작 0~3600초, 종료는 null(끝까지) 허용
  const clampSec = (v, max) => Math.round(Math.max(0, Math.min(max, Number(v))) * 10) / 10;
  if (typeof req.body?.fadeInSec === 'number' && Number.isFinite(req.body.fadeInSec)) s.fadeInSec = clampSec(req.body.fadeInSec, 30);
  if (typeof req.body?.fadeOutSec === 'number' && Number.isFinite(req.body.fadeOutSec)) s.fadeOutSec = clampSec(req.body.fadeOutSec, 30);
  if (typeof req.body?.startSec === 'number' && Number.isFinite(req.body.startSec)) s.startSec = clampSec(req.body.startSec, 3600);
  if (req.body?.endSec === null) s.endSec = null;
  else if (typeof req.body?.endSec === 'number' && Number.isFinite(req.body.endSec)) s.endSec = clampSec(req.body.endSec, 3600);
  if (req.body?.categoryId && req.body.categoryId !== s.categoryId) {
    const cat = db.categories.find(c => c.id === req.body.categoryId);
    if (!cat) return res.status(400).json({ error: '대상 폴더 없음' });
    s.categoryId = cat.id;
  }
  const to = soundPath(s);
  if (from && to && from !== to && fs.existsSync(from)) fs.renameSync(from, to);
  saveDB();
  res.json(publicSound(s));
});

app.delete('/api/sounds/:id', (req, res) => {
  const idx = db.sounds.findIndex(x => x.id === req.params.id);
  if (idx < 0) return res.status(404).json({ error: '사운드 없음' });
  const s = db.sounds[idx];
  const p = soundPath(s);
  if (p && fs.existsSync(p)) fs.unlinkSync(p);
  db.sounds.splice(idx, 1);
  for (const m of db.board.mappings) if (m.soundId === s.id) m.soundId = null;
  if (db.board.banks) {
    for (const b of ['A', 'B']) {
      const arr = db.board.banks[b];
      if (Array.isArray(arr)) for (const m of arr) if (m.soundId === s.id) m.soundId = null;
    }
  }
  for (const c of db.cueList) if (c.soundId === s.id) c.soundId = null;
  saveDB();
  res.json({ ok: true });
});

app.get('/api/sounds/:id/file', (req, res) => {
  const s = db.sounds.find(x => x.id === req.params.id);
  if (!s) return res.status(404).json({ error: '사운드 없음' });
  const p = soundPath(s);
  if (!p || !fs.existsSync(p)) return res.status(404).json({ error: '파일 없음' });
  // 파일 경로는 사운드 id+이름으로 고유하고 앱 흐름에서 같은 경로의 내용이 바뀌지 않으므로
  // 장기 캐시한다 — 재접속·새로고침 시 음원을 다시 받지 않는다.
  res.set('Cache-Control', 'public, max-age=31536000, immutable');
  res.sendFile(p);
});

// ----- board & cues -----
app.put('/api/board', (req, res) => {
  const { mappings, sfxVolume } = req.body || {};
  const cleanAssign = (arr) => (Array.isArray(arr) ? arr : []).filter(a => a && typeof a.code === 'string').map(a => ({
    code: String(a.code), soundId: a.soundId || null,
    soundLabel: typeof a.soundLabel === 'string' ? a.soundLabel : '',
    loop: !!a.loop, volume: typeof a.volume === 'number' ? a.volume : 1.0,
    color: /^bg-[a-z]+-\d{3}$/.test(a.color || '') ? a.color : null,
  }));
  if (Array.isArray(mappings)) db.board.mappings = cleanAssign(mappings);
  if (typeof sfxVolume === 'number') db.board.sfxVolume = sfxVolume;
  // 효과음 뱅크: 현재 뱅크 + 뱅크별 배치(A/B)를 함께 저장한다
  if (req.body?.sfxBank === 'A' || req.body?.sfxBank === 'B') db.board.sfxBank = req.body.sfxBank;
  if (req.body?.banks && typeof req.body.banks === 'object') {
    db.board.banks = { A: cleanAssign(req.body.banks.A), B: cleanAssign(req.body.banks.B) };
  }
  saveDB();
  res.json({ ok: true });
});

app.put('/api/cues', (req, res) => {
  if (Array.isArray(req.body?.cueList)) db.cueList = req.body.cueList;
  saveDB();
  res.json({ ok: true });
});

// ----- static (built frontend) -----
if (fs.existsSync(DIST_DIR)) {
  app.use(express.static(DIST_DIR));
  app.get(/^(?!\/api\/).*/, (req, res) => res.sendFile(path.join(DIST_DIR, 'index.html')));
}

loadDB();
app.listen(PORT, '0.0.0.0', () => {
  console.log(`soundboard server listening on ${PORT}, data=${DATA_DIR}`);
  void analyzeMissing();
});
