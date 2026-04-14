import React, { useState, useEffect, useCallback, useRef, memo } from 'react';

const STORAGE_KEY = 'soundboard_settings_v3';
const SFX_VOL_KEY = 'soundboard_sfx_vol_v3';

const INITIAL_MAPPINGS = [
  { code: 'KeyQ', keyLabel: 'Q', soundLabel: '정답 딩동댕', audioBuffer: null, color: 'bg-green-600', type: 'sfx', isDecoding: false },
  { code: 'KeyW', keyLabel: 'W', soundLabel: '오답 땡', audioBuffer: null, color: 'bg-red-600', type: 'sfx', isDecoding: false },
  { code: 'KeyE', keyLabel: 'E', soundLabel: '박수 함성', audioBuffer: null, color: 'bg-blue-600', type: 'sfx', isDecoding: false },
  { code: 'KeyA', keyLabel: 'A', soundLabel: '두구두구', audioBuffer: null, color: 'bg-purple-600', type: 'sfx', isDecoding: false },
  { code: 'KeyS', keyLabel: 'S', soundLabel: '웃음 소리', audioBuffer: null, color: 'bg-yellow-500', type: 'sfx', isDecoding: false },
  { code: 'KeyD', keyLabel: 'D', soundLabel: '등장 효과음', audioBuffer: null, color: 'bg-pink-600', type: 'sfx', isDecoding: false },
  { code: 'Numpad7', keyLabel: 'Num 7', soundLabel: '메인 테마 BGM', audioBuffer: null, color: 'bg-indigo-600', type: 'bgm', isDecoding: false, loop: true, volume: 1.0 },
  { code: 'Numpad8', keyLabel: 'Num 8', soundLabel: '마을 배경음', audioBuffer: null, color: 'bg-violet-600', type: 'bgm', isDecoding: false, loop: true, volume: 1.0 },
  { code: 'Numpad9', keyLabel: 'Num 9', soundLabel: '전투/긴장 BGM', audioBuffer: null, color: 'bg-slate-700', type: 'bgm', isDecoding: false, loop: true, volume: 1.0 },
  { code: 'Numpad4', keyLabel: 'Num 4', soundLabel: '슬픈 장면', audioBuffer: null, color: 'bg-teal-600', type: 'bgm', isDecoding: false, loop: true, volume: 1.0 },
  { code: 'Numpad5', keyLabel: 'Num 5', soundLabel: '회상 씬', audioBuffer: null, color: 'bg-orange-600', type: 'bgm', isDecoding: false, loop: true, volume: 1.0 },
  { code: 'Numpad6', keyLabel: 'Num 6', soundLabel: '엔딩 크레딧', audioBuffer: null, color: 'bg-rose-600', type: 'bgm', isDecoding: false, loop: true, volume: 1.0 }
];

const SoundButton = memo(({ sound, isActive, isEditMode, bgmUIState, onAction, onFileUpload, onLabelChange }) => {
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
    <div className="relative w-full h-full flex flex-col min-h-[120px]">
      <input type="file" accept="audio/*" ref={fileInputRef} className="hidden" onChange={(e) => onFileUpload(sound.code, e)} />
      
      {isEditMode ? (
        <div className={`p-3 rounded-xl flex flex-col justify-between border-2 border-dashed h-full transition-colors ${sound.isDecoding ? 'border-yellow-500 bg-yellow-900/30' : hasAudio ? 'border-emerald-500 bg-slate-800' : 'border-slate-500 bg-slate-800/50'}`}>
          <span className="text-xs font-bold text-slate-400 mb-1">{sound.keyLabel}</span>
          <input
            type="text"
            value={sound.soundLabel}
            onChange={(e) => onLabelChange(sound.code, e.target.value)}
            className="w-full bg-slate-700 text-white text-sm p-1.5 mb-2 rounded border border-slate-600 focus:outline-none focus:border-blue-400 focus:ring-1 focus:ring-blue-400"
            placeholder="이름 입력"
            disabled={sound.isDecoding}
          />
          <button 
            onClick={() => fileInputRef.current?.click()} 
            disabled={sound.isDecoding}
            className={`w-full text-xs font-medium py-2 rounded shadow-sm transition-colors ${sound.isDecoding ? 'bg-yellow-600 text-yellow-100 cursor-wait' : hasAudio ? 'bg-slate-600 hover:bg-slate-500 text-white' : 'bg-blue-600 hover:bg-blue-500 text-white'}`}
          >
            {sound.isDecoding ? '⏳ 디코딩 중...' : hasAudio ? '🔁 변경' : '📁 음원 등록'}
          </button>
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
            relative p-4 rounded-xl shadow-md flex flex-col items-center justify-center
            transition-all duration-75 select-none w-full h-full border-2
            ${!hasAudio ? 'bg-slate-800 border-dashed border-slate-600 opacity-60' : 'border-transparent'}
            ${sound.isDecoding ? 'bg-yellow-700 opacity-70 cursor-wait' : hasAudio ? sound.color : 'cursor-not-allowed'} text-white
            ${isActive && hasAudio && !sound.isDecoding ? 'scale-95 brightness-75 shadow-inner' : (hasAudio && !sound.isDecoding ? 'hover:brightness-110 hover:shadow-lg active:scale-95' : '')}
            ${bgmUIState === 'playing' ? 'ring-4 ring-green-400 ring-opacity-60 border-transparent shadow-[0_0_15px_rgba(74,222,128,0.5)]' : ''}
          `}
        >
          {hasAudio && bgmUIState && (
            <div className="absolute top-2 right-2 text-sm drop-shadow-md">
              {bgmUIState === 'playing' && <span className="inline-block animate-pulse">🔊</span>}
              {bgmUIState === 'paused' && <span className="opacity-70">⏸️</span>}
              {bgmUIState === 'fading' && <span className="text-amber-300">📉</span>}
            </div>
          )}

          <span className="absolute top-2 left-3 text-[10px] tracking-wider font-bold opacity-80 bg-black/30 px-2 py-0.5 rounded-md">
            {sound.keyLabel}
          </span>
          
          <div className="flex flex-col items-center mt-3">
            {!hasAudio ? (
              <>
                <span className="text-2xl opacity-40 mb-1">➕</span>
                <span className="text-sm font-medium opacity-60">비어있음</span>
              </>
            ) : (
              <span className="text-base sm:text-lg font-bold text-center px-1 leading-tight break-keep">
                {sound.isDecoding ? '⏳ 로딩...' : sound.soundLabel}
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
          return found ? { ...init, soundLabel: found.soundLabel, loop: found.loop ?? init.loop, volume: found.volume ?? init.volume } : init;
        });
      } catch (e) {
        return INITIAL_MAPPINGS;
      }
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
  
  // Refs for State (Stale Closure & Dependency Avoidance)
  const mappingsRef = useRef(mappings);
  const isEditModeRef = useRef(isEditMode);
  const sfxVolumeRef = useRef(sfxVolume);
  
  useEffect(() => { mappingsRef.current = mappings; }, [mappings]);
  useEffect(() => { isEditModeRef.current = isEditMode; }, [isEditMode]);
  useEffect(() => { sfxVolumeRef.current = sfxVolume; }, [sfxVolume]);

  const showToast = useCallback((msg, type = 'error') => {
    setToast({ msg, type });
    if (toastTimerRef.current) clearTimeout(toastTimerRef.current);
    toastTimerRef.current = setTimeout(() => setToast(null), 3500);
  }, []);

  // Debounced LocalStorage Save
  useEffect(() => {
    const id = setTimeout(() => {
      const toSave = mappings.map(({ code, soundLabel, loop, volume }) => ({ code, soundLabel, loop, volume }));
      localStorage.setItem(STORAGE_KEY, JSON.stringify(toSave));
      localStorage.setItem(SFX_VOL_KEY, sfxVolume.toString());
    }, 300);
    return () => clearTimeout(id);
  }, [mappings, sfxVolume]);

  const initAudioContext = useCallback(() => {
    if (!audioCtxRef.current) {
      audioCtxRef.current = new (window.AudioContext || window.webkitAudioContext)();
    }
    if (audioCtxRef.current.state === 'suspended') {
      audioCtxRef.current.resume();
    }
    return audioCtxRef.current;
  }, []);

  const syncBGMStateToUI = useCallback(() => {
    const nextState = {};
    activeNodesRef.current.forEach((nodeData, code) => {
      nextState[code] = nodeData.state;
    });
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

    const tid = setTimeout(() => {
      stopBGM(code);
    }, fadeDuration * 1000);
    
    nodeData.timeoutId = tid;
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
        
        // 버그 수정 2: 오프셋 클램핑 (루프가 꺼져있을 때 곡 길이를 초과하는 오프셋 방어)
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
      gainNode.gain.value = currentSoundObj.volume;
      
      source.connect(gainNode);
      gainNode.connect(ctx.destination);
      
      source.onended = () => stopBGM(currentSoundObj.code);
      source.start(0);
      
      activeNodesRef.current.set(currentSoundObj.code, {
        source,
        gainNode,
        buffer: currentSoundObj.audioBuffer,
        startTime: ctx.currentTime,
        startOffset: 0,
        state: 'playing',
        timeoutId: null
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
          
          // 버그 수정 1: setState 대신 ref를 참조하여 안전하게 사이드이펙트 제거
          gainNode.gain.value = sfxVolumeRef.current;
          
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

  // 버그 수정 3: 의존성 배열에서 isEditMode를 제거하고 Ref 사용 (재등록 방지)
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
        if (nodeData.source) {
          nodeData.source.onended = null;
          try { nodeData.source.stop(); } catch (e) {}
        }
      });
      if (audioCtxRef.current && audioCtxRef.current.state !== 'closed') {
        audioCtxRef.current.close();
      }
    };
  }, []);

  const handleFileUpload = useCallback(async (code, event) => {
    const file = event.target.files[0];
    if (!file) return;

    setMappings(prev => prev.map(s => s.code === code ? { ...s, isDecoding: true } : s));
    
    const ctx = initAudioContext();
    if (!ctx) {
      setMappings(prev => prev.map(s => s.code === code ? { ...s, isDecoding: false } : s));
      showToast("오디오 엔진을 초기화할 수 없습니다.", "error");
      return; 
    }

    try {
      const arrayBuffer = await file.arrayBuffer();
      const audioBuffer = await ctx.decodeAudioData(arrayBuffer);
      const defaultLabel = file.name.replace(/\.[^/.]+$/, "");
      
      stopBGM(code);

      setMappings(prev => prev.map(s => 
        s.code === code ? { ...s, audioBuffer, soundLabel: defaultLabel, isDecoding: false } : s
      ));
      
      showToast(`${defaultLabel} 등록 완료`, 'success');
      
    } catch (error) {
      let errMsg = "파일을 읽을 수 없습니다.";
      if (error.name === 'EncodingError' || error.name === 'DataCloneError') {
        errMsg += " (지원하지 않는 포맷이거나 파일이 손상되었습니다)";
      } else {
        errMsg += ` (${error.message || error.name})`;
      }
      showToast(errMsg, 'error');
      setMappings(prev => prev.map(s => s.code === code ? { ...s, isDecoding: false } : s));
    } finally {
      event.target.value = null;
    }
  }, [initAudioContext, stopBGM, showToast]);

  const handleLabelChange = useCallback((code, newLabel) => {
    setMappings(prev => prev.map(s => s.code === code ? { ...s, soundLabel: newLabel } : s));
  }, []);

  const handleBGMSettingChange = useCallback((code, setting, value) => {
    setMappings(prev => prev.map(s => s.code === code ? { ...s, [setting]: value } : s));
    
    const nodeData = activeNodesRef.current.get(code);
    if (nodeData) {
      if (setting === 'volume' && nodeData.state !== 'fading') {
        nodeData.gainNode.gain.value = value;
      } else if (setting === 'loop' && nodeData.source) {
        nodeData.source.loop = value; 
      }
    }
  }, []);

  // UX 1 & 4: 앱(App) 스타일의 Flex 레이아웃 구조 (h-screen / h-[100dvh]) 적용
  return (
    <div className="h-screen sm:h-[100dvh] flex flex-col bg-slate-900 text-slate-100 font-sans overflow-hidden">
      
      {/* Toast Notification (UX 5) */}
      {toast && (
        <div className="fixed top-24 left-1/2 transform -translate-x-1/2 z-50 animate-slide-down pointer-events-none">
          <div className={`px-4 py-3 rounded-full shadow-2xl border flex items-center gap-3 backdrop-blur-md ${toast.type === 'error' ? 'bg-rose-900/90 border-rose-500/50 text-rose-100' : 'bg-emerald-900/90 border-emerald-500/50 text-emerald-100'}`}>
             <span className="text-xl leading-none">{toast.type === 'error' ? '⚠️' : '✅'}</span>
             <span className="font-medium text-sm whitespace-nowrap">{toast.msg}</span>
          </div>
        </div>
      )}

      {/* Header 영역 */}
      <header className="flex-shrink-0 p-5 border-b border-slate-800 bg-slate-900 z-30 shadow-md">
        <div className="max-w-6xl mx-auto flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
          <div>
            <div className="flex items-center gap-3">
              <h1 className="text-2xl font-extrabold tracking-tight">🎭 마스터 사운드보드</h1>
              {!isEditMode && (
                <span className="hidden md:inline-flex items-center bg-slate-800 border border-slate-700 text-slate-300 text-[11px] px-2.5 py-1 rounded-full whitespace-nowrap">
                  ⌨️ 알파벳(SFX) / 숫자 키패드(BGM)
                </span>
              )}
            </div>
            <div className="flex items-center gap-2 mt-3 text-sm text-slate-400">
              <span>⚡ 전체 효과음 볼륨:</span>
              <input 
                type="range" min="0" max="1" step="0.01" 
                value={sfxVolume} onChange={(e) => setSfxVolume(parseFloat(e.target.value))}
                className="w-24 h-1.5 bg-slate-700 rounded-lg appearance-none cursor-pointer accent-green-500"
              />
            </div>
          </div>

          <button 
            onClick={() => setIsEditMode(!isEditMode)}
            className={`px-5 py-2.5 rounded-lg font-bold text-sm transition-all flex items-center gap-2 ${isEditMode ? 'bg-emerald-500 hover:bg-emerald-600 text-white shadow-lg shadow-emerald-500/20 ring-2 ring-emerald-400 ring-offset-2 ring-offset-slate-900' : 'bg-slate-700 hover:bg-slate-600 border border-slate-600'}`}
          >
            {isEditMode ? '💾 설정 완료 (재생 모드)' : '⚙️ 사운드 편집/배치'}
          </button>
        </div>
      </header>

      {/* Main Board 영역 (독립 스크롤, 패널 가림 해결) */}
      <main className="flex-grow p-4 lg:p-6 overflow-y-auto z-10 custom-scrollbar">
        <div className="max-w-6xl mx-auto">
          
          {isEditMode && (
             <div className="mb-6 p-4 bg-blue-500/10 border border-blue-500/30 rounded-xl text-blue-300 text-sm flex items-start gap-3">
               <span className="text-xl mt-0.5">💡</span>
               <div>
                 <p className="mb-1"><strong>SFX(효과음)</strong>: 누를 때마다 소리가 다중 재생됩니다.</p>
                 <p><strong>BGM(배경음)</strong>: 단축키/클릭으로 <strong>재생 및 일시정지</strong>가 가능하며, 새로운 곡 재생 시 기존 곡은 자동 페이드아웃 됩니다.</p>
               </div>
             </div>
          )}

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 lg:gap-8 items-start">
            
            {/* SFX 패널 */}
            <div className="bg-slate-800/40 p-5 rounded-2xl border border-slate-700/50 shadow-xl">
              <h2 className="text-lg font-bold mb-5 flex items-center gap-2 text-slate-200">
                ⚡ 즉각 효과음 <span className="text-[11px] font-normal text-emerald-400 bg-emerald-400/10 px-2 py-0.5 rounded border border-emerald-400/20">다중 재생</span>
              </h2>
              <div className="grid grid-cols-3 gap-3 lg:gap-4">
                {mappings.filter(s => s.type === 'sfx').map(sound => (
                  <SoundButton 
                    key={sound.code} sound={sound} 
                    isActive={activeKeys.has(sound.code)} isEditMode={isEditMode} bgmUIState={null} 
                    onAction={handleSoundAction} onFileUpload={handleFileUpload} onLabelChange={handleLabelChange} 
                  />
                ))}
              </div>
            </div>

            {/* BGM 패널 */}
            <div className="bg-slate-800/40 p-5 rounded-2xl border border-slate-700/50 shadow-xl">
              <h2 className="text-lg font-bold mb-5 flex items-center gap-2 text-slate-200">
                🎵 배경음악 <span className="text-[11px] font-normal text-blue-400 bg-blue-400/10 px-2 py-0.5 rounded border border-blue-400/20">토글 및 제어</span>
              </h2>
              <div className="grid grid-cols-3 gap-3 lg:gap-4">
                {mappings.filter(s => s.type === 'bgm').map(sound => (
                  <SoundButton 
                    key={sound.code} sound={sound} 
                    isActive={activeKeys.has(sound.code)} isEditMode={isEditMode} bgmUIState={bgmUIStates[sound.code]} 
                    onAction={handleSoundAction} onFileUpload={handleFileUpload} onLabelChange={handleLabelChange} 
                  />
                ))}
              </div>
            </div>

          </div>
        </div>
      </main>

      {/* Footer BGM Control 영역 (Flex-shrink 구조로 하단 고정) */}
      {Object.keys(bgmUIStates).length > 0 && (
        <footer className="flex-shrink-0 bg-slate-800/95 backdrop-blur-md border-t border-slate-700 p-4 z-20 shadow-[0_-10px_30px_rgba(0,0,0,0.4)] animate-slide-up">
          <div className="max-w-6xl mx-auto">
            <div className="flex flex-wrap gap-4 items-center justify-center lg:justify-start">
              {Object.entries(bgmUIStates).map(([code, uiState]) => {
                const soundData = mappings.find(s => s.code === code);
                if (!soundData) return null;

                return (
                  <div key={code} className="flex flex-col gap-3 bg-slate-900 border border-slate-700 rounded-lg p-3 min-w-[320px] flex-grow max-w-md shadow-lg">
                    
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2.5 overflow-hidden w-full">
                        <div className={`flex-shrink-0 w-2.5 h-2.5 rounded-full ${uiState === 'playing' ? 'bg-green-500 animate-pulse shadow-[0_0_8px_rgba(34,197,94,0.6)]' : uiState === 'fading' ? 'bg-amber-500' : 'bg-slate-500'}`}></div>
                        <span className="font-medium text-sm truncate flex-grow mr-2 text-slate-200">
                          {soundData.soundLabel} <span className="text-xs text-slate-500 font-normal">({soundData.keyLabel})</span>
                        </span>
                        {uiState === 'fading' && <span className="flex-shrink-0 text-[10px] text-amber-400 border border-amber-400/30 bg-amber-400/10 px-1.5 py-0.5 rounded">Fade Out</span>}
                      </div>

                      <div className="flex gap-1 flex-shrink-0">
                        <button 
                          onClick={() => handleBGMPlayback(soundData, 'toggle')} 
                          disabled={uiState === 'fading'}
                          className="w-9 h-9 flex items-center justify-center bg-slate-700 hover:bg-slate-600 disabled:opacity-50 rounded transition-colors text-base"
                        >
                          {uiState === 'paused' ? '▶️' : '⏸️'}
                        </button>
                        <button 
                          onClick={() => fadeOutBGM(code)}
                          disabled={uiState === 'fading'}
                          className="w-9 h-9 flex items-center justify-center bg-slate-700 hover:bg-slate-600 disabled:opacity-50 rounded transition-colors"
                          title="자연스럽게 정지"
                        >
                          📉
                        </button>
                        <button 
                          onClick={() => stopBGM(code)}
                          className="w-9 h-9 flex items-center justify-center bg-rose-900/40 hover:bg-rose-700 text-rose-300 hover:text-white rounded transition-colors"
                        >
                          ⏹️
                        </button>
                      </div>
                    </div>

                    <div className="flex items-center justify-between gap-4 px-1">
                      <label className="flex items-center gap-2 text-xs text-slate-300 w-full">
                        🔈
                        <input 
                          type="range" min="0" max="1" step="0.01" 
                          value={soundData.volume} onChange={(e) => handleBGMSettingChange(code, 'volume', parseFloat(e.target.value))}
                          className="flex-grow h-1.5 bg-slate-700 rounded-lg appearance-none cursor-pointer accent-blue-500"
                        />
                      </label>
                      <button 
                        onClick={() => handleBGMSettingChange(code, 'loop', !soundData.loop)}
                        className={`flex-shrink-0 text-[11px] px-2 py-1 rounded transition-colors border ${soundData.loop ? 'bg-blue-900/50 border-blue-500/50 text-blue-300' : 'bg-slate-800 border-slate-600 text-slate-500'}`}
                      >
                        {soundData.loop ? '🔁 반복 켬' : '➡️ 반복 끔'}
                      </button>
                    </div>

                  </div>
                );
              })}
            </div>
          </div>
        </footer>
      )}
      
      <style>{`
        @keyframes slide-up { from { transform: translateY(100%); opacity: 0; } to { transform: translateY(0); opacity: 1; } }
        .animate-slide-up { animation: slide-up 0.25s cubic-bezier(0.16, 1, 0.3, 1) forwards; }
        
        @keyframes slide-down { 
          0% { transform: translate(-50%, -100%); opacity: 0; } 
          10% { transform: translate(-50%, 0); opacity: 1; }
          90% { transform: translate(-50%, 0); opacity: 1; }
          100% { transform: translate(-50%, -100%); opacity: 0; }
        }
        .animate-slide-down { animation: slide-down 3.5s cubic-bezier(0.16, 1, 0.3, 1) forwards; }

        /* 커스텀 스크롤바 디자인 */
        .custom-scrollbar::-webkit-scrollbar { width: 8px; }
        .custom-scrollbar::-webkit-scrollbar-track { background: rgba(30, 41, 59, 0.5); }
        .custom-scrollbar::-webkit-scrollbar-thumb { background: rgba(71, 85, 105, 0.8); border-radius: 4px; }
        .custom-scrollbar::-webkit-scrollbar-thumb:hover { background: rgba(100, 116, 139, 1); }
      `}</style>
    </div>
  );
};

export default SoundBoard;