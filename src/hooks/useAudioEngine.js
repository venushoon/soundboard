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

  const fadeOutBGM = useCallback((code) => {
    const nodeData = activeNodesRef.current.get(code);
    const ctx = audioCtxRef.current;
    if (!nodeData || !ctx || nodeData.state !== 'playing') return;

    if (nodeData.timeoutId) clearTimeout(nodeData.timeoutId);
    nodeData.state = 'fading';

    const currTime = ctx.currentTime;
    const fadeDuration = 2.0;
    nodeData.gainNode.gain.cancelScheduledValues(currTime);
    nodeData.gainNode.gain.setValueAtTime(nodeData.gainNode.gain.value, currTime);
    nodeData.gainNode.gain.linearRampToValueAtTime(0.001, currTime + fadeDuration);

    nodeData.timeoutId = setTimeout(() => stopBGM(code), fadeDuration * 1000);
    syncBGMStateToUI();
  }, [stopBGM, syncBGMStateToUI]);

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

        const duration = nodeData.buffer.duration;
        const offset = currentSoundObj.loop
          ? nodeData.startOffset % duration
          : Math.min(nodeData.startOffset, Math.max(0, duration - 0.01));
        newSource.onended = () => stopBGM(currentSoundObj.code);
        newSource.start(0, offset);

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
      gainNode.gain.value = currentSoundObj.volume * soundGainOf(currentSoundObj);
      source.connect(gainNode);
      gainNode.connect(ctx.destination);
      source.onended = () => stopBGM(currentSoundObj.code);
      source.start(0);

      activeNodesRef.current.set(currentSoundObj.code, {
        source, gainNode, buffer: currentSoundObj.audioBuffer,
        startTime: ctx.currentTime, startOffset: 0, state: 'playing', timeoutId: null,
      });
      syncBGMStateToUI();
    }
  }, [initAudioContext, fadeOutBGM, stopBGM, syncBGMStateToUI, mappingsRef]);

  const seekBGM = useCallback((code, targetTime) => {
    const ctx = audioCtxRef.current;
    const nodeData = activeNodesRef.current.get(code);
    if (!ctx || !nodeData || !nodeData.buffer) return;

    const duration = nodeData.buffer.duration;
    const clampedTime = Math.min(Math.max(targetTime, 0), Math.max(duration - 0.01, 0));
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
      newSource.connect(nodeData.gainNode);
      newSource.onended = () => stopBGM(code);
      newSource.start(0, clampedTime);

      nodeData.source = newSource;
      nodeData.startTime = ctx.currentTime;
      nodeData.state = 'playing';
    } else {
      nodeData.state = 'paused';
    }

    syncBGMStateToUI();
  }, [stopBGM, syncBGMStateToUI, mappingsRef]);

  // 🔁 SFX 토글: 재생 중이 아니면 재생, 이미 재생 중이면 즉시 정지
  const toggleSfx = useCallback((soundObj) => {
    const existing = sfxNodesRef.current.get(soundObj.code);
    if (existing) {
      existing.source.onended = null;
      try { existing.source.stop(); } catch (e) {}
      sfxNodesRef.current.delete(soundObj.code);
      syncSfxStateToUI();
      return;
    }

    const ctx = initAudioContext();
    if (!ctx) return;
    const source = ctx.createBufferSource();
    const gainNode = ctx.createGain();
    gainNode.gain.value = sfxVolumeRef.current * soundObj.volume * soundGainOf(soundObj);
    source.buffer = soundObj.audioBuffer;
    source.connect(gainNode);
    gainNode.connect(ctx.destination);
    source.onended = () => {
      sfxNodesRef.current.delete(soundObj.code);
      syncSfxStateToUI();
    };
    sfxNodesRef.current.set(soundObj.code, { source, gainNode });
    source.start(0);
    syncSfxStateToUI();
  }, [initAudioContext, sfxVolumeRef, syncSfxStateToUI]);

  // SFX 즉시 정지 (믹서 채널 버튼용): 재생 중이 아니면 아무 일도 하지 않는다
  const stopSfx = useCallback((code) => {
    const existing = sfxNodesRef.current.get(code);
    if (!existing) return;
    existing.source.onended = null;
    try { existing.source.stop(); } catch (e) {}
    sfxNodesRef.current.delete(code);
    syncSfxStateToUI();
  }, [syncSfxStateToUI]);

  const getPlaybackInfo = useCallback((code) => {
    const nodeData = activeNodesRef.current.get(code);
    if (!nodeData || !nodeData.buffer) return null;
    const duration = nodeData.buffer.duration;
    const ctx = audioCtxRef.current;
    let elapsed = nodeData.state === 'playing' && ctx
      ? nodeData.startOffset + (ctx.currentTime - nodeData.startTime)
      : nodeData.startOffset;
    const sound = mappingsRef.current.find(s => s.code === code);
    elapsed = sound?.loop ? elapsed % duration : Math.min(Math.max(elapsed, 0), duration);
    return { elapsed, duration };
  }, [mappingsRef]);

  const handlePanicStop = useCallback(() => {
    activeNodesRef.current.forEach((nodeData) => {
      if (nodeData.timeoutId) clearTimeout(nodeData.timeoutId);
      if (nodeData.source) { nodeData.source.onended = null; try { nodeData.source.stop(); } catch (e) {} }
    });
    activeNodesRef.current.clear();
    sfxNodesRef.current.forEach(({ source }) => {
      source.onended = null;
      try { source.stop(); } catch (e) {}
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
    seekBGM,
    handleBGMPlayback,
    toggleSfx,
    stopSfx,
    getPlaybackInfo,
    handlePanicStop,
    applyLiveSetting,
  };
}