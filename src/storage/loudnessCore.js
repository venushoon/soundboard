// 라우드니스 보정 순수 계산 — 서버(server/loudness.js)의 computeGainDb와 같은 규칙.
// 브라우저 저장 모드에서 서버 없이도 동일한 게인 계산을 쓰기 위해 클라이언트에 둔 사본.
export const TARGET_LUFS = -16;
export const PEAK_CEILING_DBTP = -1;
export const MAX_BOOST_DB = 12;
export const MAX_CUT_DB = -30;
export const TRIM_MIN_DB = -20;
export const TRIM_MAX_DB = 20;

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
  if (!Number.isFinite(n)) return 0;
  return Math.max(TRIM_MIN_DB, Math.min(TRIM_MAX_DB, n));
}
