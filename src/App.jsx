import React, { useState, useEffect, useCallback, useRef, memo } from 'react';
import { saveSoundFile, deleteSoundFile, loadAllSoundFiles } from './db.js';

// 안정성을 위해 버전 넘버를 v10으로 올립니다. (캐시 완벽 초기화)
const STORAGE_KEY = 'soundboard_settings_v10';
const SFX_VOL_KEY = 'soundboard_sfx_vol_v10';

const INITIAL_MAPPINGS = [
  // --- 1열 (Q, W, E, R) ---
  { code: 'KeyQ', keyLabel: 'Q', soundLabel: '정답 딩동댕', audioBuffer: null, color: 'bg-green-500', type: 'sfx', isDecoding: false, audioType: 'file', url: '', volume: 1.0 },
  { code: 'KeyW', keyLabel: 'W', soundLabel: '오답 땡', audioBuffer: null, color: 'bg-red-500', type: 'sfx', isDecoding: false, audioType: 'file', url: '', volume: 1.0 },
  { code: 'KeyE', keyLabel: 'E', soundLabel: '박수 함성', audioBuffer: null, color: 'bg-blue-500', type: 'sfx', isDecoding: false, audioType: 'file', url: '', volume: 1.0 },
  { code: 'KeyR', keyLabel: 'R', soundLabel: '환호성', audioBuffer: null, color: 'bg-emerald-500', type: 'sfx', isDecoding: false, audioType: 'file', url: '', volume: 1.0 },
  
  // --- 2열 (A, S, D, F) ---
  { code: 'KeyA', keyLabel: 'A', soundLabel: '두구두구', audioBuffer: null, color: 'bg-purple-500', type: 'sfx', isDecoding: false, audioType: 'file', url: '', volume: 1.0 },
  { code: 'KeyS', keyLabel: 'S', soundLabel: '웃음 소리', audioBuffer: null, color: 'bg-yellow-500', type: 'sfx', isDecoding: false, audioType: 'file', url: '', volume: 1.0 },
  { code: 'KeyD', keyLabel: 'D', soundLabel: '등장 효과음', audioBuffer: null, color: 'bg-pink-500', type: 'sfx', isDecoding: false, audioType: 'file', url: '', volume: 1.0 },
  { code: 'KeyF', keyLabel: 'F', soundLabel: '빠밤!', audioBuffer: null, color: 'bg-indigo-500', type: 'sfx', isDecoding: false, audioType: 'file', url: '', volume: 1.0 },
  
  // --- 3열 (Z, X, C, V) ---
  { code: 'KeyZ', keyLabel: 'Z', soundLabel: '띠로링', audioBuffer: null, color: 'bg-cyan-500', type: 'sfx', isDecoding: false, audioType: 'file', url: '', volume: 1.0 },
  { code: 'KeyX', keyLabel: 'X', soundLabel: '뿅 (점프)', audioBuffer: null, color: 'bg-fuchsia-500', type: 'sfx', isDecoding: false, audioType: 'file', url: '', volume: 1.0 },
  { code: 'KeyC', keyLabel: 'C', soundLabel: '빰빠밤', audioBuffer: null, color: 'bg-lime-500', type: 'sfx', isDecoding: false, audioType: 'file', url: '', volume: 1.0 },
  { code: 'KeyV', keyLabel: 'V', soundLabel: '휘리릭', audioBuffer: null, color: 'bg-rose-500', type: 'sfx', isDecoding: false, audioType: 'file', url: '', volume: 1.0 },

  // --- BGM (숫자 키패드 7~3) ---
  { code: 'Numpad7', keyLabel: 'Num 7', soundLabel: '메인 테마', audioBuffer: null, color: 'bg-indigo-600', type: 'bgm', isDecoding: false, loop: true, volume: 1.0, audioType: 'file', url: '' },
  { code: 'Numpad8', keyLabel: 'Num 8', soundLabel: '마을 배경음', audioBuffer: null, color: 'bg-violet-600', type: 'bgm', isDecoding: false, loop: true, volume: 1.0, audioType: 'file', url: '' },
  { code: 'Numpad9', keyLabel: 'Num 9', soundLabel: '전투/긴장', audioBuffer: null, color: 'bg-slate-700', type: 'bgm', isDecoding: false, loop: true, volume: 1.0, audioType: 'file', url: '' },
  { code: 'Numpad4', keyLabel: 'Num 4', soundLabel: '슬픈 장면', audioBuffer: null, color: 'bg-teal-600', type: 'bgm', isDecoding: false, loop: true, volume: 1.0, audioType: 'file', url: '' },
  { code: 'Numpad5', keyLabel: 'Num 5', soundLabel: '회상 씬', audioBuffer: null, color: 'bg-orange-600', type: 'bgm', isDecoding: false, loop: true, volume: 1.0, audioType: 'file', url: '' },
  { code: 'Numpad6', keyLabel: 'Num 6', soundLabel: '엔딩 크레딧', audioBuffer: null, color: 'bg-rose-600', type: 'bgm', isDecoding: false, loop: true, volume: 1.0, audioType: 'file', url: '' },
  { code: 'Numpad1', keyLabel: 'Num 1', soundLabel: '쉬는 시간', audioBuffer: null, color: 'bg-sky-600', type: 'bgm', isDecoding: false, loop: true, volume: 1.0, audioType: 'file', url: '' },
  { code: 'Numpad2', keyLabel: 'Num 2', soundLabel: '행사 시작', audioBuffer: null, color: 'bg-amber-600', type: 'bgm', isDecoding: false, loop: true, volume: 1.0, audioType: 'file', url: '' },
  { code: 'Numpad3', keyLabel: 'Num 3', soundLabel: '시상식', audioBuffer: null, color: 'bg-fuchsia-700', type: 'bgm', isDecoding: false, loop: true, volume: 1.0, audioType: 'file', url: '' }
];

const KeycapButton = memo(({ sound, isActive, isEditMode, bgmUIState, onAction, onFileUpload, onSettingChange, onUrlLoad }) => {
  const fileInputRef = useRef(null);
  const hasAudio = !!sound.audioBuffer;

  const handlePointerDown = (e) => {
    e.preventDefault();
    if (!isEditMode && hasAudio && !sound.isDecoding) onAction(sound.code, true);
  };

  const handlePointerUp = (e) => {
    e.preventDefault();
    if (!isEditMode && hasAudio && !sound.isDecoding) onAction(sound.code, false);
  };

  return (
    <div className="relative flex flex-col w-24 h-24 sm:w-28 sm:h-28">
      <input type="file" accept="audio/*" ref={fileInputRef} className="hidden" onChange={(e) => onFileUpload(sound.code, e)} />
      
      {isEditMode ? (
        <div className={`p-1.5 rounded-lg flex flex-col justify-between border-2 border-dashed h-full transition-colors ${sound.isDecoding ? 'border-yellow-500 bg-yellow-900/30' : hasAudio ? 'border-emerald-500 bg-slate-800' : 'border-slate-500 bg-slate-800/50'}`}>
          <div className="flex justify-between items-center mb-1">
            <span className="text-[10px] sm:text-xs font-bold text-slate-400 leading-none">{sound.keyLabel}</span>
            <select 
              value={sound.audioType || 'file'} 
              onChange={(e) => onSettingChange(sound.code, 'audioType', e.target.value)}
              disabled={sound.isDecoding}
              className="bg-slate-700 text-slate-200 text-[9px] px-1 py-0.5 rounded outline-none border border-slate-600 cursor-pointer"
            >
              <option value="file">📁 파일</option>
              <option value="url">🔗 주소</option>
            </select>
          </div>
          
          <div className="flex flex-col gap-1 mb-1">
            <input
              type="text"
              value={sound.soundLabel}
              onChange={(e) => onSettingChange(sound.code, 'soundLabel', e.target.value)}
              className="w-full bg-slate-700 text-white text-[10px] sm:text-xs p-1 rounded border border-slate-600 focus:outline-none focus:border-blue-400 text-center"
              placeholder="효과음 이름"
              disabled={sound.isDecoding}
            />
            <div className="flex items-center gap-1.5 px-0.5">
              <span className="text-[8px] text-slate-400 font-medium">Vol</span>
              <input 
                type="range" min="0" max="1" step="0.1" 
                value={sound.volume} 
                onChange={(e) => onSettingChange(sound.code, 'volume', parseFloat(e.target.value))}
                className="w-full h-1 bg-slate-600 rounded-lg appearance-none cursor-pointer accent-emerald-400"
              />
            </div>
          </div>
          
          {sound.audioType === 'url' ? (
            <div className="flex gap-1 h-[22px]">
              <input 
                type="text" 
                value={sound.url || ''} 
                onChange={(e) => onSettingChange(sound.code, 'url', e.target.value)}
                placeholder="https://..." 
                className="w-full bg-slate-800 text-white text-[8px] p-1 rounded border border-slate-600 focus:outline-none focus:border-blue-400"
                disabled={sound.isDecoding}
              />
              <button 
                onClick={() => onUrlLoad(sound.code, sound.url)}
                disabled={sound.isDecoding || !sound.url}
                className="bg-blue-600 hover:bg-blue-500 text-white text-[9px] px-1.5 rounded flex-shrink-0 disabled:opacity-50 transition-colors"
              >
                적용
              </button>
            </div>
          ) : (
            <button 
              onClick={() => fileInputRef.current?.click()} 
              disabled={sound.isDecoding}
              className={`w-full text-[10px] font-medium py-0.5 rounded transition-colors h-[22px] shadow-sm ${sound.isDecoding ? 'bg-yellow-600 text-yellow-100' : hasAudio ? 'bg-slate-600 hover:bg-slate-500 text-white' : 'bg-blue-600 hover:bg-blue-500 text-white'}`}
            >
              {hasAudio ? '파일 변경' : '파일 등록'}
            </button>
          )}
        </div>
      ) : (
        <button
          onMouseDown={handlePointerDown}
          onMouseUp={handlePointerUp}
          onMouseLeave={handlePointerUp}
          onTouchStart={handlePointerDown}
          onTouchEnd={handlePointerUp}
          disabled={!hasAudio || sound.isDecoding}
          className={`
            relative w-full h-full rounded-xl flex flex-col items-center justify-center p-2
            transition-all duration-75 select-none outline-none
            ${!hasAudio ? 'bg-slate-800 border-2 border-dashed border-slate-600 opacity-60 shadow-none mt-1' : `border border-slate-700/50 ${sound.color}`}
            ${hasAudio && !isActive ? 'shadow-[0_6px_0_rgba(0,0,0,0.6),0_8px_10px_rgba(0,0,0,0.4)] transform -translate-y-1' : ''}
            ${isActive && hasAudio && !sound.isDecoding ? 'shadow-[0_1px_0_rgba(0,0,0,0.8)] transform translate-y-1 brightness-90' : ''}
            ${bgmUIState === 'playing' ? 'ring-2 ring-green-400 shadow-[0_0_15px_rgba(74,222,128,0.5),0_6px_0_rgba(0,0,0,0.6)]' : ''}
            text-white cursor-pointer
          `}
        >
          {hasAudio && bgmUIState && (
            <div className="absolute top-1 right-1.5 text-xs drop-shadow-md">
              {bgmUIState === 'playing' && <span className="inline-block animate-pulse text-green-300">🔊</span>}
              {bgmUIState === 'paused' && <span className="opacity-70 text-amber-300">⏸️</span>}
              {bgmUIState === 'fading' && <span className="text-amber-300">📉</span>}
            </div>
          )}

          <span className="absolute top-1.5 left-2 text-[11px] sm:text-xs font-black opacity-60 drop-shadow-sm flex items-center gap-1">
            {sound.keyLabel}
            {sound.audioType === 'url' && hasAudio && <span className="text-[8px] opacity-70">🔗</span>}
          </span>
          
          <div className="flex flex-col items-center mt-3">
            {!hasAudio ? (
              <span className="text-[10px] font-medium opacity-60">비어있음</span>
            ) : (
              <span className="text-xs sm:text-sm font-bold text-center px-1 leading-tight break-keep drop-shadow-md">
                {sound.isDecoding ? '로딩...' : sound.soundLabel}
              </span>
            )}
          </div>
        </button>
      )}
    </div>
  );
});

const SoundBoard = () => {
  const [mappings, setMappings] = useState(() => {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        return INITIAL_MAPPINGS.map(init => {
          const found = parsed.find(p => p.code === init.code);
          return found ? { ...init, soundLabel: found.soundLabel, loop: found.loop ?? init.loop, volume: found.volume ?? init.volume, audioType: found.audioType ?? init.audioType, url: found.url ?? init.url } : init;
        });
      } catch (e) { return INITIAL_MAPPINGS; }
    }
    return INITIAL_MAPPINGS;
  });

  const [sfxVolume, setSfxVolume] = useState(() => {
    const saved = localStorage.getItem(SFX_VOL_KEY);
    return saved ? parseFloat(saved) : 1.0;
  });

  const [activeKeys, setActiveKeys] = useState(new Set());
  const [isEditMode, setIsEditMode] = useState(false);
  const [bgmUIStates, setBgmUIStates] = useState({}); 
  const [toast, setToast] = useState(null);
  
  const audioCtxRef = useRef(null);
  const activeNodesRef = useRef(new Map());
  const toastTimerRef = useRef(null);
  
  const mappingsRef = useRef(mappings);
  const isEditModeRef = useRef(isEditMode);
  const sfxVolumeRef = useRef(sfxVolume);
  
  useEffect(() => { mappingsRef.current = mappings; }, [mappings]);
  useEffect(() => { isEditModeRef.current = isEditMode; }, [isEditMode]);
  useEffect(() => { sfxVolumeRef.current = sfxVolume; }, [sfxVolume]);

  const showToast = useCallback((msg, type = 'error') => {
    setToast({ msg, type });
    if (toastTimerRef.current) clearTimeout(toastTimerRef.current);
    toastTimerRef.current = setTimeout(() => setToast(null), 3000);
  }, []);

  useEffect(() => {
    const id = setTimeout(() => {
      const toSave = mappings.map(({ code, soundLabel, loop, volume, audioType, url }) => ({ code, soundLabel, loop, volume, audioType, url }));
      localStorage.setItem(STORAGE_KEY, JSON.stringify(toSave));
      localStorage.setItem(SFX_VOL_KEY, sfxVolume.toString());
    }, 300);
    return () => clearTimeout(id);
  }, [mappings, sfxVolume]);

  const initAudioContext = useCallback(() => {
    if (!audioCtxRef.current) audioCtxRef.current = new (window.AudioContext || window.webkitAudioContext)();
    if (audioCtxRef.current.state === 'suspended') audioCtxRef.current.resume();
    return audioCtxRef.current;
  }, []);

  useEffect(() => {
    const loadSavedUrls = async () => {
      const ctx = new (window.AudioContext || window.webkitAudioContext)();
      if (!audioCtxRef.current) audioCtxRef.current = ctx;
      
      mappingsRef.current.forEach(async (sound) => {
        if (sound.audioType === 'url' && sound.url && !sound.audioBuffer && !sound.isDecoding) {
          try {
            setMappings(prev => prev.map(s => s.code === sound.code ? { ...s, isDecoding: true } : s));
            const response = await fetch(sound.url);
            if (!response.ok) throw new Error("Network Error");
            const arrayBuffer = await response.arrayBuffer();
            const audioBuffer = await ctx.decodeAudioData(arrayBuffer);
            setMappings(prev => prev.map(s => s.code === sound.code ? { ...s, audioBuffer, isDecoding: false } : s));
          } catch (e) {
            console.warn(`URL 자동 로드 실패 (${sound.code}):`, e);
            setMappings(prev => prev.map(s => s.code === sound.code ? { ...s, isDecoding: false } : s));
          }
        }
      });
    };
    loadSavedUrls();
  }, []);

  // 파일 업로드로 등록한 음원 복원 (IndexedDB에 저장된 원본 Blob -> 재decode)
  useEffect(() => {
    const restoreUploadedFiles = async () => {
      try {
        const blobs = await loadAllSoundFiles();
        const codes = Object.keys(blobs);
        if (codes.length === 0) return;
        const ctx = initAudioContext();
        for (const code of codes) {
          try {
            const audioBuffer = await ctx.decodeAudioData(await blobs[code].arrayBuffer());
            setMappings(prev => prev.map(s => s.code === code ? { ...s, audioBuffer } : s));
          } catch (e) {
            console.warn(`파일 복원 실패 (${code}):`, e);
          }
        }
      } catch (e) {
        // IndexedDB 미지원/비공개 브라우징 등 -> 조용히 건너뜀
        console.warn('IndexedDB 복원 실패:', e);
      }
    };
    restoreUploadedFiles();
  }, []);

  const syncBGMStateToUI = useCallback(() => {
    const nextState = {};
    activeNodesRef.current.forEach((nodeData, code) => { nextState[code] = nodeData.state; });
    setBgmUIStates(nextState);
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
        try { nodeData.source.stop(); } catch(e){}
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
        nodeData.gainNode.gain.value = currentSoundObj.volume; 
        
        const duration = nodeData.buffer.duration;
        const offset = currentSoundObj.loop ? nodeData.startOffset % duration : Math.min(nodeData.startOffset, Math.max(0, duration - 0.01));
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
      gainNode.gain.value = currentSoundObj.volume;
      source.connect(gainNode);
      gainNode.connect(ctx.destination);
      source.onended = () => stopBGM(currentSoundObj.code);
      source.start(0);
      
      activeNodesRef.current.set(currentSoundObj.code, {
        source, gainNode, buffer: currentSoundObj.audioBuffer, startTime: ctx.currentTime, startOffset: 0, state: 'playing', timeoutId: null
      });
      syncBGMStateToUI();
    }
  }, [initAudioContext, fadeOutBGM, stopBGM, syncBGMStateToUI]);

  const handleSoundAction = useCallback((code, isDown) => {
    const soundObj = mappingsRef.current.find(s => s.code === code);
    if (!soundObj || !soundObj.audioBuffer || soundObj.isDecoding) return;

    if (isDown) {
      setActiveKeys(prev => new Set(prev).add(code));
      if (soundObj.type === 'sfx') {
        const ctx = initAudioContext();
        if (ctx) {
          const source = ctx.createBufferSource();
          const gainNode = ctx.createGain();
          gainNode.gain.value = sfxVolumeRef.current * soundObj.volume;
          source.buffer = soundObj.audioBuffer;
          source.connect(gainNode);
          gainNode.connect(ctx.destination);
          source.start(0);
        }
      } else if (soundObj.type === 'bgm') {
        handleBGMPlayback(soundObj, 'toggle');
      }
    } else {
      setActiveKeys(prev => {
        const next = new Set(prev);
        next.delete(code);
        return next;
      });
    }
  }, [initAudioContext, handleBGMPlayback]);

  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.repeat || isEditModeRef.current || document.activeElement.tagName === 'INPUT') return;
      handleSoundAction(e.code, true);
    };
    const handleKeyUp = (e) => {
      if (isEditModeRef.current) return;
      handleSoundAction(e.code, false);
    };
    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
    };
  }, [handleSoundAction]);

  useEffect(() => {
    return () => {
      activeNodesRef.current.forEach((nodeData) => {
        if (nodeData.timeoutId) clearTimeout(nodeData.timeoutId);
        if (nodeData.source) { nodeData.source.onended = null; try { nodeData.source.stop(); } catch (e) {} }
      });
      if (audioCtxRef.current && audioCtxRef.current.state !== 'closed') audioCtxRef.current.close();
    };
  }, []);

  const handleFileUpload = useCallback(async (code, event) => {
    const file = event.target.files[0];
    if (!file) return;
    setMappings(prev => prev.map(s => s.code === code ? { ...s, isDecoding: true } : s));
    
    const ctx = initAudioContext();
    if (!ctx) {
      setMappings(prev => prev.map(s => s.code === code ? { ...s, isDecoding: false } : s));
      showToast("오디오 엔진을 초기화할 수 없습니다.", "error"); return; 
    }

    try {
      const arrayBuffer = await file.arrayBuffer();
      const audioBuffer = await ctx.decodeAudioData(arrayBuffer);
      const defaultLabel = file.name.replace(/\.[^/.]+$/, "");
      stopBGM(code);
      await saveSoundFile(code, file); // 원본 파일을 IndexedDB에 저장 -> 새로고침해도 유지
      setMappings(prev => prev.map(s => s.code === code ? { ...s, audioBuffer, soundLabel: defaultLabel, isDecoding: false } : s));
      showToast(`${defaultLabel} 등록 완료`, 'success');
    } catch (error) {
      showToast("지원하지 않는 파일이거나 손상되었습니다.", 'error');
      setMappings(prev => prev.map(s => s.code === code ? { ...s, isDecoding: false } : s));
    } finally {
      event.target.value = null;
    }
  }, [initAudioContext, stopBGM, showToast]);

  const handleUrlLoad = useCallback(async (code, url) => {
    if (!url) return;
    setMappings(prev => prev.map(s => s.code === code ? { ...s, isDecoding: true } : s));
    
    const ctx = initAudioContext();
    if (!ctx) {
      setMappings(prev => prev.map(s => s.code === code ? { ...s, isDecoding: false } : s));
      showToast("오디오 엔진을 초기화할 수 없습니다.", "error"); return; 
    }

    try {
      const response = await fetch(url);
      if (!response.ok) throw new Error("Network response was not ok");
      const arrayBuffer = await response.arrayBuffer();
      const audioBuffer = await ctx.decodeAudioData(arrayBuffer);
      
      stopBGM(code);
      setMappings(prev => prev.map(s => s.code === code ? { ...s, audioBuffer, isDecoding: false } : s));
      showToast(`인터넷 주소 음원 연결 완료`, 'success');
    } catch (error) {
      console.error(error);
      showToast("주소를 불러올 수 없습니다. (보안 정책에 막힌 주소일 수 있습니다)", 'error');
      setMappings(prev => prev.map(s => s.code === code ? { ...s, isDecoding: false } : s));
    }
  }, [initAudioContext, stopBGM, showToast]);

  const handleSettingChange = useCallback((code, setting, value) => {
    setMappings(prev => prev.map(s => s.code === code ? { ...s, [setting]: value } : s));

    if (setting === 'audioType' && value === 'url') {
      deleteSoundFile(code).catch(() => {}); // 파일 모드에서 저장했던 이전 음원 정리
    }

    if (setting === 'volume' || setting === 'loop') {
      const nodeData = activeNodesRef.current.get(code);
      if (nodeData) {
        if (setting === 'volume' && nodeData.state !== 'fading') nodeData.gainNode.gain.value = value;
        else if (setting === 'loop' && nodeData.source) nodeData.source.loop = value; 
      }
    }
  }, []);

  const getSound = (code) => mappings.find(s => s.code === code);

  return (
    <div className="h-screen sm:h-[100dvh] flex flex-col bg-[#1e232a] text-slate-200 font-sans overflow-hidden">
      
      {/* 알림창 (Toast) - 사라지는 애니메이션 유지 */}
      {toast && (
        <div className="fixed top-24 left-1/2 transform -translate-x-1/2 z-50 animate-toast pointer-events-none">
          <div className={`px-4 py-3 rounded-full shadow-2xl border flex items-center gap-3 backdrop-blur-md ${toast.type === 'error' ? 'bg-rose-900/90 border-rose-500/50 text-rose-100' : 'bg-emerald-900/90 border-emerald-500/50 text-emerald-100'}`}>
             <span className="text-xl leading-none">{toast.type === 'error' ? '⚠️' : '✅'}</span>
             <span className="font-medium text-sm whitespace-nowrap">{toast.msg}</span>
          </div>
        </div>
      )}

      <header className="flex-shrink-0 p-4 sm:p-6 border-b border-black/40 bg-[#171a1f] z-30 shadow-md">
        <div className="max-w-6xl mx-auto flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
          <div>
            <h1 className="text-2xl font-extrabold tracking-tight flex items-center gap-2">
              <span className="text-3xl">⌨️</span> 기계식 사운드보드
            </h1>
            <div className="flex items-center gap-2 mt-3 text-sm text-slate-400 font-medium">
              <span>⚡ 전체 효과음(SFX) 볼륨:</span>
              <input 
                type="range" min="0" max="1" step="0.01" 
                value={sfxVolume} onChange={(e) => setSfxVolume(parseFloat(e.target.value))}
                className="w-24 h-1.5 bg-slate-700 rounded-lg appearance-none cursor-pointer accent-emerald-500"
              />
            </div>
          </div>
          <button 
            onClick={() => setIsEditMode(!isEditMode)}
            className={`px-5 py-2.5 rounded-lg font-bold text-sm transition-all flex items-center gap-2 border-b-4 active:border-b-0 active:translate-y-1 ${isEditMode ? 'bg-emerald-500 border-emerald-700 text-white shadow-[0_0_15px_rgba(16,185,129,0.4)]' : 'bg-slate-700 border-slate-900 text-slate-200'}`}
          >
            {isEditMode ? '💾 편집 완료' : '⚙️ 자판 설정'}
          </button>
        </div>
      </header>

      <main className="flex-grow p-4 lg:p-8 overflow-y-auto overflow-x-auto z-10 custom-scrollbar flex flex-col items-center justify-start">
        
        {/* 🔥 수정된 자판 설정 가이드 (사라지지 않고 유지됨, 콤팩트한 한 줄 디자인) */}
        {isEditMode && (
          <div className="w-full max-w-5xl bg-blue-900/20 border border-blue-500/30 rounded-lg p-3 mb-6 text-blue-200 shadow-inner animate-fade-in flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
            <h3 className="font-bold text-blue-400 flex items-center gap-1.5 text-sm whitespace-nowrap">
              <span className="text-base">💡</span> 설정 가이드
            </h3>
            <div className="flex flex-wrap items-center gap-x-5 gap-y-1 text-[10px] sm:text-xs opacity-90">
              <span className="flex items-center gap-1"><strong className="text-white">📁 파일:</strong> 내 컴퓨터 음원 (새로고침 시 초기화됨)</span>
              <span className="flex items-center gap-1"><strong className="text-white">🔗 주소(추천):</strong> 인터넷 링크 (설정 자동 저장됨)</span>
              <span className="flex items-center gap-1"><strong className="text-white">🔊 Vol:</strong> 자판별 개별 볼륨 세밀 조절</span>
            </div>
          </div>
        )}

        <div className="bg-[#2a303c] p-6 sm:p-10 rounded-2xl shadow-[inset_0_4px_10px_rgba(255,255,255,0.05),0_15px_25px_rgba(0,0,0,0.5)] border border-slate-600/30 flex flex-col xl:flex-row gap-8 xl:gap-16 min-w-max">
          
          <div>
            <h2 className="text-lg font-bold mb-4 text-slate-400 flex items-center gap-2 ml-2">
              효과음 자판 <span className="text-[10px] font-normal text-emerald-400 bg-emerald-400/10 px-2 py-0.5 rounded">다중 재생</span>
            </h2>
            <div className="flex flex-col gap-3 sm:gap-4 bg-[#222731] p-4 sm:p-6 rounded-xl shadow-inner border border-black/20">
              <div className="flex gap-3 sm:gap-4 ml-0">
                {['KeyQ', 'KeyW', 'KeyE', 'KeyR'].map(code => (
                  <KeycapButton key={code} sound={getSound(code)} isActive={activeKeys.has(code)} isEditMode={isEditMode} bgmUIState={null} onAction={handleSoundAction} onFileUpload={handleFileUpload} onSettingChange={handleSettingChange} onUrlLoad={handleUrlLoad} />
                ))}
              </div>
              <div className="flex gap-3 sm:gap-4 ml-4 sm:ml-6">
                {['KeyA', 'KeyS', 'KeyD', 'KeyF'].map(code => (
                  <KeycapButton key={code} sound={getSound(code)} isActive={activeKeys.has(code)} isEditMode={isEditMode} bgmUIState={null} onAction={handleSoundAction} onFileUpload={handleFileUpload} onSettingChange={handleSettingChange} onUrlLoad={handleUrlLoad} />
                ))}
              </div>
              <div className="flex gap-3 sm:gap-4 ml-8 sm:ml-12">
                {['KeyZ', 'KeyX', 'KeyC', 'KeyV'].map(code => (
                  <KeycapButton key={code} sound={getSound(code)} isActive={activeKeys.has(code)} isEditMode={isEditMode} bgmUIState={null} onAction={handleSoundAction} onFileUpload={handleFileUpload} onSettingChange={handleSettingChange} onUrlLoad={handleUrlLoad} />
                ))}
              </div>
            </div>
          </div>

          <div>
            <h2 className="text-lg font-bold mb-4 text-slate-400 flex items-center gap-2 ml-2">
              숫자 키패드 <span className="text-[10px] font-normal text-blue-400 bg-blue-400/10 px-2 py-0.5 rounded">BGM 제어</span>
            </h2>
            <div className="grid grid-cols-3 gap-3 sm:gap-4 bg-[#222731] p-4 sm:p-6 rounded-xl shadow-inner border border-black/20 w-fit">
              {['Numpad7', 'Numpad8', 'Numpad9', 'Numpad4', 'Numpad5', 'Numpad6', 'Numpad1', 'Numpad2', 'Numpad3'].map(code => (
                <KeycapButton key={code} sound={getSound(code)} isActive={activeKeys.has(code)} isEditMode={isEditMode} bgmUIState={bgmUIStates[code]} onAction={handleSoundAction} onFileUpload={handleFileUpload} onSettingChange={handleSettingChange} onUrlLoad={handleUrlLoad} />
              ))}
            </div>
          </div>

        </div>
      </main>

      {Object.keys(bgmUIStates).length > 0 && (
        <footer className="flex-shrink-0 bg-[#171a1f]/95 backdrop-blur-md border-t border-black/50 p-4 z-20 shadow-[0_-10px_30px_rgba(0,0,0,0.6)] animate-slide-up">
          <div className="max-w-6xl mx-auto flex flex-wrap gap-4 items-center justify-center lg:justify-start">
            {Object.entries(bgmUIStates).map(([code, uiState]) => {
              const soundData = getSound(code);
              if (!soundData) return null;

              return (
                <div key={code} className="flex flex-col gap-3 bg-[#222731] border border-slate-700/50 rounded-lg p-3 min-w-[320px] flex-grow max-w-md shadow-lg">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2.5 overflow-hidden w-full">
                      <div className={`flex-shrink-0 w-2.5 h-2.5 rounded-full ${uiState === 'playing' ? 'bg-green-500 animate-pulse shadow-[0_0_8px_rgba(34,197,94,0.6)]' : uiState === 'fading' ? 'bg-amber-500' : 'bg-slate-500'}`}></div>
                      <span className="font-bold text-sm truncate flex-grow mr-2 text-slate-200">
                        {soundData.soundLabel} <span className="text-[10px] text-slate-500 font-normal">({soundData.keyLabel})</span>
                      </span>
                    </div>
                    <div className="flex gap-1 flex-shrink-0">
                      <button onClick={() => handleBGMPlayback(soundData, 'toggle')} disabled={uiState === 'fading'} className="w-9 h-9 bg-slate-700 hover:bg-slate-600 rounded">
                        {uiState === 'paused' ? '▶️' : '⏸️'}
                      </button>
                      <button onClick={() => fadeOutBGM(code)} disabled={uiState === 'fading'} className="w-9 h-9 bg-slate-700 hover:bg-slate-600 rounded" title="페이드아웃">📉</button>
                      <button onClick={() => stopBGM(code)} className="w-9 h-9 bg-rose-900/50 hover:bg-rose-700 text-rose-300 rounded">⏹️</button>
                    </div>
                  </div>
                  <div className="flex items-center justify-between gap-4 px-1">
                    <input type="range" min="0" max="1" step="0.01" value={soundData.volume} onChange={(e) => handleSettingChange(code, 'volume', parseFloat(e.target.value))} className="flex-grow h-1.5 bg-slate-700 rounded-lg appearance-none cursor-pointer accent-blue-500"/>
                    <button onClick={() => handleSettingChange(code, 'loop', !soundData.loop)} className={`flex-shrink-0 text-[10px] px-2 py-1 rounded border ${soundData.loop ? 'bg-blue-900/50 border-blue-500/50 text-blue-300' : 'bg-slate-800 border-slate-600 text-slate-500'}`}>
                      {soundData.loop ? '🔁 반복 켬' : '➡️ 반복 끔'}
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </footer>
      )}
      
      <style>{`
        /* 애니메이션 분리: 알림창(Toast)은 사라지고, 설명서(Guide)는 유지됨 */
        @keyframes toast-slide { 0%, 100% { transform: translate(-50%, -100%); opacity: 0; } 10%, 90% { transform: translate(-50%, 0); opacity: 1; } }
        .animate-toast { animation: toast-slide 3s ease-out forwards; }
        
        @keyframes fade-in { from { opacity: 0; transform: translateY(-5px); } to { opacity: 1; transform: translateY(0); } }
        .animate-fade-in { animation: fade-in 0.3s ease-out forwards; }

        @keyframes slide-up { from { transform: translateY(100%); opacity: 0; } to { transform: translateY(0); opacity: 1; } }
        .animate-slide-up { animation: slide-up 0.2s ease-out forwards; }
        
        .custom-scrollbar::-webkit-scrollbar { width: 8px; height: 8px; }
        .custom-scrollbar::-webkit-scrollbar-track { background: transparent; }
        .custom-scrollbar::-webkit-scrollbar-thumb { background: rgba(71, 85, 105, 0.6); border-radius: 4px; }
      `}</style>
    </div>
  );
};

export default SoundBoard;