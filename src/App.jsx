import React, { useState, useEffect, useCallback, useRef } from 'react';
import { saveSoundFile, deleteSoundFile, loadAllSoundFiles } from './db.js';
import { INITIAL_MAPPINGS, STORAGE_KEY, SFX_VOL_KEY, blobToBase64 } from './constants.js';
import { useAudioEngine } from './hooks/useAudioEngine.js';
import { useCueList } from './hooks/useCueList.js';
import KeycapButton from './components/KeycapButton.jsx';
import ConfirmDialog from './components/ConfirmDialog.jsx';
import BgmFooter from './components/BgmFooter.jsx';
import { CueBuilderPanel, CueGoBar } from './components/CuePanel.jsx';
import { ExportImportBar, EditGuideBar } from './components/EditPanels.jsx';

const SoundBoard = () => {
  const [mappings, setMappings] = useState(() => {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        return INITIAL_MAPPINGS.map(init => {
          const found = parsed.find(p => p.code === init.code);
          return found
            ? { ...init, soundLabel: found.soundLabel, loop: found.loop ?? init.loop, volume: found.volume ?? init.volume }
            : init;
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
  const [toast, setToast] = useState(null);
  const [, forceTick] = useState(0);
  const [pendingDeleteCode, setPendingDeleteCode] = useState(null);
  const [pendingImportFile, setPendingImportFile] = useState(null);

  const toastTimerRef = useRef(null);
  const importInputRef = useRef(null);

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

  const {
  initAudioContext, bgmUIStates, sfxPlayingCodes, stopBGM, fadeOutBGM, seekBGM,
  handleBGMPlayback, toggleSfx, getPlaybackInfo, handlePanicStop: enginePanicStop,
  } = useAudioEngine({ mappingsRef, sfxVolumeRef });

  const {
  cueList, cueIndex, isCueMode, setIsCueMode,
  cueAddSelection, setCueAddSelection, isCueModeRef,
  triggerNextCue, resetCue, addCue, removeCue, moveCue, clearCueList, setCueList, setCueIndex,
  } = useCueList({ mappingsRef, playSfx: toggleSfx, handleBGMPlayback, showToast });

  useEffect(() => {
    const id = setTimeout(() => {
      const toSave = mappings.map(({ code, soundLabel, loop, volume }) => ({ code, soundLabel, loop, volume }));
      localStorage.setItem(STORAGE_KEY, JSON.stringify(toSave));
      localStorage.setItem(SFX_VOL_KEY, sfxVolume.toString());
    }, 300);
    return () => clearTimeout(id);
  }, [mappings, sfxVolume]);

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
        console.warn('IndexedDB 복원 실패:', e);
      }
    };
    restoreUploadedFiles();
  }, [initAudioContext]);

  useEffect(() => {
    const hasPlaying = Object.values(bgmUIStates).some(s => s === 'playing');
    if (!hasPlaying) return;
    const id = setInterval(() => forceTick(t => t + 1), 250);
    return () => clearInterval(id);
  }, [bgmUIStates]);

  const handleSoundAction = useCallback((code, isDown) => {
    const soundObj = mappingsRef.current.find(s => s.code === code);
    if (!soundObj || !soundObj.audioBuffer || soundObj.isDecoding) return;

    if (isDown) {
      setActiveKeys(prev => new Set(prev).add(code));
      if (soundObj.type === 'sfx') {
        toggleSfx(soundObj);
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
  }, [toggleSfx, handleBGMPlayback]);

  const handlePanicStop = useCallback(() => {
    enginePanicStop();
    setActiveKeys(new Set());
    showToast('전체 정지되었습니다', 'success');
  }, [enginePanicStop, showToast]);

  useEffect(() => {
    const isTypingTarget = () => ['INPUT', 'SELECT', 'TEXTAREA'].includes(document.activeElement.tagName);

    const handleKeyDown = (e) => {
      if (isTypingTarget()) return;
      if (e.code === 'Escape') { e.preventDefault(); handlePanicStop(); return; }
      if (isCueModeRef.current && e.code === 'Space' && !isEditModeRef.current) {
        e.preventDefault();
        triggerNextCue();
        return;
      }
      if (e.repeat || isEditModeRef.current) return;
      handleSoundAction(e.code, true);
    };
    const handleKeyUp = (e) => {
      if (isTypingTarget() || isEditModeRef.current) return;
      handleSoundAction(e.code, false);
    };
    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
    };
  }, [handleSoundAction, triggerNextCue, handlePanicStop, isCueModeRef]);

  const handleFileUpload = useCallback(async (code, event) => {
    const file = event.target.files[0];
    if (!file) return;
    setMappings(prev => prev.map(s => s.code === code ? { ...s, isDecoding: true } : s));

    const ctx = initAudioContext();
    if (!ctx) {
      setMappings(prev => prev.map(s => s.code === code ? { ...s, isDecoding: false } : s));
      showToast('오디오 엔진을 초기화할 수 없습니다.', 'error'); return;
    }

    try {
      const arrayBuffer = await file.arrayBuffer();
      const audioBuffer = await ctx.decodeAudioData(arrayBuffer);
      const defaultLabel = file.name.replace(/\.[^/.]+$/, '');
      stopBGM(code);
      await saveSoundFile(code, file);
      setMappings(prev => prev.map(s => s.code === code ? { ...s, audioBuffer, soundLabel: defaultLabel, isDecoding: false } : s));
      showToast(`${defaultLabel} 등록 완료`, 'success');
    } catch (error) {
      showToast('지원하지 않는 파일이거나 손상되었습니다.', 'error');
      setMappings(prev => prev.map(s => s.code === code ? { ...s, isDecoding: false } : s));
    } finally {
      event.target.value = null;
    }
  }, [initAudioContext, stopBGM, showToast]);

  const handleDeleteSound = useCallback((code) => {
    stopBGM(code);
    deleteSoundFile(code).catch(() => {});
    setMappings(prev => prev.map(s => s.code === code ? { ...s, audioBuffer: null } : s));
    showToast('음원이 삭제되었습니다', 'success');
  }, [stopBGM, showToast]);

  const requestDeleteSound = useCallback((code) => setPendingDeleteCode(code), []);
  const cancelDeleteSound = useCallback(() => setPendingDeleteCode(null), []);
  const confirmDeleteSound = useCallback(() => {
    if (pendingDeleteCode) handleDeleteSound(pendingDeleteCode);
    setPendingDeleteCode(null);
  }, [pendingDeleteCode, handleDeleteSound]);

  const handleExportSettings = useCallback(async () => {
    try {
      showToast('내보내기 준비 중...', 'success');
      const fileBlobs = await loadAllSoundFiles();
      const soundsExport = await Promise.all(mappingsRef.current.map(async (s) => {
        let fileData = null, fileType = null;
        if (fileBlobs[s.code]) {
          fileData = await blobToBase64(fileBlobs[s.code]);
          fileType = fileBlobs[s.code].type || 'audio/mpeg';
        }
        return { code: s.code, soundLabel: s.soundLabel, loop: s.loop, volume: s.volume, fileData, fileType };
      }));

      const payload = {
        version: 2,
        exportedAt: new Date().toISOString(),
        sfxVolume: sfxVolumeRef.current,
        cueList,
        sounds: soundsExport,
      };

      const blob = new Blob([JSON.stringify(payload)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `soundboard-settings-${new Date().toISOString().slice(0, 10)}.json`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
      showToast('설정을 내보냈습니다', 'success');
    } catch (e) {
      console.error(e);
      showToast('내보내기에 실패했습니다', 'error');
    }
  }, [showToast, cueList]);

  const handleImportFileSelected = useCallback((event) => {
    const file = event.target.files[0];
    if (!file) return;
    setPendingImportFile(file);
  }, []);

  const cancelImport = useCallback(() => {
    setPendingImportFile(null);
    if (importInputRef.current) importInputRef.current.value = null;
  }, []);

  const confirmImport = useCallback(async () => {
    const file = pendingImportFile;
    setPendingImportFile(null);
    if (importInputRef.current) importInputRef.current.value = null;
    if (!file) return;

    try {
      const text = await file.text();
      const payload = JSON.parse(text);
      if (!Array.isArray(payload.sounds)) throw new Error('형식이 올바르지 않습니다');

      const ctx = initAudioContext();
      showToast('설정을 불러오는 중...', 'success');

      for (const s of payload.sounds) {
        const isKnownCode = INITIAL_MAPPINGS.some(m => m.code === s.code);
        if (!isKnownCode) continue;

        let audioBuffer = null;
        if (s.fileData) {
          try {
            const resp = await fetch(s.fileData);
            const blob = await resp.blob();
            await saveSoundFile(s.code, blob);
            audioBuffer = await ctx.decodeAudioData(await blob.arrayBuffer());
          } catch (e) {
            console.warn(`파일 복원 실패 (${s.code}):`, e);
          }
        }

        setMappings(prev => prev.map(m => m.code === s.code ? {
          ...m,
          soundLabel: s.soundLabel ?? m.soundLabel,
          loop: s.loop ?? m.loop,
          volume: s.volume ?? m.volume,
          audioBuffer: audioBuffer ?? m.audioBuffer,
        } : m));
      }

      if (Array.isArray(payload.cueList)) setCueList(payload.cueList);
      if (typeof payload.sfxVolume === 'number') setSfxVolume(payload.sfxVolume);

      showToast('설정을 가져왔습니다', 'success');
    } catch (e) {
      console.error(e);
      showToast('가져오기 실패: 올바른 설정 파일인지 확인하세요', 'error');
    }
  }, [pendingImportFile, initAudioContext, showToast, setCueList]);

  const handleSettingChange = useCallback((code, setting, value) => {
    setMappings(prev => prev.map(s => s.code === code ? { ...s, [setting]: value } : s));
  }, []);

  const getSound = (code) => mappings.find(s => s.code === code);

  return (
    <div className="h-screen sm:h-[100dvh] flex flex-col bg-[#1e232a] text-slate-200 font-sans overflow-hidden">

      {toast && (
        <div className="fixed top-24 left-1/2 transform -translate-x-1/2 z-50 animate-toast pointer-events-none" role="status" aria-live="polite">
          <div className={`px-4 py-3 rounded-full shadow-2xl border flex items-center gap-3 backdrop-blur-md ${
            toast.type === 'error' ? 'bg-rose-900/90 border-rose-500/50 text-rose-100' : 'bg-emerald-900/90 border-emerald-500/50 text-emerald-100'
          }`}>
            <span className="text-xl leading-none">{toast.type === 'error' ? '⚠️' : '✅'}</span>
            <span className="font-medium text-sm whitespace-nowrap">{toast.msg}</span>
          </div>
        </div>
      )}

      <ConfirmDialog
        open={!!pendingDeleteCode}
        title="음원을 삭제할까요?"
        message={`「${getSound(pendingDeleteCode)?.soundLabel || ''}」음원이 자판에서 제거됩니다. 이 작업은 되돌릴 수 없습니다.`}
        confirmLabel="삭제"
        danger
        onConfirm={confirmDeleteSound}
        onCancel={cancelDeleteSound}
      />

      <ConfirmDialog
        open={!!pendingImportFile}
        title="현재 설정을 덮어쓸까요?"
        message="설정 파일을 가져오면 지금 등록된 자판·볼륨·큐 목록이 파일 내용으로 덮어써집니다."
        confirmLabel="가져오기"
        danger
        onConfirm={confirmImport}
        onCancel={cancelImport}
      />

      <header className="flex-shrink-0 p-3 sm:p-5 border-b border-black/40 bg-[#171a1f] z-30 shadow-md">
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
                aria-label="전체 효과음 볼륨"
                className="w-24 h-1.5 bg-slate-700 rounded-lg appearance-none cursor-pointer accent-emerald-500"
              />
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setIsCueMode(v => !v)}
              aria-pressed={isCueMode}
              className={`px-4 py-2.5 rounded-lg font-bold text-sm transition-all flex items-center gap-1.5 border-b-4 active:border-b-0 active:translate-y-1 ${
                isCueMode ? 'bg-purple-600 border-purple-800 text-white shadow-[0_0_15px_rgba(168,85,247,0.4)]' : 'bg-slate-700 border-slate-900 text-slate-200'
              }`}
            >
              🎬 큐 모드
            </button>
            <button
              onClick={handlePanicStop}
              className="px-4 py-2.5 rounded-lg font-bold text-sm bg-rose-600 border-b-4 border-rose-800 text-white active:border-b-0 active:translate-y-1 transition-all flex items-center gap-1.5"
              title="재생 중인 모든 소리를 즉시 정지 (Esc)"
            >
              🛑 전체 정지
            </button>
            <button
              onClick={() => setIsEditMode(!isEditMode)}
              aria-pressed={isEditMode}
              className={`px-5 py-2.5 rounded-lg font-bold text-sm transition-all flex items-center gap-2 border-b-4 active:border-b-0 active:translate-y-1 ${
                isEditMode ? 'bg-emerald-500 border-emerald-700 text-white shadow-[0_0_15px_rgba(16,185,129,0.4)]' : 'bg-slate-700 border-slate-900 text-slate-200'
              }`}
            >
              {isEditMode ? '💾 편집 완료' : '⚙️ 자판 설정'}
            </button>
          </div>
        </div>
      </header>

      <main className="flex-grow p-3 lg:p-6 overflow-y-auto overflow-x-auto z-10 custom-scrollbar flex flex-col items-center justify-start">

        {isEditMode && (
          <ExportImportBar
            onExport={handleExportSettings}
            onImportSelected={handleImportFileSelected}
            importInputRef={importInputRef}
          />
        )}

        {isEditMode && (
          <CueBuilderPanel
            cueList={cueList}
            mappings={mappings}
            cueAddSelection={cueAddSelection}
            setCueAddSelection={setCueAddSelection}
            addCue={addCue}
            moveCue={moveCue}
            removeCue={removeCue}
            clearCueList={clearCueList}
            getSound={getSound}
          />
        )}

        {isCueMode && !isEditMode && (
          <CueGoBar
            cueList={cueList}
            cueIndex={cueIndex}
            getSound={getSound}
            resetCue={resetCue}
            triggerNextCue={triggerNextCue}
          />
        )}

        {isEditMode && <EditGuideBar />}

        <div className="bg-[#2a303c] p-4 sm:p-6 lg:p-8 rounded-2xl shadow-[inset_0_4px_10px_rgba(255,255,255,0.05),0_15px_25px_rgba(0,0,0,0.5)] border border-slate-600/30 flex flex-col xl:flex-row flex-wrap gap-6 xl:gap-10">

          <div>
            <h2 className="text-lg font-bold mb-4 text-slate-400 flex items-center gap-2 ml-2">
              효과음 자판 <span className="text-[10px] font-normal text-emerald-400 bg-emerald-400/10 px-2 py-0.5 rounded">다중 재생</span>
            </h2>
            <div className="flex flex-col gap-3 sm:gap-4 bg-[#222731] p-4 sm:p-6 rounded-xl shadow-inner border border-black/20">
              <div className="flex gap-3 sm:gap-4 ml-0">
                {['KeyQ', 'KeyW', 'KeyE', 'KeyR'].map(code => (
                  <KeycapButton key={code} sound={getSound(code)} isActive={activeKeys.has(code)} isEditMode={isEditMode} bgmUIState={sfxPlayingCodes.has(code) ? 'playing' : null} isCueTarget={isCueMode && !isEditMode && cueList[cueIndex + 1] === code} onAction={handleSoundAction} onFileUpload={handleFileUpload} onSettingChange={handleSettingChange} onDelete={requestDeleteSound} />
                ))}
              </div>
              <div className="flex gap-3 sm:gap-4 ml-4 sm:ml-6">
                {['KeyA', 'KeyS', 'KeyD', 'KeyF'].map(code => (
                  <KeycapButton key={code} sound={getSound(code)} isActive={activeKeys.has(code)} isEditMode={isEditMode} bgmUIState={sfxPlayingCodes.has(code) ? 'playing' : null} isCueTarget={isCueMode && !isEditMode && cueList[cueIndex + 1] === code} onAction={handleSoundAction} onFileUpload={handleFileUpload} onSettingChange={handleSettingChange} onDelete={requestDeleteSound} />
                ))}
              </div>
              <div className="flex gap-3 sm:gap-4 ml-8 sm:ml-12">
                {['KeyZ', 'KeyX', 'KeyC', 'KeyV'].map(code => (
                  <KeycapButton key={code} sound={getSound(code)} isActive={activeKeys.has(code)} isEditMode={isEditMode} bgmUIState={sfxPlayingCodes.has(code) ? 'playing' : null} isCueTarget={isCueMode && !isEditMode && cueList[cueIndex + 1] === code} onAction={handleSoundAction} onFileUpload={handleFileUpload} onSettingChange={handleSettingChange} onDelete={requestDeleteSound} />
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
                <KeycapButton key={code} sound={getSound(code)} isActive={activeKeys.has(code)} isEditMode={isEditMode} bgmUIState={bgmUIStates[code]} isCueTarget={isCueMode && !isEditMode && cueList[cueIndex + 1] === code} onAction={handleSoundAction} onFileUpload={handleFileUpload} onSettingChange={handleSettingChange} onDelete={requestDeleteSound} />
              ))}
            </div>
          </div>

        </div>
      </main>

      <BgmFooter
        bgmUIStates={bgmUIStates}
        getSound={getSound}
        getPlaybackInfo={getPlaybackInfo}
        handleBGMPlayback={handleBGMPlayback}
        fadeOutBGM={fadeOutBGM}
        stopBGM={stopBGM}
        seekBGM={seekBGM}
        handleSettingChange={handleSettingChange}
      />

      <style>{`
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