// 브라우저 라우드니스 측정 — 서버의 ffmpeg loudnorm을 WebAudio로 근사한다.
// BS.1770 K-weighting(프리필터 + RLB 하이패스)을 OfflineAudioContext로 렌더링한 뒤
// 400ms 블록 게이팅(절대 -70 LUFS / 상대 -10 LU)으로 integrated loudness를 구한다.
// 트루피크는 샘플 피크로 근사한다(오버샘플링 없음). 0.4초 미만은 서버와 같은 RMS 폴백.
const round1 = (v) => (v === null || v === undefined || !Number.isFinite(v) ? null : Math.round(v * 10) / 10);

let decodeCtx = null;
function getDecodeCtx() {
  if (!decodeCtx) decodeCtx = new OfflineAudioContext(1, 1, 44100);
  return decodeCtx;
}

export async function decodeBlob(blob) {
  const buf = await blob.arrayBuffer();
  return getDecodeCtx().decodeAudioData(buf);
}

function samplePeakDb(buffer) {
  let peak = 0;
  for (let ch = 0; ch < buffer.numberOfChannels; ch++) {
    const data = buffer.getChannelData(ch);
    for (let i = 0; i < data.length; i++) {
      const a = Math.abs(data[i]);
      if (a > peak) peak = a;
    }
  }
  return peak > 0 ? 20 * Math.log10(peak) : null;
}

function rmsLoudness(buffer) {
  let sum = 0;
  let count = 0;
  for (let ch = 0; ch < buffer.numberOfChannels; ch++) {
    const data = buffer.getChannelData(ch);
    for (let i = 0; i < data.length; i++) { sum += data[i] * data[i]; count++; }
  }
  if (!count) return null;
  const rms = Math.sqrt(sum / count);
  return rms > 0 ? 20 * Math.log10(rms) : null;
}

// BS.1770 K-weighting 근사 필터 (48kHz 기준 상수를 BiquadFilter 파라미터로 근사)
async function kWeighted(buffer) {
  const channels = Math.min(2, buffer.numberOfChannels);
  const ctx = new OfflineAudioContext(channels, buffer.length, buffer.sampleRate);
  const src = ctx.createBufferSource();
  src.buffer = buffer;
  // 채널별로 같은 필터 체인을 걸기 위해 ChannelSplitter/Merger 사용
  const splitter = ctx.createChannelSplitter(channels);
  const merger = ctx.createChannelMerger(channels);
  src.connect(splitter);
  for (let ch = 0; ch < channels; ch++) {
    const shelf = ctx.createBiquadFilter();
    shelf.type = 'highshelf';
    shelf.frequency.value = 1681.974450955533;
    shelf.gain.value = 3.999843853973347;
    shelf.Q.value = 0.7071752369554196;
    const hp = ctx.createBiquadFilter();
    hp.type = 'highpass';
    hp.frequency.value = 38.13547087602444;
    hp.Q.value = 0.5003270373238773;
    splitter.connect(shelf, ch);
    shelf.connect(hp);
    hp.connect(merger, 0, ch);
  }
  merger.connect(ctx.destination);
  src.start();
  return ctx.startRendering();
}

function integratedLoudness(weighted) {
  const sr = weighted.sampleRate;
  const blockLen = Math.floor(sr * 0.4);
  const hop = Math.floor(sr * 0.1);
  const channels = [];
  for (let ch = 0; ch < weighted.numberOfChannels; ch++) channels.push(weighted.getChannelData(ch));
  const total = weighted.length;
  const blockEnergies = [];
  for (let start = 0; start + blockLen <= total; start += hop) {
    let energy = 0;
    for (let ch = 0; ch < channels.length; ch++) {
      const data = channels[ch];
      let sum = 0;
      for (let i = start; i < start + blockLen; i++) sum += data[i] * data[i];
      energy += sum / blockLen; // 채널 가중치 L/R 각 1.0
    }
    blockEnergies.push(energy);
  }
  if (!blockEnergies.length) return null;
  const toLufs = (e) => -0.691 + 10 * Math.log10(e);
  // 1차: 절대 게이트 -70 LUFS
  const absGated = blockEnergies.filter((e) => e > 0 && toLufs(e) > -70);
  if (!absGated.length) return null;
  const absAvg = absGated.reduce((a, b) => a + b, 0) / absGated.length;
  // 2차: 상대 게이트 (절대게이트 평균 - 10 LU)
  const relThreshold = toLufs(absAvg) - 10;
  const relGated = absGated.filter((e) => toLufs(e) > relThreshold);
  const gated = relGated.length ? relGated : absGated;
  const avg = gated.reduce((a, b) => a + b, 0) / gated.length;
  return toLufs(avg);
}

// 서버 analyzeLoudness와 같은 반환 형태 { loudnessLufs, truePeakDb, loudnessMethod, durationSec }
export async function measureLoudness(blob) {
  const buffer = await decodeBlob(blob);
  const durationSec = Math.round(buffer.duration * 100) / 100;
  const truePeakDb = round1(samplePeakDb(buffer));
  if (buffer.duration < 0.4) {
    return { loudnessLufs: round1(rmsLoudness(buffer)), truePeakDb, loudnessMethod: 'rms', durationSec };
  }
  try {
    const weighted = await kWeighted(buffer);
    const lufs = integratedLoudness(weighted);
    if (lufs === null || !Number.isFinite(lufs)) throw new Error('no gated blocks');
    return { loudnessLufs: round1(lufs), truePeakDb, loudnessMethod: 'integrated', durationSec };
  } catch {
    return { loudnessLufs: round1(rmsLoudness(buffer)), truePeakDb, loudnessMethod: 'rms', durationSec };
  }
}
