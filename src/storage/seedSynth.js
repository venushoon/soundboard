// 브라우저 저장 모드의 예시 사운드 합성 — 서버 모드의 seeds/*.mp3를 대신한다.
// GitHub Pages에는 바이너리 시드 파일을 올릴 수 없어(텍스트만 푸시 가능),
// 짧은 효과음 11종을 WebAudio 오프라인 렌더링으로 그 자리에서 만들어 WAV로 저장한다.
// 바람/심장박동은 레포에 이미 있는 public/sound/*.mp3를 그대로 쓰고,
// 박수/환호성은 실제 녹음(Wikimedia Commons, CC0/퍼블릭도메인)을 받아오며 실패 시 합성으로 폴백한다.

const SR = 44100;

// ---------- WAV 인코더 (16-bit PCM) ----------
export function audioBufferToWavBlob(buffer) {
  const numCh = Math.min(2, buffer.numberOfChannels);
  const len = buffer.length;
  const bytes = 44 + len * numCh * 2;
  const ab = new ArrayBuffer(bytes);
  const v = new DataView(ab);
  const writeStr = (off, s) => { for (let i = 0; i < s.length; i++) v.setUint8(off + i, s.charCodeAt(i)); };
  writeStr(0, 'RIFF'); v.setUint32(4, bytes - 8, true); writeStr(8, 'WAVE');
  writeStr(12, 'fmt '); v.setUint32(16, 16, true); v.setUint16(20, 1, true);
  v.setUint16(22, numCh, true); v.setUint32(24, buffer.sampleRate, true);
  v.setUint32(28, buffer.sampleRate * numCh * 2, true); v.setUint16(32, numCh * 2, true);
  v.setUint16(34, 16, true); writeStr(36, 'data'); v.setUint32(40, len * numCh * 2, true);
  const channels = [];
  for (let ch = 0; ch < numCh; ch++) channels.push(buffer.getChannelData(ch));
  let off = 44;
  for (let i = 0; i < len; i++) {
    for (let ch = 0; ch < numCh; ch++) {
      const s = Math.max(-1, Math.min(1, channels[ch][i]));
      v.setInt16(off, s < 0 ? s * 0x8000 : s * 0x7fff, true);
      off += 2;
    }
  }
  return new Blob([ab], { type: 'audio/wav' });
}

// 버퍼 구간 잘라내기 + 페이드 (실제 녹음 트리밍용)
export function sliceBuffer(buffer, startSec, endSec, fadeInSec = 0.03, fadeOutSec = 0.2) {
  const sr = buffer.sampleRate;
  const start = Math.max(0, Math.floor(startSec * sr));
  const end = Math.min(buffer.length, Math.floor(endSec * sr));
  const len = Math.max(1, end - start);
  const out = new OfflineAudioContext(buffer.numberOfChannels, len, sr);
  const data = out.createBuffer(buffer.numberOfChannels, len, sr);
  const fi = Math.floor(fadeInSec * sr);
  const fo = Math.floor(fadeOutSec * sr);
  for (let ch = 0; ch < buffer.numberOfChannels; ch++) {
    const src = buffer.getChannelData(ch);
    const dst = data.getChannelData(ch);
    for (let i = 0; i < len; i++) {
      let g = 1;
      if (i < fi) g = i / fi;
      if (i > len - fo) g = Math.min(g, (len - i) / fo);
      dst[i] = src[start + i] * g;
    }
  }
  return data;
}

// ---------- 합성 헬퍼 ----------
function makeNoiseBuffer(ctx, seconds) {
  const buf = ctx.createBuffer(1, Math.ceil(seconds * SR), SR);
  const d = buf.getChannelData(0);
  for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
  return buf;
}

async function render(durSec, build) {
  const ctx = new OfflineAudioContext(2, Math.ceil(durSec * SR), SR);
  const master = ctx.createGain();
  master.gain.value = 0.9;
  master.connect(ctx.destination);
  build(ctx, master);
  return ctx.startRendering();
}

function tone(ctx, dest, { freq, freqEnd, type = 'sine', t = 0, dur = 0.3, gain = 0.5, attack = 0.005, curve = 'exp' }) {
  const osc = ctx.createOscillator();
  osc.type = type;
  osc.frequency.setValueAtTime(freq, ctx.currentTime + t);
  if (freqEnd) osc.frequency.exponentialRampToValueAtTime(Math.max(20, freqEnd), ctx.currentTime + t + dur);
  const g = ctx.createGain();
  g.gain.setValueAtTime(0, ctx.currentTime + t);
  g.gain.linearRampToValueAtTime(gain, ctx.currentTime + t + attack);
  if (curve === 'exp') g.gain.exponentialRampToValueAtTime(0.0008, ctx.currentTime + t + dur);
  else g.gain.linearRampToValueAtTime(0, ctx.currentTime + t + dur);
  osc.connect(g); g.connect(dest);
  osc.start(ctx.currentTime + t);
  osc.stop(ctx.currentTime + t + dur + 0.05);
}

function bell(ctx, dest, freq, t, dur, gain) {
  tone(ctx, dest, { freq, t, dur, gain });
  tone(ctx, dest, { freq: freq * 2.756, t, dur: dur * 0.5, gain: gain * 0.35 });
  tone(ctx, dest, { freq: freq * 5.404, t, dur: dur * 0.22, gain: gain * 0.12 });
}

function noiseHit(ctx, dest, { t = 0, dur = 0.1, freq = 1200, q = 1, type = 'bandpass', gain = 0.5 }) {
  const src = ctx.createBufferSource();
  src.buffer = makeNoiseBuffer(ctx, dur + 0.1);
  const f = ctx.createBiquadFilter();
  f.type = type; f.frequency.value = freq; f.Q.value = q;
  const g = ctx.createGain();
  g.gain.setValueAtTime(gain, ctx.currentTime + t);
  g.gain.exponentialRampToValueAtTime(0.0008, ctx.currentTime + t + dur);
  src.connect(f); f.connect(g); g.connect(dest);
  src.start(ctx.currentTime + t);
  src.stop(ctx.currentTime + t + dur + 0.05);
}

function brass(ctx, dest, freq, t, dur, gain = 0.22) {
  for (const detune of [-4, 4]) {
    const osc = ctx.createOscillator();
    osc.type = 'sawtooth';
    osc.frequency.value = freq;
    osc.detune.value = detune;
    const f = ctx.createBiquadFilter();
    f.type = 'lowpass'; f.frequency.value = 2300;
    const g = ctx.createGain();
    g.gain.setValueAtTime(0, ctx.currentTime + t);
    g.gain.linearRampToValueAtTime(gain, ctx.currentTime + t + 0.02);
    g.gain.setValueAtTime(gain, ctx.currentTime + t + Math.max(0.02, dur - 0.08));
    g.gain.exponentialRampToValueAtTime(0.0008, ctx.currentTime + t + dur);
    osc.connect(f); f.connect(g); g.connect(dest);
    osc.start(ctx.currentTime + t);
    osc.stop(ctx.currentTime + t + dur + 0.05);
  }
}

// ---------- 사운드별 합성 ----------
const SYNTHS = {
  'dingdong.mp3': () => render(1.15, (ctx, out) => {
    bell(ctx, out, 1046.5, 0, 0.55, 0.5);
    bell(ctx, out, 1318.5, 0.15, 0.55, 0.5);
    bell(ctx, out, 1568.0, 0.30, 0.8, 0.55);
  }),
  'wrong.mp3': () => render(0.6, (ctx, out) => {
    tone(ctx, out, { freq: 185, freqEnd: 160, type: 'sawtooth', dur: 0.55, gain: 0.28, curve: 'lin' });
    tone(ctx, out, { freq: 174, freqEnd: 152, type: 'sawtooth', dur: 0.55, gain: 0.28, curve: 'lin' });
  }),
  'drumroll.mp3': () => render(1.9, (ctx, out) => {
    let t = 0;
    let interval = 0.11;
    while (t < 1.45) {
      noiseHit(ctx, out, { t, dur: 0.05, freq: 900, q: 0.8, gain: 0.30 });
      t += interval;
      interval = Math.max(0.032, interval * 0.90);
    }
    noiseHit(ctx, out, { t: 1.5, dur: 0.35, freq: 3000, q: 0.5, gain: 0.5 });
    tone(ctx, out, { freq: 160, freqEnd: 70, t: 1.5, dur: 0.35, gain: 0.5 });
  }),
  'impact.mp3': () => render(0.6, (ctx, out) => {
    tone(ctx, out, { freq: 320, freqEnd: 52, dur: 0.5, gain: 0.85 });
    noiseHit(ctx, out, { dur: 0.18, freq: 500, type: 'lowpass', gain: 0.5 });
  }),
  'fanfare.mp3': () => render(0.95, (ctx, out) => {
    brass(ctx, out, 523.25, 0, 0.13);
    brass(ctx, out, 659.25, 0.13, 0.13);
    brass(ctx, out, 783.99, 0.26, 0.13);
    brass(ctx, out, 1046.5, 0.39, 0.5, 0.26);
  }),
  'chime.mp3': () => render(0.85, (ctx, out) => {
    tone(ctx, out, { freq: 880, freqEnd: 1760, dur: 0.55, gain: 0.42 });
    tone(ctx, out, { freq: 1320, freqEnd: 2640, dur: 0.4, gain: 0.14 });
    bell(ctx, out, 1760, 0.42, 0.4, 0.3);
  }),
  'pop.mp3': () => render(0.2, (ctx, out) => {
    tone(ctx, out, { freq: 480, freqEnd: 990, dur: 0.16, gain: 0.6 });
  }),
  'tada.mp3': () => render(1.15, (ctx, out) => {
    brass(ctx, out, 523.25, 0, 0.12);
    brass(ctx, out, 523.25, 0.17, 0.12);
    for (const f of [523.25, 659.25, 783.99, 1046.5]) brass(ctx, out, f, 0.34, 0.7, 0.16);
  }),
  'whoosh.mp3': () => render(0.75, (ctx, out) => {
    const src = ctx.createBufferSource();
    src.buffer = makeNoiseBuffer(ctx, 0.8);
    const f = ctx.createBiquadFilter();
    f.type = 'bandpass'; f.Q.value = 1.4;
    f.frequency.setValueAtTime(420, ctx.currentTime);
    f.frequency.exponentialRampToValueAtTime(2600, ctx.currentTime + 0.32);
    f.frequency.exponentialRampToValueAtTime(420, ctx.currentTime + 0.72);
    const g = ctx.createGain();
    g.gain.setValueAtTime(0, ctx.currentTime);
    g.gain.linearRampToValueAtTime(0.65, ctx.currentTime + 0.3);
    g.gain.linearRampToValueAtTime(0, ctx.currentTime + 0.72);
    src.connect(f); f.connect(g); g.connect(out);
    src.start(); src.stop(ctx.currentTime + 0.75);
  }),
  // 폴백 전용 (실제 녹음을 못 받을 때만)
  'applause.mp3': () => render(2.6, (ctx, out) => {
    for (let t = 0.03; t < 2.2; t += 0.02 + Math.random() * 0.05) {
      noiseHit(ctx, out, { t, dur: 0.045, freq: 1300 + Math.random() * 700, q: 1.1, gain: 0.10 + Math.random() * 0.10 });
    }
    noiseHit(ctx, out, { t: 0, dur: 2.5, freq: 900, type: 'lowpass', gain: 0.05 });
  }),
  'cheer.mp3': () => render(1.9, (ctx, out) => {
    const src = ctx.createBufferSource();
    src.buffer = makeNoiseBuffer(ctx, 1.9);
    const g = ctx.createGain();
    g.gain.setValueAtTime(0, ctx.currentTime);
    g.gain.linearRampToValueAtTime(0.4, ctx.currentTime + 0.25);
    g.gain.linearRampToValueAtTime(0.32, ctx.currentTime + 1.3);
    g.gain.linearRampToValueAtTime(0, ctx.currentTime + 1.85);
    src.connect(g);
    for (const freq of [750, 1150]) {
      const f = ctx.createBiquadFilter();
      f.type = 'bandpass'; f.frequency.value = freq; f.Q.value = 2.2;
      g.connect(f); f.connect(out);
    }
    src.start(); src.stop(ctx.currentTime + 1.9);
  }),
};

export async function synthSeedBlob(fileName) {
  const make = SYNTHS[fileName];
  if (!make) return null;
  const buffer = await make();
  return audioBufferToWavBlob(buffer);
}

export function hasSynth(fileName) {
  return Boolean(SYNTHS[fileName]);
}
