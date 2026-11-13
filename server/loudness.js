// 음량 분석 (ITU-R BS.1770) — ffmpeg loudnorm으로 통합 음량(LUFS)과 트루피크를 재고,
// 짧은 효과음(통합 음량이 잡히지 않는 경우)은 ebur128 순간 음량 최대값으로 대체한다.
// 피크가 아니라 음량 기준으로 맞춰야 귀로 듣는 크기가 균일해진다.
import { execFile } from 'node:child_process';

export const TARGET_LUFS = -16;          // 사운드보드 기준 음량
export const PEAK_CEILING_DBTP = -1;     // 보정 후 트루피크 상한
export const MAX_BOOST_DB = 12;          // 과증폭(노이즈 증가) 방지 상한
export const MAX_CUT_DB = -30;
export const TRIM_MIN_DB = -20;
export const TRIM_MAX_DB = 20;

const runFfmpeg = (args) => new Promise((resolve) => {
  execFile('ffmpeg', args, { timeout: 120000, maxBuffer: 64 * 1024 * 1024 }, (err, stdout, stderr) => {
    resolve(String(stderr || stdout || ''));
  });
});

function parseDuration(stderr) {
  const m = stderr.match(/Duration:\s*(\d+):(\d+):([\d.]+)/);
  if (!m) return null;
  return (+m[1]) * 3600 + (+m[2]) * 60 + parseFloat(m[3]);
}

const round1 = (v) => (v === null || v === undefined || !Number.isFinite(v) ? null : Math.round(v * 10) / 10);

// 파일 1개의 음량을 측정한다. 측정 불가(무음 등)면 lufs=null.
export async function analyzeLoudness(filePath) {
  const err1 = await runFfmpeg(['-hide_banner', '-i', filePath, '-filter:a', 'loudnorm=print_format=json', '-f', 'null', '-']);
  const durationSec = parseDuration(err1);
  let lufs = null;
  let truePeakDb = null;
  let method = null;
  const jStart = err1.lastIndexOf('{');
  const jEnd = err1.lastIndexOf('}');
  if (jStart >= 0 && jEnd > jStart) {
    try {
      const d = JSON.parse(err1.slice(jStart, jEnd + 1));
      const tp = parseFloat(d.input_tp);
      if (Number.isFinite(tp)) truePeakDb = tp;
      const i = parseFloat(d.input_i);
      if (Number.isFinite(i)) { lufs = i; method = 'integrated'; }
    } catch { /* 파싱 실패 시 아래 fallback */ }
  }
  // 통합 음량이 안 잡히는 짧은 소리: 순간 음량(400ms 창) 최대값으로 대체.
  // 단, 0.4초 미만이면 창이 비어 있어 바닥값(-120.7)만 나오므로 그 경우 RMS로 넘어간다.
  if (lufs === null) {
    const err2 = await runFfmpeg(['-hide_banner', '-i', filePath, '-filter:a', 'ebur128=framelog=info', '-f', 'null', '-']);
    const vals = [...err2.matchAll(/M:\s*(-?[\d.]+)/g)].map(m => parseFloat(m[1])).filter(Number.isFinite);
    if (vals.length && Math.max(...vals) > -70) { lufs = Math.max(...vals); method = 'momentary'; }
  }
  // 그래도 안 되면 전체 RMS 레벨을 음량 근사값으로 사용 (아주 짧은 효과음용)
  if (lufs === null) {
    const err3 = await runFfmpeg(['-hide_banner', '-i', filePath, '-filter:a', 'astats', '-f', 'null', '-']);
    const rms = [...err3.matchAll(/RMS level dB:\s*(-?[\d.]+)/g)].map(m => parseFloat(m[1])).filter(Number.isFinite);
    if (rms.length) { lufs = rms[rms.length - 1]; method = 'rms'; }
  }
  return {
    lufs: round1(lufs),
    truePeakDb: round1(truePeakDb),
    method,
    durationSec: durationSec ? Math.round(durationSec * 100) / 100 : null,
  };
}

// 측정값 + 사용자 설정(normalize on/off, 수동 trimDb)으로 실제 적용 게인(dB)을 계산한다.
export function computeGainDb(sound) {
  const trim = typeof sound.trimDb === 'number' && Number.isFinite(sound.trimDb) ? sound.trimDb : 0;
  let gain = trim;
  if (sound.normalize !== false && typeof sound.loudnessLufs === 'number') {
    let auto = TARGET_LUFS - sound.loudnessLufs;
    auto = Math.max(MAX_CUT_DB, Math.min(MAX_BOOST_DB, auto));
    if (typeof sound.truePeakDb === 'number') {
      auto = Math.min(auto, PEAK_CEILING_DBTP - sound.truePeakDb);
    }
    gain = auto + trim;
  }
  return Math.round(gain * 10) / 10;
}

export function clampTrimDb(v) {
  const n = Math.round(Number(v) * 2) / 2; // 0.5dB 단위
  return Math.max(TRIM_MIN_DB, Math.min(TRIM_MAX_DB, n));
}
