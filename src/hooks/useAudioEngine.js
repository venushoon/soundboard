import { useCallback, useEffect, useRef, useState } from 'react';
import { soundGainOf } from '../constants.js';

// iOS 오디오 세션 전환용 무음 WAV (0.25초) — 첫 제스처에서 재생하면 무음 모드에서도 소리가 난다
const SILENT_WAV_URI = 'data:audio/wav;base64,UklGRhYIAABXQVZFZm10IBAAAAABAAEAQB8AAEAfAAABAAgATElTVBoAAABJTkZPSVNGVA4AAABMYXZmNjIuMTIuMTAyAGRhdGHQBwAAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIA==';

export function useAudioEngine({ mappingsRef, sfxVolumeRef }) {
  const audioCtxRef = useRef(null);
  const activeNodesRef = useRef(new Map()); // BGM 노드 (code -> nodeData)
  const sfxNodesRef = useRef(new Map());    // 재생 중인 SFX (code -> { source, gainNode })
  const [bgmUIStates, setBgmUIStates] = useState({});
  const [sfxPlayingCodes, setSfxPlayingCodes] = useState(() => new Set());

  // 마스터 체인: 버스(SFX/BGM) → 마스터 → 리미터(클리핑 방지) → 출력.
  // 채널별 애널라이저는 믹서 레벨 미터가 읽는다.
  const masterRef = useRef(null);
  const channelRef = useRef(new Map()); // code -> { an, scratch }
  const ensureMaster = (ctx) => {
    if (masterRef.current) return masterRef.current;
    const inGain = ctx.createGain();
    const limiter = ctx.createDynamicsCompressor();
    limiter.threshold.value = -3;
    limiter.knee.value = 0;
    limiter.ratio.value = 20;
    limiter.attack.value = 0.002;
    limiter.release.value = 0.25;
    inGain.connect(limiter);
    limiter.connect(ctx.destination);
    const sfxBus = ctx.createGain(); sfxBus.connect(inGain);
    const bgmBus = ctx.createGain(); bgmBus.connect(inGain);
    masterRef.current = { inGain, limiter, sfxBus, bgmBus };
    return masterRef.current;
  };
  const channelOut = (ctx, code, kind) => {
    const m = ensureMaster(ctx);
    let entry = channelRef.current.get(code);
    if (!entry) {
      const an = ctx.createAnalyser();
      an.fftSize = 512;
      an.connect(kind === 'bgm' ? m.bgmBus : m.sfxBus);
      entry = { an, scratch: new Float32Array(an.fftSize) };
      channelRef.current.set(code, entry);
    }
    return entry.an;
  };
  const getChannelLevel = useCallback((code) => {
    const entry = channelRef.current.get(code);
    if (!entry) return 0;
    entry.an.getFloatTimeDomainData(entry.scratch);
    let sum = 0;
    for (let i = 0; i < entry.scratch.length; i++) sum += entry.scratch[i] * entry.scratch[i];
    return Math.min(1, Math.sqrt(sum / entry.scratch.length) * 2.4);
  }, []);

  // 사운드별 재생 구간 (startSec~endSec, 초). endSec가 없으면 버퍼 끝까지.
  const segmentOf = (soundObj, buffer) => {
    const total = buffer?.duration ?? 0;
    const start = Math.min(Math.max(soundObj?.startSec || 0, 0), Math.max(0, total - 0.05));
    const rawEnd = typeof soundObj?.endSec === 'number' && soundObj.endSec > start ? soundObj.endSec : total;
    const end = Math.min(Math.max(rawEnd, start + 0.05), total);
    return { start, end, dur: Math.max(0.05, end - start) };
  };

  const initAudioContext = useCallback(() => {
    // iOS 17+: 오디오 세션을 '재생'으로 지정해 무음 모드에서도 WebAudio가 울리게 한다
    try { if ('audioSession' in navigator) navigator.audioSession.type = 'playback'; } catch (e) {}
    if (!audioCtxRef.current) {
      audioCtxRef.current = new (window.AudioContext || window.webkitAudioContext)();
    }
    if (audioCtxRef.current.state !== 'running') audioCtxRef.current.resume();
    return audioCtxRef.current;
  }, []);

  // iOS 잠금 해제: 첫 사용자 제스처에서 컨텍스트를 깨우고 무음 클립을 재생해
  // 오디오 세션을 재생 모드로 전환한다 (구형 iOS의 무음 스위치·자동재생 정책 대응)
  const unlockedRef = useRef(false);
  useEffect(() => {
    const unlock = () => {
      const ctx = initAudioContext();
      if (!ctx || unlockedRef.current) return;
      try {
        const src = ctx.createBufferSource();
        src.buffer = ctx.createBuffer(1, 1, 22050);
        src.connect(ctx.destination);
        src.start(0);
      } catch (e) {}
      try {
        const el = new Audio(SILENT_WAV_URI);
        const p = el.play();
        if (p && p.catch) p.catch(() => {});
      } catch (e) {}
      if (ctx.state === 'running') {
        unlockedRef.current = true;
        window.removeEventListener('pointerdown', unlock);
        window.removeEventListener('touchend', unlock);
      }
    };
    window.addEventListener('pointerdown', unlock);
    window.addEventListener('touchend', unlock);
    return () => {
      window.removeEventListener('pointerdown', unlock);
      window.removeEventListener('touchend', unlock);
    };
  }, [initAudioContext]);

  const syncBGMStateToUI = useCallback(() => {
    const nextState = {};
    activeNodesRef.current.forEach((nodeData, code) => { nextState[code] = nodeData.state; });
    setBgmUIStates(nextState);
  }, []);

  const syncSfxStateToUI = useCallback(() => {
    setSfxPlayingCodes(new Set(sfxNodesRef.current.keys()));
  }, []);

  const stopBGM = useCallback((code) => {
    const nodeData = activeNodesRef.current.get(code);
    if (nodeData) {
      if (nodeData.timeoutId) clearTimeout(nodeData.timeoutId);
      if (nodeData.source) {
        nodeData.source.onended = null;
        try { nodeData.source.stop(); } catch (e) {}
      }
      activeNodesRef.current.delete(code);
    }
    syncBGMStateToUI();
  }, [syncBGMStateToUI]);

  // BGM 페이드아웃 정지: seconds를 주면 그 시간으로, 없으면 그 사운드의
  // fadeOutSec 설정을 쓰고, 그것도 없으면 기본 2초.
  const fadeOutBGM = useCallback((code, seconds) => {
    const nodeData = activeNodesRef.current.get(code);
    const ctx = audioCtxRef.current;
    if (!nodeData || !ctx || nodeData.state !== 'playing') return;

    if (nodeData.timeoutId) clearTimeout(nodeData.timeoutId);
    nodeData.state = 'fading';

    const obj = mappingsRef.current.find(s => s.code === code);
    const fadeDuration = typeof seconds === 'number' ? seconds : ((obj?.fadeOutSec || 0) > 0 ? obj.fadeOutSec : 2.0);
    const currTime = ctx.currentTime;
    nodeData.gainNode.gain.cancelScheduledValues(currTime);
    nodeData.gainNode.gain.setValueAtTime(nodeData.gainNode.gain.value, currTime);
    nodeData.gainNode.gain.linearRampToValueAtTime(0.001, currTime + fadeDuration);

    nodeData.timeoutId = setTimeout(() => stopBGM(code), fadeDuration * 1000);
    syncBGMStateToUI();
  }, [stopBGM, syncBGMStateToUI, mappingsRef]);

  // 정지 버튼용: 사운드에 fadeOutSec가 있으면 그 시간으로 페이드 정지, 없으면 즉시 정지
  const stopBGMWithFade = useCallback((code) => {
    const nodeData = activeNodesRef.current.get(code);
    if (!nodeData) return;
    const obj = mappingsRef.current.find(s => s.code === code);
    if (nodeData.state === 'playing' && (obj?.fadeOutSec || 0) > 0.05) fadeOutBGM(code, obj.fadeOutSec);
    else stopBGM(code);
  }, [fadeOutBGM, stopBGM, mappingsRef]);

  const handleBGMPlayback = useCallback((baseSoundObj, action = 'toggle') => {
    const ctx = initAudioContext();
    if (!ctx) return;
    const currentSoundObj = mappingsRef.current.find(s => s.code === baseSoundObj.code) || baseSoundObj;
    const nodeData = activeNodesRef.current.get(currentSoundObj.code);

    if (nodeData) {
      if (nodeData.state === 'fading') return;
      if (nodeData.state === 'playing' && (action === 'toggle' || action === 'pause')) {
        const elapsed = ctx.currentTime - nodeData.startTime;
        nodeData.source.onended = null;
        try { nodeData.source.stop(); } catch (e) {}
        nodeData.startOffset += elapsed;
        nodeData.state = 'paused';
        syncBGMStateToUI();
        return;
      }
      if (nodeData.state === 'paused' && (action === 'toggle' || action === 'play')) {
        const newSource = ctx.createBufferSource();
        newSource.buffer = nodeData.buffer;
        newSource.loop = currentSoundObj.loop;
        newSource.connect(nodeData.gainNode);
        nodeData.gainNode.gain.value = currentSoundObj.volume * soundGainOf(currentSoundObj);

        const segStart = nodeData.segStart ?? 0;
        const segDur = (nodeData.segEnd ?? nodeData.buffer.duration) - segStart;
        const rel = currentSoundObj.loop
          ? nodeData.startOffset % segDur
          : Math.min(nodeData.startOffset, Math.max(0, segDur - 0.01));
        newSource.loopStart = segStart;
        newSource.loopEnd = segStart + segDur;
        newSource.onended = () => stopBGM(currentSoundObj.code);
        if (newSource.loop) newSource.start(0, segStart + rel);
        else newSource.start(0, segStart + rel, Math.max(0.01, segDur - rel));

        nodeData.source = newSource;
        nodeData.startTime = ctx.currentTime;
        nodeData.state = 'playing';
        syncBGMStateToUI();
        return;
      }
    }

    if (action === 'toggle' || action === 'play') {
      activeNodesRef.current.forEach((_, existingCode) => {
        if (existingCode !== currentSoundObj.code) fadeOutBGM(existingCode);
      });

      const source = ctx.createBufferSource();
      const gainNode = ctx.createGain();
      source.buffer = currentSoundObj.audioBuffer;
      source.loop = currentSoundObj.loop;
      const seg = segmentOf(currentSoundObj, currentSoundObj.audioBuffer);
      source.loopStart = seg.start;
      source.loopEnd = seg.end;
      const vol = currentSoundObj.volume * soundGainOf(currentSoundObj);
      const fadeIn = currentSoundObj.fadeInSec || 0;
      const nowT = ctx.currentTime;
      if (fadeIn > 0.05) {
        gainNode.gain.setValueAtTime(0, nowT);
        gainNode.gain.linearRampToValueAtTime(vol, nowT + fadeIn);
      } else {
        gainNode.gain.value = vol;
      }
      source.connect(gainNode);
      gainNode.connect(channelOut(ctx, currentSoundObj.code, 'bgm'));
      source.onended = () => stopBGM(currentSoundObj.code);
      if (source.loop) source.start(0, seg.start);
      else source.start(0, seg.start, seg.dur);

      activeNodesRef.current.set(currentSoundObj.code, {
        source, gainNode, buffer: currentSoundObj.audioBuffer,
        startTime: ctx.currentTime, startOffset: 0, state: 'playing', timeoutId: null,
        segStart: seg.start, segEnd: seg.end,
      });
      syncBGMStateToUI();
    }
  }, [initAudioContext, fadeOutBGM, stopBGM, syncBGMStateToUI, mappingsRef]);

  const seekBGM = useCallback((code, targetTime) => {
    const ctx = audioCtxRef.current;
    const nodeData = activeNodesRef.current.get(code);
    if (!ctx || !nodeData || !nodeData.buffer) return;

    const segStart = nodeData.segStart ?? 0;
    const segDur = (nodeData.segEnd ?? nodeData.buffer.duration) - segStart;
    const clampedTime = Math.min(Math.max(targetTime, 0), Math.max(segDur - 0.01, 0));
    const wasPlaying = nodeData.state === 'playing';

    if (nodeData.timeoutId) clearTimeout(nodeData.timeoutId);
    if (nodeData.source) {
      nodeData.source.onended = null;
      try { nodeData.source.stop(); } catch (e) {}
    }

    nodeData.startOffset = clampedTime;

    if (wasPlaying) {
      const sound = mappingsRef.current.find(s => s.code === code);
      const newSource = ctx.createBufferSource();
      newSource.buffer = nodeData.buffer;
      newSource.loop = sound?.loop ?? false;
      newSource.loopStart = segStart;
      newSource.loopEnd = segStart + segDur;
      newSource.connect(nodeData.gainNode);
      newSource.onended = () => stopBGM(code);
      if (newSource.loop) newSource.start(0, segStart + clampedTime);
      else newSource.start(0, segStart + clampedTime, Math.max(0.01, segDur - clampedTime));

      nodeData.source = newSource;
      nodeData.startTime = ctx.currentTime;
      nodeData.state = 'playing';
    } else {
      nodeData.state = 'paused';
    }

    syncBGMStateToUI();
  }, [stopBGM, syncBGMStateToUI, mappingsRef]);

  // SFX 보이스 정지: 사운드에 fadeOutSec가 있으면 그 시간에 걸쳐 페이드 후 정지.
  // seconds를 직접 주면(페이드 큐 등) 그 시간을 우선한다.
  // 페이드 중인 보이스는 맵에 남아 '재생 중'으로 표시되고, 끝나면 제거된다.
  const stopVoice = useCallback((code, secondsOverride) => {
    const node = sfxNodesRef.current.get(code);
    if (!node || node.stopping) return;
    const ctx = audioCtxRef.current;
    const obj = mappingsRef.current.find(s => s.code === code);
    const fadeOut = typeof secondsOverride === 'number' ? secondsOverride : (obj?.fadeOutSec || 0);
    if (fadeOut > 0.05 && ctx) {
      node.stopping = true;
      const now = ctx.currentTime;
      try {
        node.gainNode.gain.cancelScheduledValues(now);
        node.gainNode.gain.setValueAtTime(node.gainNode.gain.value, now);
        node.gainNode.gain.linearRampToValueAtTime(0.0001, now + fadeOut);
      } catch (e) {}
      node.stopTimer = setTimeout(() => {
        node.source.onended = null;
        try { node.source.stop(); } catch (e) {}
        if (sfxNodesRef.current.get(code) === node) sfxNodesRef.current.delete(code);
        syncSfxStateToUI();
      }, fadeOut * 1000 + 40);
      return;
    }
    node.source.onended = null;
    try { node.source.stop(); } catch (e) {}
    sfxNodesRef.current.delete(code);
    syncSfxStateToUI();
  }, [mappingsRef, syncSfxStateToUI]);

  // 🔁 SFX 토글: 재생 중이 아니면 재생, 이미 재생 중이면 정지(페이드 설정 반영)
  const toggleSfx = useCallback((soundObj) => {
    const existing = sfxNodesRef.current.get(soundObj.code);
    if (existing && !existing.stopping) {
      stopVoice(soundObj.code);
      return;
    }
    if (existing && existing.stopping) {
      // 페이드아웃 도중 재트리거: 기존 보이스를 즉시 끊고 새로 시작한다
      if (existing.stopTimer) clearTimeout(existing.stopTimer);
      existing.source.onended = null;
      try { existing.source.stop(); } catch (e) {}
      sfxNodesRef.current.delete(soundObj.code);
    }

    const ctx = initAudioContext();
    if (!ctx) return;
    const source = ctx.createBufferSource();
    const gainNode = ctx.createGain();
    source.buffer = soundObj.audioBuffer;
    const seg = segmentOf(soundObj, soundObj.audioBuffer);
    const base = sfxVolumeRef.current * soundObj.volume * soundGainOf(soundObj);
    const now = ctx.currentTime;
    const fadeIn = soundObj.fadeInSec || 0;
    const fadeOut = soundObj.fadeOutSec || 0;
    if (fadeIn > 0.05) {
      gainNode.gain.setValueAtTime(0, now);
      gainNode.gain.linearRampToValueAtTime(base, now + fadeIn);
    } else {
      gainNode.gain.value = base;
    }
    // 구간 끝에 맞춘 페이드아웃 예약 (끝에서 fadeOut초 전부터 0으로)
    if (fadeOut > 0.05 && seg.dur > fadeOut + 0.1) {
      const foStart = seg.dur - fadeOut;
      if (foStart >= fadeIn) gainNode.gain.setValueAtTime(base, now + foStart);
      gainNode.gain.linearRampToValueAtTime(0.0001, now + seg.dur);
    }
    source.connect(gainNode);
    gainNode.connect(channelOut(ctx, soundObj.code, 'sfx'));
    source.onended = () => {
      if (sfxNodesRef.current.get(soundObj.code)?.source === source) {
        sfxNodesRef.current.delete(soundObj.code);
        syncSfxStateToUI();
      }
    };
    sfxNodesRef.current.set(soundObj.code, { source, gainNode, stopping: false, stopTimer: null });
    source.start(0, seg.start, seg.dur);
    syncSfxStateToUI();
  }, [initAudioContext, sfxVolumeRef, syncSfxStateToUI, stopVoice]);

  // SFX 정지 (믹서 채널 버튼용): 페이드아웃 설정이 있으면 페이드로 멈춘다
  const stopSfx = useCallback((code) => {
    stopVoice(code);
  }, [stopVoice]);

  // 지정한 시간(초)에 걸쳐 SFX를 페이드아웃한다 (페이드 큐용)
  const fadeOutSfx = useCallback((code, seconds) => {
    stopVoice(code, seconds);
  }, [stopVoice]);

  // 현재 재생 중인 BGM 코드 목록 (페이드 큐 대상 산출용)
  const getActiveBgmCodes = useCallback(() => {
    const codes = [];
    activeNodesRef.current.forEach((nodeData, code) => {
      if (nodeData.state === 'playing') codes.push(code);
    });
    return codes;
  }, []);

  // 현재 재생 중인 SFX 코드 목록
  const getPlayingSfxCodes = useCallback(() => [...sfxNodesRef.current.keys()], []);

  const getPlaybackInfo = useCallback((code) => {
    const nodeData = activeNodesRef.current.get(code);
    if (!nodeData || !nodeData.buffer) return null;
    const segDur = (nodeData.segEnd ?? nodeData.buffer.duration) - (nodeData.segStart ?? 0);
    const ctx = audioCtxRef.current;
    let elapsed = nodeData.state === 'playing' && ctx
      ? nodeData.startOffset + (ctx.currentTime - nodeData.startTime)
      : nodeData.startOffset;
    const sound = mappingsRef.current.find(s => s.code === code);
    elapsed = sound?.loop ? elapsed % segDur : Math.min(Math.max(elapsed, 0), segDur);
    return { elapsed, duration: segDur };
  }, [mappingsRef]);

  const handlePanicStop = useCallback(() => {
    activeNodesRef.current.forEach((nodeData) => {
      if (nodeData.timeoutId) clearTimeout(nodeData.timeoutId);
      if (nodeData.source) { nodeData.source.onended = null; try { nodeData.source.stop(); } catch (e) {} }
    });
    activeNodesRef.current.clear();
    sfxNodesRef.current.forEach((node) => {
      if (node.stopTimer) clearTimeout(node.stopTimer);
      node.source.onended = null;
      try { node.source.stop(); } catch (e) {}
    });
    sfxNodesRef.current.clear();
    setBgmUIStates({});
    setSfxPlayingCodes(new Set());
  }, []);

  useEffect(() => {
    return () => {
      activeNodesRef.current.forEach((nodeData) => {
        if (nodeData.timeoutId) clearTimeout(nodeData.timeoutId);
        if (nodeData.source) { nodeData.source.onended = null; try { nodeData.source.stop(); } catch (e) {} }
      });
      if (audioCtxRef.current && audioCtxRef.current.state !== 'closed') audioCtxRef.current.close();
    };
  }, []);

  const applyLiveSetting = useCallback((code, setting, value) => {
    const soundObj = mappingsRef.current.find(s => s.code === code);
    const sg = soundGainOf(soundObj);
    const nodeData = activeNodesRef.current.get(code);
    if (nodeData) {
      if (setting === 'volume' && nodeData.gainNode && nodeData.state !== 'fading') {
        nodeData.gainNode.gain.value = value * sg;
      }
      if (setting === 'loop' && nodeData.source) {
        nodeData.source.loop = value;
      }
    }
    const sfxData = sfxNodesRef.current.get(code);
    if (sfxData && setting === 'volume' && sfxData.gainNode) {
      sfxData.gainNode.gain.value = sfxVolumeRef.current * value * sg;
    }
  }, [sfxVolumeRef, mappingsRef]);

  return {
    initAudioContext,
    bgmUIStates,
    sfxPlayingCodes,
    stopBGM,
    fadeOutBGM,
    stopBGMWithFade,
    getChannelLevel,
    seekBGM,
    handleBGMPlayback,
    toggleSfx,
    stopSfx,
    fadeOutSfx,
    getActiveBgmCodes,
    getPlayingSfxCodes,
    getPlaybackInfo,
    handlePanicStop,
    applyLiveSetting,
  };
}