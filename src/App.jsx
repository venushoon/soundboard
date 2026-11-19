import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { loadAllSoundFiles } from './db.js';
import { api, STORAGE_MODE } from './storage/api.js';
import LibraryPanel from './components/LibraryPanel.jsx';
import { INITIAL_MAPPINGS, STORAGE_KEY, SFX_CODES, blobToBase64 } from './constants.js';

// mappings에서 효과음 배치만 추려 뱅크 저장용 형태로 변환
const sfxAssignmentsOf = (list) => (list || [])
  .filter(m => SFX_CODES.includes(m.code))
  .map(({ code, soundId, soundLabel, loop, volume, color }) => ({ code, soundId: soundId || null, soundLabel, loop: !!loop, volume: volume ?? 1.0, color: color || null }));
import { useAudioEngine } from './hooks/useAudioEngine.js';
import { useCueList } from './hooks/useCueList.js';
import KeycapButton from './components/KeycapButton.jsx';
import ConfirmDialog from './components/ConfirmDialog.jsx';
import BgmFooter from './components/BgmFooter.jsx';
import MixerPanel from './components/MixerPanel.jsx';
import MixerWindow from './components/MixerWindow.jsx';
import { CueGoBar } from './components/CuePanel.jsx';
import { ExportImportBar, EditGuideBar } from './components/EditPanels.jsx';
import WindowPortal from './components/WindowPortal.jsx';
import CuePlayerWindow from './components/CuePlayerWindow.jsx';

let localFileSeq = 1;

// 라이브러리 사운드의 재생 메타(적용 게인·페이드·재생 구간)를 자판 매핑에 실을 형태.
// 엔진은 매핑에 실린 이 값들로 페이드와 구간 재생을 수행한다.
const playMetaOf = (sound) => sound ? {
  soundGainDb: sound.gainDb ?? 0,
  fadeInSec: sound.fadeInSec ?? 0,
  fadeOutSec: sound.fadeOutSec ?? 0,
  startSec: sound.startSec ?? 0,
  endSec: typeof sound.endSec === 'number' ? sound.endSec : null,
} : { soundGainDb: 0, fadeInSec: 0, fadeOutSec: 0, startSec: 0, endSec: null };
const EMPTY_PLAY_META = playMetaOf(null);

const SoundBoard = () => {
  const [mappings, setMappings] = useState(() => {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        return INITIAL_MAPPINGS.map(init => {
          const found = parsed.find(p => p.code === init.code);
          return found
            ? { ...init, soundLabel: found.soundLabel, loop: found.loop ?? init.loop, volume: found.volume ?? init.volume, color: found.color || init.color }
            : init;
        });
      } catch { return INITIAL_MAPPINGS; }
    }
    return INITIAL_MAPPINGS;
  });

  // 큐 목록에 로컬/드라이브에서 직접 불러온 음원의 디코딩된 AudioBuffer 맵 (code -> AudioBuffer)
  const [localBuffers, setLocalBuffers] = useState({});

  // 전체 SFX 마스터 볼륨은 제거됨 — 사운드별 음량 정규화 + 키별 볼륨으로 대체, 마스터는 1.0 고정
  const sfxVolume = 1.0;

  // 효과음 뱅크 (A/B): mappings는 항상 "현재 뱅크"의 배치만 들고 있고, banks에 뱅크별 배치를 보관한다
  const [sfxBank, setSfxBank] = useState('A');
  const [banks, setBanks] = useState({ A: null, B: null });
  const switchingBankRef = useRef(false);

  const [activeKeys, setActiveKeys] = useState(new Set());
  const [isEditMode, setIsEditMode] = useState(false);
  const [toast, setToast] = useState(null);
  const [, forceTick] = useState(0);
  const [pendingDeleteCode, setPendingDeleteCode] = useState(null);
  const [showVolumeResetConfirm, setShowVolumeResetConfirm] = useState(false);
  const [pendingImportFile, setPendingImportFile] = useState(null);
  const [cuePopupWin, setCuePopupWin] = useState(null);
  const [mixerWin, setMixerWin] = useState(null);
  const [view, setView] = useState('board');
  const [library, setLibrary] = useState({ categories: [], sounds: [] });
  const [hydrated, setHydrated] = useState(false);
  const [hasBrowserBackup, setHasBrowserBackup] = useState(false);
  const hydratedRef = useRef(false);

  const toastTimerRef = useRef(null);
  const importInputRef = useRef(null);

  const mappingsRef = useRef(mappings);
  const isEditModeRef = useRef(isEditMode);
  const sfxVolumeRef = useRef(sfxVolume);

  useEffect(() => { isEditModeRef.current = isEditMode; }, [isEditMode]);

  const showToast = useCallback((msg, type = 'error') => {
    setToast({ msg, type });
    if (toastTimerRef.current) clearTimeout(toastTimerRef.current);
    toastTimerRef.current = setTimeout(() => setToast(null), 3000);
  }, []);

  const refreshLibrary = useCallback(async () => {
    try {
      const st = await api.getState();
      setLibrary({ categories: st.categories, sounds: st.sounds });
      // 라이브러리에서 바뀐 사운드별 재생 메타(게인·페이드·구간)를 자판 재생에도 즉시 반영
      const metaById = new Map((st.sounds || []).map(s => [s.id, playMetaOf(s)]));
      setMappings(prev => prev.map(m => (
        m.soundId && metaById.has(m.soundId) ? { ...m, ...metaById.get(m.soundId) } : m
      )));
      return st;
    } catch { return null; }
  }, []);

  const libraryAction = useCallback(async (action, ...args) => {
    const result = await api[action](...args);
    await refreshLibrary();
    return result;
  }, [refreshLibrary]);

  const {
    initAudioContext, bgmUIStates, sfxPlayingCodes, stopBGM, fadeOutBGM, seekBGM,
    stopBGMWithFade, getChannelLevel,
    handleBGMPlayback, toggleSfx, stopSfx, fadeOutSfx, getActiveBgmCodes, getPlayingSfxCodes, getPlaybackInfo, handlePanicStop: enginePanicStop,
    applyLiveSetting, setBgmDuck,
  } = useAudioEngine({ mappingsRef, sfxVolumeRef });

  // 멘트 중 덕킹(BGM 일시 줄이기) 상태와 토글
  const [isDucking, setIsDucking] = useState(false);
  const toggleDuck = useCallback(() => {
    const next = !isDucking;
    setIsDucking(next);
    setBgmDuck(next);
  }, [isDucking, setBgmDuck]);

  // 오디오 출력 장치 선택 (Chrome 계열 setSinkId 지원 시에만 UI가 나타난다)
  const [outputDeviceId, setOutputDeviceId] = useState(() => {
    try { return localStorage.getItem('soundboard_output_device') || ''; } catch { return ''; }
  });
  const handleOutputDeviceChange = useCallback((deviceId) => {
    setOutputDeviceId(deviceId);
    try { localStorage.setItem('soundboard_output_device', deviceId); } catch { /* ignore */ }
    const ctx = initAudioContext();
    if (ctx && typeof ctx.setSinkId === 'function') {
      ctx.setSinkId(deviceId).catch(() => showToast('출력 장치를 바꾸지 못했습니다', 'error'));
    }
  }, [initAudioContext, showToast]);

  const handleRemoveLocalCodes = useCallback((codes) => {
    codes.forEach((code) => {
      stopBGM(code);
      // 서버 저장 방식: 큐에서 빼도 서버 파일은 라이브러리에 남아 재사용할 수 있다
    });
    setLocalBuffers((prev) => {
      const next = { ...prev };
      codes.forEach(c => { delete next[c]; });
      return next;
    });
  }, [stopBGM]);

  // --- 큐의 뱅크 독립 재생 ---
  // 큐 항목에 기록된 soundId로 음원을 직접 찾기 위한 디코딩 버퍼 보관소.
  // 활성 뱅크에 배치돼 있지 않은 음원(다른 뱅크·큐 전용)도 여기 있으면 바로 재생된다.
  const libraryRef = useRef(library);
  useEffect(() => { libraryRef.current = library; }, [library]);
  const cueBuffersRef = useRef(new Map());
  const cueWarmRef = useRef(new Set());
  const warmCueBuffer = useCallback((soundId) => {
    if (!soundId || cueBuffersRef.current.has(soundId) || cueWarmRef.current.has(soundId)) return;
    cueWarmRef.current.add(soundId);
    (async () => {
      try {
        const ctx = initAudioContext();
        const blob = await api.fetchSoundBlob(soundId);
        const buf = await ctx.decodeAudioData(await blob.arrayBuffer());
        cueBuffersRef.current.set(soundId, buf);
      } catch { /* ignore */ } finally {
        cueWarmRef.current.delete(soundId);
      }
    })();
  }, [initAudioContext]);

  const resolveCueSound = useCallback((item) => {
    if (!item?.soundId) return null;
    const meta = (libraryRef.current?.sounds || []).find(s => s.id === item.soundId);
    if (!meta) return null;
    const live = mappingsRef.current.find(s => s.soundId === item.soundId);
    const buffer = live?.audioBuffer || cueBuffersRef.current.get(item.soundId) || null;
    if (!buffer) { warmCueBuffer(item.soundId); return null; }
    return {
      code: item.code,
      soundId: item.soundId,
      soundLabel: item.soundLabel || meta.name,
      keyLabel: item.code,
      audioBuffer: buffer,
      type: meta.type,
      loop: item.loop ?? false,
      volume: item.volume ?? 1.0,
      ...playMetaOf(meta),
    };
  }, [warmCueBuffer]);

  const {
    cueList, cueIndex, nextPlayableIndex, nextCueItem, nextCueCode,
    isCueMode, setIsCueMode,
    cueAddSelection, setCueAddSelection, isCueModeRef,
    triggerNextCue, playCueAtIndex, selectNextCue, stepNextCue,
    resetCue, addCue, addLocalCue, addDivider, addFadeCue, cancelCueTimers, updateCueItem, updateLocalCueByCode,
    removeCue, moveCue, clearCueList, setCueList,
  } = useCueList({
    mappingsRef,
    playSfx: toggleSfx,
    handleBGMPlayback,
    fadeOutBGM,
    fadeOutSfx,
    getActiveBgmCodes,
    getPlayingSfxCodes,
    showToast,
    onRemoveLocalCodes: handleRemoveLocalCodes,
    resolveCueSound,
  });

  // 자판 키를 큐에 추가할 때 지금 그 키에 배치된 음원을 함께 기록한다(뱅크 독립).
  const handleAddCue = useCallback((code, memo = '') => {
    const m = mappingsRef.current.find(s => s.code === code);
    addCue(code, memo, m?.soundId ? {
      soundId: m.soundId,
      soundLabel: m.soundLabel,
      audioType: m.type,
      loop: m.loop,
      volume: m.volume,
    } : null);
  }, [addCue]);

  // 자판 음원(mappings) + 큐에 직접 등록된 로컬 음원을 통합한 전체 사운드 목록
  const allSounds = useMemo(() => {
    const soundById = new Map((library.sounds || []).map(s => [s.id, s]));
    const localItemsMap = new Map();
    cueList.forEach((item) => {
      if ((item.source === 'local' || String(item.code).startsWith('local_')) && item.code) {
        if (!localItemsMap.has(item.code)) {
          localItemsMap.set(item.code, {
            code: item.code,
            keyLabel: '📁 로컬',
            soundLabel: item.soundLabel || '로컬 음원',
            audioBuffer: localBuffers[item.code] || null,
            color: 'bg-amber-600',
            type: item.audioType || 'bgm',
            isDecoding: false,
            loop: item.loop ?? false,
            volume: item.volume ?? 1.0,
            ...playMetaOf(item.soundId ? soundById.get(item.soundId) : null),
            isLocalCue: true,
          });
        }
      }
    });
    return [...mappings, ...Array.from(localItemsMap.values())];
  }, [mappings, cueList, localBuffers, library.sounds]);

  useEffect(() => {
    mappingsRef.current = allSounds;
  }, [allSounds]);

  // 로컬(드라이브)에서 오디오 파일(들)을 불러와 큐 목록에 바로 추가
  const handleUploadLocalCueFiles = useCallback(async (files, options = {}) => {
    const fileArray = Array.from(files || []);
    if (fileArray.length === 0) return;

    const ctx = initAudioContext();
    if (!ctx) {
      showToast('오디오 엔진을 초기화할 수 없습니다.', 'error');
      return;
    }

    let addedCount = 0;
    for (const file of fileArray) {
      const localCode = `local_${Date.now()}_${localFileSeq++}`;
      const defaultLabel = file.name.replace(/\.[^/.]+$/, '');
      try {
        const arrayBuffer = await file.arrayBuffer();
        const audioBuffer = await ctx.decodeAudioData(arrayBuffer);
        const meta = await api.uploadSound({ file, categoryName: '큐 음원', type: options.audioType || 'bgm' });
        refreshLibrary();
        setLocalBuffers(prev => ({ ...prev, [localCode]: audioBuffer }));
        addLocalCue({
          code: localCode,
          soundLabel: defaultLabel,
          audioType: options.audioType || 'bgm',
          loop: false,
          volume: 1.0,
          memo: options.memo || '',
          soundId: meta.id,
        });
        addedCount += 1;
      } catch {
        showToast(`「${file.name}」 파일을 불러올 수 없습니다.`, 'error');
      }
    }

    if (addedCount > 0) {
      showToast(
        addedCount === 1
          ? '로컬 음원이 큐에 추가되었습니다'
          : `${addedCount}개의 로컬 음원이 큐에 추가되었습니다`,
        'success'
      );
    }
  }, [initAudioContext, addLocalCue, showToast, refreshLibrary]);

  const openCuePopupWindow = useCallback(() => {
    initAudioContext();
    if (cuePopupWin && !cuePopupWin.closed) {
      cuePopupWin.focus();
      setIsCueMode(true);
      return;
    }
    const win = window.open(
      '',
      'SoundboardCuePlayer',
      'width=560,height=860,left=120,top=80,resizable=yes,scrollbars=yes'
    );
    if (win) {
      setCuePopupWin(win);
      setIsCueMode(true);
      win.focus();
    } else {
      setIsCueMode(true);
      showToast('브라우저 팝업이 차단되었습니다. 주소창에서 팝업 허용 후 다시 눌러주세요.', 'error');
    }
  }, [cuePopupWin, initAudioContext, setIsCueMode, showToast]);

  const closeCuePopupWindow = useCallback(() => {
    setCuePopupWin((prev) => {
      if (prev && !prev.closed) {
        try { prev.close(); } catch { /* ignore */ }
      }
      return null;
    });
    setIsCueMode(false);
  }, [setIsCueMode]);

  const openMixerPopup = useCallback(() => {
    initAudioContext();
    if (mixerWin && !mixerWin.closed) {
      mixerWin.focus();
      return;
    }
    // 크기·위치 옵션을 주면 브라우저가 '팝업형 창'으로 만들어 제목줄 더블클릭 확대 같은
    // OS 기본 동작이 막힌다. 김님 결정으로 옵션을 빼고 일반 브라우저 창/탭으로 연다 —
    // 브라우저 설정에 따라 탭으로 열리면 밖으로 끌어내면 일반 창이 된다.
    const win = window.open('', 'SoundboardMixer');
    if (win) {
      setMixerWin(win);
      win.focus();
    } else {
      showToast('브라우저 팝업이 차단되었습니다. 주소창에서 팝업 허용 후 다시 눌러주세요.', 'error');
    }
  }, [mixerWin, initAudioContext, showToast]);

  const closeMixerPopup = useCallback(() => {
    mixerFitRef.current = null;
    mixerFsRef.current = false;
    setIsMixerFitted(false);
    setMixerWin((prev) => {
      if (prev && !prev.closed) {
        try { prev.close(); } catch { /* ignore */ }
      }
      return null;
    });
  }, []);

  // 믹서 팝업 창을 지금 있는 모니터 화면에 맞추기/원래 크기로 토글.
  // 팝업형 창은 제목줄 더블클릭 확대가 브라우저에서 막혀 있어 버튼으로 제공한다.
  // 크기 조절(moveTo/resizeTo/screen 정보)은 다중 모니터에서 메인 모니터 기준으로 처리되는
  // 브라우저 동작이 실측으로 확인돼서, 주 방식은 전체화면(Fullscreen API)으로 한다 —
  // 전체화면은 OS가 '창이 실제로 있는 모니터'에 띄우므로 모니터를 가리지 않는다.
  const mixerFitRef = useRef(null);
  const mixerFsRef = useRef(false);
  const [isMixerFitted, setIsMixerFitted] = useState(false);

  // 전체화면 상태에서 Esc 등으로 빠져나오면 맞춤 상태를 함께 정리한다.
  useEffect(() => {
    if (!mixerWin || mixerWin.closed) return undefined;
    const doc = mixerWin.document;
    const onFsChange = () => {
      if (!doc.fullscreenElement && mixerFsRef.current) {
        mixerFsRef.current = false;
        mixerFitRef.current = null;
        setIsMixerFitted(false);
      }
    };
    doc.addEventListener('fullscreenchange', onFsChange);
    return () => doc.removeEventListener('fullscreenchange', onFsChange);
  }, [mixerWin]);

  const toggleMixerFit = useCallback(() => {
    const win = mixerWin;
    if (!win || win.closed) return;
    const doc = win.document;
    // 이미 맞춰진 상태면 원래 크기로 복원한다 (전체화면이면 해제 후 잠시 기다려 복원).
    if (mixerFitRef.current) {
      const p = mixerFitRef.current;
      mixerFitRef.current = null;
      const wasFs = mixerFsRef.current || !!doc.fullscreenElement;
      mixerFsRef.current = false;
      setIsMixerFitted(false);
      const restore = () => {
        if (win.closed) return;
        try {
          win.resizeTo(p.w, p.h);
          win.moveTo(p.x, p.y);
          win.focus();
        } catch { /* ignore */ }
      };
      if (wasFs) {
        try { doc.exitFullscreen().catch(() => {}); } catch { /* ignore */ }
        setTimeout(restore, 300);
      } else {
        restore();
      }
      return;
    }
    mixerFitRef.current = { x: win.screenX, y: win.screenY, w: win.outerWidth, h: win.outerHeight };
    setIsMixerFitted(true);
    win.focus();
    const el = doc.documentElement;
    if (el.requestFullscreen) {
      el.requestFullscreen()
        .then(() => { mixerFsRef.current = true; })
        .catch(() => {
          // 전체화면이 거부된 환경에서만 크기 조절 방식으로 맞춘다.
          mixerFsRef.current = false;
          const s = win.screen;
          try {
            win.moveTo(typeof s.availLeft === 'number' ? s.availLeft : 0, typeof s.availTop === 'number' ? s.availTop : 0);
            win.resizeTo(s.availWidth, s.availHeight);
          } catch { /* ignore */ }
        });
    }
  }, [mixerWin]);

  const handleToggleCueMode = useCallback(() => {
    if (isCueMode) {
      closeCuePopupWindow();
    } else {
      setView('board');
      openCuePopupWindow();
    }
  }, [isCueMode, closeCuePopupWindow, openCuePopupWindow]);

  // 자판 설정은 자판 화면 전용: 라이브러리에서 눌러도 자판 화면으로 전환해 편집을 연다
  // (예전에는 편집 상태만 바뀌고 화면은 라이브러리에 남아 "꼬인" 것처럼 보였다)
  const handleToggleEditMode = useCallback(() => {
    if (!isEditMode) setView('board');
    setIsEditMode(!isEditMode);
  }, [isEditMode]);

  useEffect(() => {
    return () => {
      if (cuePopupWin && !cuePopupWin.closed) {
        try { cuePopupWin.close(); } catch { /* ignore */ }
      }
    };
  }, [cuePopupWin]);

  useEffect(() => {
    return () => {
      if (mixerWin && !mixerWin.closed) {
        try { mixerWin.close(); } catch { /* ignore */ }
      }
    };
  }, [mixerWin]);

  useEffect(() => {
    const id = setTimeout(() => {
      const toSave = mappings.map(({ code, soundLabel, loop, volume }) => ({ code, soundLabel, loop, volume }));
      localStorage.setItem(STORAGE_KEY, JSON.stringify(toSave));
    }, 300);
    return () => clearTimeout(id);
  }, [mappings]);

  // 서버에서 자판 배치·사운드 파일·큐 목록을 복원한다 (브라우저 저장에 의존하지 않음)
  useEffect(() => {
    const hydrateFromServer = async () => {
      try {
        const st = await api.getState();
        setLibrary({ categories: st.categories, sounds: st.sounds });
        const ctx = initAudioContext();
        const serverBoard = new Map((st.board?.mappings || []).map(m => [m.code, m]));
        const decoded = {};
        await Promise.all((st.board?.mappings || []).filter(m => m.soundId).map(async (m) => {
          try {
            const blob = await api.fetchSoundBlob(m.soundId);
            decoded[m.code] = await ctx.decodeAudioData(await blob.arrayBuffer());
          } catch (e) { console.warn('서버 사운드 복원 실패', m.code, e); }
        }));
        const soundById = new Map((st.sounds || []).map(s => [s.id, s]));
        setMappings(prev => prev.map(init => {
          const saved = serverBoard.get(init.code);
          if (!saved) return init;
          return {
            ...init,
            soundId: saved.soundId || null,
            soundLabel: saved.soundLabel || init.soundLabel,
            loop: saved.loop ?? init.loop,
            volume: saved.volume ?? init.volume,
            color: saved.color || init.color,
            ...playMetaOf(saved.soundId ? soundById.get(saved.soundId) : null),
            audioBuffer: decoded[init.code] || null,
          };
        }));
        setSfxBank(st.board?.sfxBank === 'B' ? 'B' : 'A');
        if (st.board?.banks && typeof st.board.banks === 'object') {
          setBanks({
            A: Array.isArray(st.board.banks.A) ? st.board.banks.A : null,
            B: Array.isArray(st.board.banks.B) ? st.board.banks.B : null,
          });
        }
        // 큐의 뱅크 독립 재생용: 양쪽 뱅크 배치 + 큐가 참조하는 음원의 디코딩 버퍼를 soundId로 보관한다
        {
          const activeIds = new Set((st.board?.mappings || []).map(m => m.soundId).filter(Boolean));
          (st.board?.mappings || []).forEach(m => { if (m.soundId && decoded[m.code]) cueBuffersRef.current.set(m.soundId, decoded[m.code]); });
          const extraIds = new Set();
          ['A', 'B'].forEach(b => (st.board?.banks?.[b] || []).forEach(a => { if (a.soundId && !activeIds.has(a.soundId)) extraIds.add(a.soundId); }));
          (st.cueList || []).forEach(item => { if (item.soundId && !activeIds.has(item.soundId)) extraIds.add(item.soundId); });
          await Promise.all([...extraIds].map(async (sid) => {
            try {
              const blob = await api.fetchSoundBlob(sid);
              cueBuffersRef.current.set(sid, await ctx.decodeAudioData(await blob.arrayBuffer()));
            } catch { /* ignore */ }
          }));
        }
        if (Array.isArray(st.cueList) && st.cueList.length > 0) {
          // 예전에 만든 큐(soundId 기록 없음)는 현재 활성 뱅크의 음원으로 고정해 준다
          const backfilled = st.cueList.map(item => {
            if (item && item.type !== 'divider' && item.type !== 'fade' && !item.soundId && item.code) {
              const saved = serverBoard.get(item.code);
              if (saved?.soundId) {
                const meta = soundById.get(saved.soundId);
                return {
                  ...item,
                  soundId: saved.soundId,
                  soundLabel: item.soundLabel || saved.soundLabel || '',
                  audioType: meta?.type || item.audioType || 'bgm',
                  loop: item.loop ?? saved.loop ?? false,
                  volume: item.volume ?? saved.volume ?? 1.0,
                };
              }
            }
            return item;
          });
          setCueList(backfilled);
          for (const item of st.cueList) {
            if (item.soundId && item.code) {
              try {
                let buf = cueBuffersRef.current.get(item.soundId);
                if (!buf) {
                  const blob = await api.fetchSoundBlob(item.soundId);
                  buf = await ctx.decodeAudioData(await blob.arrayBuffer());
                  cueBuffersRef.current.set(item.soundId, buf);
                }
                setLocalBuffers(prev => ({ ...prev, [item.code]: buf }));
              } catch { /* ignore */ }
            }
          }
        }
        hydratedRef.current = true;
        setHydrated(true);
        // 브라우저→서버 마이그레이션 안내는 서버 저장 모드에서만 의미가 있다.
        // (브라우저 저장 모드에서는 localApi가 구 저장분을 첫 실행 때 자동 승계한다)
        if (STORAGE_MODE === 'server') {
          try {
            const old = await loadAllSoundFiles();
            if (Object.keys(old).length > 0) setHasBrowserBackup(true);
          } catch { /* ignore */ }
        }
      } catch (e) {
        console.warn('서버 상태 불러오기 실패:', e);
        showToast('서버에 연결할 수 없어 기본 자판으로 시작합니다', 'error');
        hydratedRef.current = true;
        setHydrated(true);
      }
    };
    hydrateFromServer();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [initAudioContext]);

  // 서버 동기화: 자판 배치·볼륨 변경을 서버에 저장
  useEffect(() => {
    if (!hydratedRef.current) return;
    const id = setTimeout(() => {
      const activeAssign = sfxAssignmentsOf(mappings);
      api.saveBoard({
        mappings: mappings.map(({ code, soundId, soundLabel, loop, volume, color }) => ({ code, soundId: soundId || null, soundLabel, loop, volume, color: color || null })),
        sfxVolume,
        sfxBank,
        banks: {
          A: sfxBank === 'A' ? activeAssign : (banks.A || []),
          B: sfxBank === 'B' ? activeAssign : (banks.B || []),
        },
      }).catch(() => {});
    }, 600);
    return () => clearTimeout(id);
  }, [mappings, sfxVolume, sfxBank, banks]);

  // 서버 동기화: 큐 목록 변경을 서버에 저장
  useEffect(() => {
    if (!hydratedRef.current) return;
    const id = setTimeout(() => { api.saveCues(cueList).catch(() => {}); }, 600);
    return () => clearTimeout(id);
  }, [cueList]);

  // 이전 브라우저 저장분(IndexedDB)을 서버로 한 번에 옮기기
  const handleMigrateBrowserData = useCallback(async () => {
    try {
      const blobs = await loadAllSoundFiles();
      const ctx = initAudioContext();
      let moved = 0;
      for (const [code, blob] of Object.entries(blobs)) {
        const file = new File([blob], `${code}.mp3`, { type: blob.type || 'audio/mpeg' });
        if (code.startsWith('local_')) {
          const meta = await api.uploadSound({ file, categoryName: '큐 음원', type: 'bgm' });
          const buf = await ctx.decodeAudioData(await blob.arrayBuffer());
          setLocalBuffers(prev => ({ ...prev, [code]: buf }));
          setCueList(prev => prev.map(it => (it.code === code ? { ...it, soundId: meta.id } : it)));
          moved++;
        } else {
          const mapping = mappingsRef.current.find(s => s.code === code);
          if (!mapping) continue;
          const meta = await api.uploadSound({ file, categoryName: mapping.type === 'bgm' ? '배경음악' : '효과음', type: mapping.type, name: mapping.soundLabel });
          const buf = await ctx.decodeAudioData(await blob.arrayBuffer());
          setMappings(prev => prev.map(s => (s.code === code ? { ...s, audioBuffer: buf, soundId: meta.id } : s)));
          moved++;
        }
      }
      await refreshLibrary();
      setHasBrowserBackup(false);
      showToast(`브라우저 저장분 ${moved}개를 서버로 옮겼습니다`, 'success');
    } catch { showToast('가져오기에 실패했습니다', 'error'); }
  }, [initAudioContext, refreshLibrary, setCueList, showToast]);

  useEffect(() => {
    const hasPlaying = Object.values(bgmUIStates).some(s => s === 'playing' || s === 'fading');
    if (!hasPlaying) return;
    const id = setInterval(() => forceTick(t => t + 1), 250);
    return () => clearInterval(id);
  }, [bgmUIStates]);

  const handleSoundAction = useCallback((rawCode, isDown) => {
    // 텐키리스 노트북 배려: 상단 숫자열(Digit1~9)도 BGM 넘패드 키처럼 동작하게 한다
    const code = /^Digit[1-9]$/.test(rawCode) ? `Numpad${rawCode.slice(5)}` : rawCode;
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
    cancelCueTimers();
    setActiveKeys(new Set());
    showToast('전체 정지되었습니다', 'success');
  }, [enginePanicStop, cancelCueTimers, showToast]);

  useEffect(() => {
    const isTypingTarget = (doc = document) =>
      ['INPUT', 'SELECT', 'TEXTAREA'].includes(doc.activeElement?.tagName);

    const handleKeyDown = (e) => {
      if (isTypingTarget(document)) return;
      if (e.code === 'Escape') { e.preventDefault(); handlePanicStop(); return; }
      if (isCueModeRef.current && e.code === 'Space' && !isEditModeRef.current) {
        e.preventDefault();
        triggerNextCue();
        return;
      }
      if (e.code === 'KeyD' && !isEditModeRef.current) { e.preventDefault(); toggleDuck(); return; }
      if (e.repeat || isEditModeRef.current) return;
      handleSoundAction(e.code, true);
    };
    const handleKeyUp = (e) => {
      if (isTypingTarget(document) || isEditModeRef.current) return;
      handleSoundAction(e.code, false);
    };
    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
    };
  }, [handleSoundAction, triggerNextCue, handlePanicStop, isCueModeRef, toggleDuck]);

  // 독립 큐플레이어 창에서의 키보드 단축키 핸들러
  const handlePopupKeyDown = useCallback((e, popupDoc) => {
    const activeTag = popupDoc?.activeElement?.tagName;
    if (['INPUT', 'SELECT', 'TEXTAREA'].includes(activeTag)) {
      if (e.code === 'Escape') popupDoc.activeElement.blur();
      return;
    }
    if (e.code === 'Escape') {
      e.preventDefault();
      handlePanicStop();
      return;
    }
    if (e.code === 'Space') {
      e.preventDefault();
      triggerNextCue();
      return;
    }
    if (e.code === 'KeyD') {
      e.preventDefault();
      toggleDuck();
      return;
    }
    if (e.code === 'ArrowUp') {
      e.preventDefault();
      stepNextCue(-1);
      return;
    }
    if (e.code === 'ArrowDown') {
      e.preventDefault();
      stepNextCue(1);
      return;
    }
    if (e.repeat) return;
    handleSoundAction(e.code, true);
  }, [handlePanicStop, triggerNextCue, stepNextCue, handleSoundAction, toggleDuck]);

  const handlePopupKeyUp = useCallback((e, popupDoc) => {
    const activeTag = popupDoc?.activeElement?.tagName;
    if (['INPUT', 'SELECT', 'TEXTAREA'].includes(activeTag)) return;
    handleSoundAction(e.code, false);
  }, [handleSoundAction]);

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
      const keyType = mappingsRef.current.find(s => s.code === code)?.type || 'sfx';
      const meta = await api.uploadSound({ file, categoryName: keyType === 'bgm' ? '배경음악' : '효과음', type: keyType, name: defaultLabel });
      refreshLibrary();
      setMappings(prev => prev.map(s => s.code === code ? { ...s, audioBuffer, soundId: meta.id, soundLabel: defaultLabel, isDecoding: false } : s));
      showToast(`${defaultLabel} 등록 완료`, 'success');
    } catch {
      showToast('지원하지 않는 파일이거나 손상되었습니다.', 'error');
      setMappings(prev => prev.map(s => s.code === code ? { ...s, isDecoding: false } : s));
    } finally {
      event.target.value = null;
    }
  }, [initAudioContext, stopBGM, showToast, refreshLibrary]);

  const handleDeleteSound = useCallback((code) => {
    stopBGM(code);
    setMappings(prev => prev.map(s => s.code === code ? { ...s, audioBuffer: null, soundId: null, ...EMPTY_PLAY_META } : s));
    showToast('자판에서 해제했습니다 (파일은 라이브러리에 남아 있습니다)', 'success');
  }, [stopBGM, showToast]);

  const handleAssignToKey = useCallback(async (sound, code) => {
    try {
      const ctx = initAudioContext();
      const blob = await api.fetchSoundBlob(sound.id);
      const audioBuffer = await ctx.decodeAudioData(await blob.arrayBuffer());
      stopBGM(code);
      setMappings(prev => prev.map(s => (s.code === code ? { ...s, audioBuffer, soundId: sound.id, soundLabel: sound.name, ...playMetaOf(sound) } : s)));
      showToast(`「${sound.name}」을(를) 자판에 배치했습니다`, 'success');
    } catch { showToast('자판 배치에 실패했습니다', 'error'); }
  }, [initAudioContext, stopBGM, showToast]);

  // 효과음 뱅크 전환: 현재 배치를 banks에 접어 넣고, 대상 뱅크 배치를 펼쳐 mappings로 올린다 (BGM은 그대로 유지)
  const switchSfxBank = useCallback(async (next) => {
    if (next === sfxBank || switchingBankRef.current) return;
    switchingBankRef.current = true;
    try {
      const curAssign = sfxAssignmentsOf(mappingsRef.current);
      const target = (next === 'A' ? banks.A : banks.B) || [];
      const targetByCode = new Map(target.map(a => [a.code, a]));
      const ctx = initAudioContext();
      const decoded = {};
      await Promise.all(SFX_CODES.map(async (code) => {
        const a = targetByCode.get(code);
        if (a?.soundId) {
          try {
            const blob = await api.fetchSoundBlob(a.soundId);
            decoded[code] = await ctx.decodeAudioData(await blob.arrayBuffer());
          } catch { /* 디코딩 실패 시 빈 키로 */ }
        }
      }));
      const soundById = new Map((library.sounds || []).map(s => [s.id, s]));
      const initByCode = new Map(INITIAL_MAPPINGS.map(m => [m.code, m]));
      setMappings(prev => prev.map(m => {
        if (!SFX_CODES.includes(m.code)) return m;
        const a = targetByCode.get(m.code);
        if (!a) {
          return { ...m, soundId: null, audioBuffer: null, ...EMPTY_PLAY_META, soundLabel: initByCode.get(m.code)?.soundLabel || m.soundLabel, loop: false, volume: 1.0, color: initByCode.get(m.code)?.color || m.color };
        }
        return {
          ...m,
          soundId: a.soundId || null,
          soundLabel: a.soundLabel || m.soundLabel,
          loop: a.loop ?? false,
          volume: a.volume ?? 1.0,
          color: a.color || initByCode.get(m.code)?.color || m.color,
          audioBuffer: decoded[m.code] || null,
          ...playMetaOf(a.soundId ? soundById.get(a.soundId) : null),
        };
      }));
      setBanks(prev => ({ ...prev, [sfxBank]: curAssign, [next]: target }));
      setSfxBank(next);
      showToast(`효과음 뱅크 ${next}로 전환했습니다`, 'success');
    } finally {
      switchingBankRef.current = false;
    }
  }, [sfxBank, banks, initAudioContext, library.sounds, showToast]);

  const handleUnassignSound = useCallback((soundId) => {
    setMappings(prev => prev.map(s => (s.soundId === soundId ? { ...s, audioBuffer: null, soundId: null, ...EMPTY_PLAY_META } : s)));
  }, []);

  const requestDeleteSound = useCallback((code) => setPendingDeleteCode(code), []);
  const cancelDeleteSound = useCallback(() => setPendingDeleteCode(null), []);
  const confirmDeleteSound = useCallback(() => {
    if (pendingDeleteCode) handleDeleteSound(pendingDeleteCode);
    setPendingDeleteCode(null);
  }, [pendingDeleteCode, handleDeleteSound]);

  const exportSettings = useCallback(async (includeFiles = true) => {
    try {
      showToast('내보내기 준비 중...', 'success');
      const soundsExport = await Promise.all(mappings.map(async (s) => {
        let fileData = null, fileType = null;
        if (includeFiles && s.soundId) {
          try {
            const blob = await api.fetchSoundBlob(s.soundId);
            fileData = await blobToBase64(blob);
            fileType = blob.type || 'audio/mpeg';
          } catch { /* ignore */ }
        }
        const metaName = (library.sounds || []).find(x => x.id === s.soundId)?.name;
        return { code: s.code, soundLabel: s.soundLabel, hasSound: !!s.soundId, soundName: s.soundId ? (metaName || null) : null, loop: s.loop, volume: s.volume, color: s.color || null, fileData, fileType, fadeInSec: s.fadeInSec ?? 0, fadeOutSec: s.fadeOutSec ?? 0, startSec: s.startSec ?? 0, endSec: s.endSec ?? null };
      }));

      // 로컬 큐 음원 파일들도 함께 백업
      const localCodes = Array.from(
        new Set(cueList.filter(i => i.source === 'local' || String(i.code).startsWith('local_')).map(i => i.code))
      );
      const localCueFiles = {};
      for (const code of includeFiles ? localCodes : []) {
        const item = cueList.find(i => i.code === code);
        if (item?.soundId) {
          try { localCueFiles[code] = await blobToBase64(await api.fetchSoundBlob(item.soundId)); } catch { /* ignore */ }
        }
      }

      // 비활성 뱅크의 배치·파일도 함께 백업 (활성 뱅크는 sounds에 들어 있음)
      const otherBank = sfxBank === 'A' ? 'B' : 'A';
      const otherAssign = (otherBank === 'A' ? banks.A : banks.B) || [];
      const otherBankSounds = [];
      for (const a of otherAssign) {
        if (!a.soundId) continue;
        const foundSound = (library.sounds || []).find(x => x.id === a.soundId);
        const meta = playMetaOf(foundSound);
        let fileData = null, fileType = null;
        if (includeFiles) {
          try {
            const blob = await api.fetchSoundBlob(a.soundId);
            fileData = await blobToBase64(blob);
            fileType = blob.type || 'audio/mpeg';
          } catch { /* ignore */ }
        }
        otherBankSounds.push({ code: a.code, soundLabel: a.soundLabel, soundName: foundSound?.name || a.soundLabel || null, loop: a.loop, volume: a.volume, color: a.color || null, fileData, fileType, fadeInSec: meta.fadeInSec, fadeOutSec: meta.fadeOutSec, startSec: meta.startSec, endSec: meta.endSec });
      }

      const payload = {
        version: 3,
        kind: includeFiles ? 'full' : 'settings',
        exportedAt: new Date().toISOString(),
        sfxVolume: sfxVolumeRef.current,
        sfxBank,
        otherBank,
        otherBankSounds,
        cueList,
        localCueFiles,
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
      showToast(includeFiles ? '설정을 내보냈습니다' : '설정만 내보냈습니다 (음원 제외)', 'success');
    } catch (e) {
      console.error(e);
      showToast('내보내기에 실패했습니다', 'error');
    }
  }, [showToast, mappings, cueList, sfxBank, banks, library]);

  const handleExportSettings = useCallback(() => exportSettings(true), [exportSettings]);
  const handleExportSettingsOnly = useCallback(() => exportSettings(false), [exportSettings]);

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
      let matchedByName = 0;
      let unmatchedByName = 0;
      if (payload.sfxBank === 'A' || payload.sfxBank === 'B') setSfxBank(payload.sfxBank);

      for (const s of payload.sounds) {
        const isKnownCode = INITIAL_MAPPINGS.some(m => m.code === s.code);
        if (!isKnownCode) continue;

        let audioBuffer = null;
        let importedId = null;
        if (s.fileData) {
          try {
            const resp = await fetch(s.fileData);
            const blob = await resp.blob();
            const init = INITIAL_MAPPINGS.find(m => m.code === s.code);
            const file = new File([blob], `${s.soundLabel || s.code}.mp3`, { type: blob.type || 'audio/mpeg' });
            const meta = await api.uploadSound({ file, categoryName: init?.type === 'bgm' ? '배경음악' : '효과음', type: init?.type || 'sfx', name: s.soundLabel });
            importedId = meta.id;
            if (s.fadeInSec || s.fadeOutSec || s.startSec || s.endSec != null) {
              try { await api.updateSound(meta.id, { fadeInSec: s.fadeInSec ?? 0, fadeOutSec: s.fadeOutSec ?? 0, startSec: s.startSec ?? 0, endSec: s.endSec ?? null }); } catch { /* ignore */ }
            }
            audioBuffer = await ctx.decodeAudioData(await blob.arrayBuffer());
          } catch (e) {
            console.warn(`파일 복원 실패 (${s.code}):`, e);
          }
        } else if (s.soundName) {
          // 설정만 내보낸 파일: 현재 라이브러리에서 이름이 같은 음원을 찾아 연결한다
          const meta = (libraryRef.current?.sounds || []).find(x => x.name === s.soundName);
          if (meta) {
            importedId = meta.id;
            matchedByName++;
            try {
              const blob = await api.fetchSoundBlob(meta.id);
              audioBuffer = await ctx.decodeAudioData(await blob.arrayBuffer());
            } catch { /* ignore */ }
          } else {
            unmatchedByName++;
          }
        }

        // hasSound === false가 명시된 항목은 빈 슬롯이다 — 복원 시 기존 음원을 비운다.
        // (구버전 백업에는 hasSound가 없어 기존 동작(유지)을 따른다.)
        const explicitlyEmpty = s.hasSound === false;
        setMappings(prev => prev.map(m => m.code === s.code ? {
          ...m,
          soundLabel: s.soundLabel ?? m.soundLabel,
          loop: s.loop ?? m.loop,
          volume: s.volume ?? m.volume,
          color: s.color ?? m.color,
          audioBuffer: explicitlyEmpty ? null : (audioBuffer ?? m.audioBuffer),
          soundId: explicitlyEmpty ? null : (importedId ?? m.soundId),
        } : m));
      }

      // 비활성 뱅크 배치 복원 (파일을 서버에 다시 올리고 새 soundId로 연결)
      if ((payload.otherBank === 'A' || payload.otherBank === 'B') && Array.isArray(payload.otherBankSounds)) {
        const restoredAssign = [];
        for (const s of payload.otherBankSounds) {
          if (!SFX_CODES.includes(s.code)) continue;
          let importedId = null;
          if (s.fileData) {
            try {
              const resp = await fetch(s.fileData);
              const blob = await resp.blob();
              const file = new File([blob], `${s.soundLabel || s.code}.mp3`, { type: blob.type || 'audio/mpeg' });
              const meta = await api.uploadSound({ file, categoryName: '효과음', type: 'sfx', name: s.soundLabel });
              importedId = meta.id;
              if (s.fadeInSec || s.fadeOutSec || s.startSec || s.endSec != null) {
                try { await api.updateSound(meta.id, { fadeInSec: s.fadeInSec ?? 0, fadeOutSec: s.fadeOutSec ?? 0, startSec: s.startSec ?? 0, endSec: s.endSec ?? null }); } catch { /* ignore */ }
              }
            } catch (e) { console.warn(`뱅크 파일 복원 실패 (${s.code}):`, e); }
          } else if (s.soundName) {
            const meta = (libraryRef.current?.sounds || []).find(x => x.name === s.soundName);
            if (meta) { importedId = meta.id; matchedByName++; } else { unmatchedByName++; }
          }
          restoredAssign.push({ code: s.code, soundId: importedId, soundLabel: s.soundLabel || '', loop: !!s.loop, volume: s.volume ?? 1.0, color: s.color || null });
        }
        setBanks(prev => ({ ...prev, [payload.otherBank]: restoredAssign }));
      }

      const restoredSoundIds = {};
      if (payload.localCueFiles && typeof payload.localCueFiles === 'object') {
        const restoredLocal = {};
        for (const [code, base64Data] of Object.entries(payload.localCueFiles)) {
          if (!base64Data) continue;
          try {
            const resp = await fetch(base64Data);
            const blob = await resp.blob();
            const file = new File([blob], `${code}.mp3`, { type: blob.type || 'audio/mpeg' });
            const meta = await api.uploadSound({ file, categoryName: '큐 음원', type: 'bgm' });
            restoredSoundIds[code] = meta.id;
            restoredLocal[code] = await ctx.decodeAudioData(await blob.arrayBuffer());
          } catch (e) {
            console.warn(`로컬 큐 음원 복원 실패 (${code}):`, e);
          }
        }
        setLocalBuffers(prev => ({ ...prev, ...restoredLocal }));
      }

      if (Array.isArray(payload.cueList)) setCueList(payload.cueList.map(it => (restoredSoundIds[it.code] ? { ...it, soundId: restoredSoundIds[it.code] } : it)));

      await refreshLibrary();
      showToast(matchedByName > 0 || unmatchedByName > 0
        ? `설정을 가져왔습니다 (이름으로 ${matchedByName}개 연결${unmatchedByName > 0 ? `, ${unmatchedByName}개는 라이브러리에 없어 제외` : ''})`
        : '설정을 가져왔습니다', 'success');
    } catch (e) {
      console.error(e);
      showToast('가져오기 실패: 올바른 설정 파일인지 확인하세요', 'error');
    }
  }, [pendingImportFile, initAudioContext, showToast, setCueList, refreshLibrary]);

  const handleSettingChange = useCallback((code, setting, value) => {
    applyLiveSetting(code, setting, value);
    if (String(code).startsWith('local_')) {
      updateLocalCueByCode(code, { [setting]: value });
    } else {
      setMappings(prev => prev.map(s => s.code === code ? { ...s, [setting]: value } : s));
    }
  }, [applyLiveSetting, updateLocalCueByCode]);

  const getSound = useCallback((code) => allSounds.find(s => s.code === code), [allSounds]);
  const isPopupOpen = !!(cuePopupWin && !cuePopupWin.closed);
  const isMixerPopupOpen = !!(mixerWin && !mixerWin.closed);
  const bankAssignedCount = (b) => (b === sfxBank
    ? mappings.filter(m => SFX_CODES.includes(m.code) && m.soundId).length
    : ((b === 'A' ? banks.A : banks.B) || []).filter(a => a.soundId).length);
  // 하단 믹서 채널: 배치된 키만, 자판 배열 순서대로
  const mixerSfxChannels = SFX_CODES.map(code => mappings.find(m => m.code === code)).filter(m => m && m.soundId);
  const mixerBgmChannels = ['Numpad7', 'Numpad8', 'Numpad9', 'Numpad4', 'Numpad5', 'Numpad6', 'Numpad1', 'Numpad2', 'Numpad3']
    .map(code => mappings.find(m => m.code === code)).filter(m => m && m.soundId);
  // 볼륨 전체 초기화: 배치된 모든 채널(효과음 뱅크 A·B + BGM)을 기본 100%로.
  // 라이브러리의 사운드별 음량 보정(LUFS·트림)은 건드리지 않는다.
  const resetAllVolumes = () => {
    mappings.forEach(m => { if (m.soundId) applyLiveSetting(m.code, 'volume', 1); });
    setMappings(prev => prev.map(m => (m.soundId ? { ...m, volume: 1 } : m)));
    setBanks(prev => {
      const resetArr = (arr) => (Array.isArray(arr) ? arr.map(a => (a.soundId ? { ...a, volume: 1 } : a)) : arr);
      return { A: resetArr(prev.A), B: resetArr(prev.B) };
    });
    showToast('모든 채널 볼륨을 100%로 초기화했습니다', 'success');
  };

  return (
    <div className="h-screen sm:h-[100dvh] flex flex-col bg-[#1e232a] text-slate-200 font-sans overflow-hidden">

      {/* 독립 팝업 창 포털 렌더링 */}
      {isCueMode && isPopupOpen && (
        <WindowPortal
          externalWindow={cuePopupWin}
          onClose={closeCuePopupWindow}
          onKeyDown={handlePopupKeyDown}
          onKeyUp={handlePopupKeyUp}
        >
          <CuePlayerWindow
            mappings={mappings}
            getSound={getSound}
            bgmUIStates={bgmUIStates}
            sfxPlayingCodes={sfxPlayingCodes}
            getPlaybackInfo={getPlaybackInfo}
            handleBGMPlayback={handleBGMPlayback}
            fadeOutBGM={fadeOutBGM}
            stopBGM={stopBGM}
            seekBGM={seekBGM}
            handleSoundAction={handleSoundAction}
            handleSettingChange={handleSettingChange}
            onUploadLocalCueFiles={handleUploadLocalCueFiles}
            handlePanicStop={handlePanicStop}
            cueList={cueList}
            cueIndex={cueIndex}
            nextPlayableIndex={nextPlayableIndex}
            nextCueItem={nextCueItem}
            cueAddSelection={cueAddSelection}
            setCueAddSelection={setCueAddSelection}
            triggerNextCue={triggerNextCue}
            playCueAtIndex={playCueAtIndex}
            selectNextCue={selectNextCue}
            stepNextCue={stepNextCue}
            resetCue={resetCue}
            addCue={handleAddCue}
            addDivider={addDivider}
            addFadeCue={addFadeCue}
            updateCueItem={updateCueItem}
            removeCue={removeCue}
            moveCue={moveCue}
            clearCueList={clearCueList}
            onCloseWindow={closeCuePopupWindow}
          />
        </WindowPortal>
      )}

      {/* 믹서 독립 팝업 창 포털 렌더링 */}
      {isMixerPopupOpen && (
        <WindowPortal
          externalWindow={mixerWin}
          title="🎚️ 볼륨 믹서 — 기계식 사운드보드"
          onClose={closeMixerPopup}
        >
          <MixerWindow
            sfxChannels={mixerSfxChannels}
            bgmChannels={mixerBgmChannels}
            sfxBank={sfxBank}
            bankCounts={{ A: bankAssignedCount('A'), B: bankAssignedCount('B') }}
            total={mixerSfxChannels.length + mixerBgmChannels.length}
            sfxPlayingCodes={sfxPlayingCodes}
            bgmUIStates={bgmUIStates}
            onVolumeChange={(code, value) => handleSettingChange(code, 'volume', value)}
            onBgmToggle={(code) => { const s = getSound(code); if (s) handleBGMPlayback(s, 'toggle'); }}
            onBgmStop={stopBGMWithFade}
            getLevel={getChannelLevel}
            onSfxTrigger={(code) => { const s = getSound(code); if (!s) return; if (sfxPlayingCodes.has(code)) stopSfx(code); toggleSfx(s); }}
            onSfxStop={stopSfx}
            onSwitchBank={switchSfxBank}
            onPanicStop={handlePanicStop}
            onResetAll={() => setShowVolumeResetConfirm(true)}
            onToggleFit={toggleMixerFit}
            isFitted={isMixerFitted}
            isDucking={isDucking}
            onToggleDuck={toggleDuck}
            outputDeviceId={outputDeviceId}
            onOutputDeviceChange={handleOutputDeviceChange}
            onCloseWindow={closeMixerPopup}
          />
        </WindowPortal>
      )}

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
        message={`「${getSound(pendingDeleteCode)?.soundLabel || ''}」자판 배치가 해제됩니다. 파일 자체는 라이브러리에 남아 있어 다시 배치할 수 있습니다.`}
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

      <ConfirmDialog
        open={showVolumeResetConfirm}
        title="볼륨을 전부 초기화할까요?"
        message="자판에 배치된 모든 채널(효과음 뱅크 A·B + BGM)의 볼륨이 100%로 돌아갑니다. 라이브러리의 사운드별 음량 보정은 그대로 유지됩니다."
        confirmLabel="초기화"
        onConfirm={() => { resetAllVolumes(); setShowVolumeResetConfirm(false); }}
        onCancel={() => setShowVolumeResetConfirm(false)}
      />

      <header className="flex-shrink-0 p-3 sm:p-5 border-b border-black/40 bg-[#171a1f] z-30 shadow-md">
        <div className="max-w-6xl mx-auto flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
          <div>
            <h1 className="text-2xl font-extrabold tracking-tight flex items-center gap-2">
              <span className="text-3xl">⌨️</span> 기계식 사운드보드
            </h1>
          </div>
          <div className="flex flex-wrap items-center gap-2 w-full md:w-auto">
            <button
              onClick={() => setView('board')}
              aria-pressed={view === 'board'}
              className={`px-4 py-2.5 rounded-lg font-bold text-sm transition-all border-b-4 active:border-b-0 active:translate-y-1 ${view === 'board' ? 'bg-emerald-500 border-emerald-700 text-white' : 'bg-slate-700 border-slate-900 text-slate-200'}`}
            >
              ⌨️ 자판
            </button>
            <button
              onClick={() => { setIsEditMode(false); setView('library'); }}
              aria-pressed={view === 'library'}
              className={`px-4 py-2.5 rounded-lg font-bold text-sm transition-all border-b-4 active:border-b-0 active:translate-y-1 ${view === 'library' ? 'bg-emerald-500 border-emerald-700 text-white' : 'bg-slate-700 border-slate-900 text-slate-200'}`}
            >
              📚 라이브러리
            </button>
            <button
              onClick={handleToggleCueMode}
              aria-pressed={isCueMode}
              className={`px-4 py-2.5 rounded-lg font-bold text-sm transition-all flex items-center gap-1.5 border-b-4 active:border-b-0 active:translate-y-1 ${
                isCueMode ? 'bg-purple-600 border-purple-800 text-white shadow-[0_0_15px_rgba(168,85,247,0.4)]' : 'bg-slate-700 border-slate-900 text-slate-200'
              }`}
              title="독립 팝업 창으로 큐플레이어를 실행합니다"
            >
              🎬 {isCueMode ? '큐 모드 닫기' : '큐 모드'}
            </button>
            <button
              onClick={handlePanicStop}
              className="px-4 py-2.5 rounded-lg font-bold text-sm bg-rose-600 border-b-4 border-rose-800 text-white active:border-b-0 active:translate-y-1 transition-all flex items-center gap-1.5"
              title="재생 중인 모든 소리를 즉시 정지 (Esc)"
            >
              🛑 전체 정지
            </button>
            <button
              onClick={handleToggleEditMode}
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
            onExportSettingsOnly={handleExportSettingsOnly}
            onImportSelected={handleImportFileSelected}
            importInputRef={importInputRef}
          />
        )}

        {isCueMode && !isEditMode && (
          <CueGoBar
            cueList={cueList}
            cueIndex={cueIndex}
            nextPlayableIndex={nextPlayableIndex}
            nextCueItem={nextCueItem}
            getSound={getSound}
            resetCue={resetCue}
            triggerNextCue={triggerNextCue}
            isPopupOpen={isPopupOpen}
            onFocusOrReopenPopup={openCuePopupWindow}
          />
        )}

        {isEditMode && <EditGuideBar />}

        {hasBrowserBackup && view === 'board' && (
          <div className="w-full max-w-5xl bg-amber-900/30 border border-amber-500/40 rounded-lg p-3 mb-4 text-amber-100 flex flex-wrap items-center gap-3">
            <span className="text-xs sm:text-sm">이 브라우저에 예전에 저장한 음원이 남아 있습니다. 서버로 옮기면 어느 기기에서든 쓸 수 있습니다.</span>
            <button onClick={handleMigrateBrowserData} className="text-xs font-bold px-3 py-2 rounded bg-amber-600 hover:bg-amber-500 text-white">서버로 가져오기</button>
            <button onClick={() => setHasBrowserBackup(false)} className="text-xs px-3 py-2 rounded bg-slate-700 text-slate-200">닫기</button>
          </div>
        )}

        {view === 'library' && (
          <LibraryPanel
            categories={library.categories}
            sounds={library.sounds}
            mappings={mappings}
            onRefresh={libraryAction}
            showToast={showToast}
            onAssignToKey={handleAssignToKey}
            onUnassignSound={handleUnassignSound}
          />
        )}

        <div className={`bg-[#2a303c] p-4 sm:p-6 lg:p-8 rounded-2xl shadow-[inset_0_4px_10px_rgba(255,255,255,0.05),0_15px_25px_rgba(0,0,0,0.5)] border border-slate-600/30 flex-col xl:flex-row flex-wrap gap-6 xl:gap-10 ${view === 'library' ? 'hidden' : 'flex'}`}>

          <div>
            <div className="flex items-center justify-between gap-2 mb-4 ml-2">
              <h2 className="text-lg font-bold text-slate-400 flex items-center gap-2">
                효과음 자판 <span className="text-[10px] font-normal text-emerald-400 bg-emerald-400/10 px-2 py-0.5 rounded">다중 재생</span>
              </h2>
              <div className="flex items-center gap-1.5" role="group" aria-label="효과음 뱅크 전환">
                <span className="text-[11px] font-bold text-slate-500">뱅크</span>
                {['A', 'B'].map(b => (
                  <button
                    key={b}
                    onClick={() => switchSfxBank(b)}
                    aria-pressed={sfxBank === b}
                    className={`px-3 py-1.5 rounded-lg text-xs font-extrabold transition-all border-b-4 active:border-b-0 active:translate-y-0.5 ${sfxBank === b ? 'bg-emerald-500 border-emerald-700 text-white' : 'bg-slate-700 border-slate-900 text-slate-300 hover:bg-slate-600'}`}
                  >
                    {b} <span className="font-medium opacity-80">{bankAssignedCount(b)}/15</span>
                  </button>
                ))}
              </div>
            </div>
            <div className="flex flex-col gap-3 sm:gap-4 bg-[#222731] p-4 sm:p-6 rounded-xl shadow-inner border border-black/20">
              <div className="flex gap-3 sm:gap-4 ml-0">
                {['KeyQ', 'KeyW', 'KeyE', 'KeyR', 'KeyT'].map(code => (
                  <KeycapButton key={code} sound={getSound(code)} isActive={activeKeys.has(code)} isEditMode={isEditMode} bgmUIState={sfxPlayingCodes.has(code) ? 'playing' : null} isCueTarget={isCueMode && !isEditMode && nextCueCode === code} onAction={handleSoundAction} onFileUpload={handleFileUpload} onSettingChange={handleSettingChange} onDelete={requestDeleteSound} />
                ))}
              </div>
              <div className="flex gap-3 sm:gap-4 ml-4 sm:ml-6">
                {['KeyA', 'KeyS', 'KeyD', 'KeyF', 'KeyG'].map(code => (
                  <KeycapButton key={code} sound={getSound(code)} isActive={activeKeys.has(code)} isEditMode={isEditMode} bgmUIState={sfxPlayingCodes.has(code) ? 'playing' : null} isCueTarget={isCueMode && !isEditMode && nextCueCode === code} onAction={handleSoundAction} onFileUpload={handleFileUpload} onSettingChange={handleSettingChange} onDelete={requestDeleteSound} />
                ))}
              </div>
              <div className="flex gap-3 sm:gap-4 ml-8 sm:ml-12">
                {['KeyZ', 'KeyX', 'KeyC', 'KeyV', 'KeyB'].map(code => (
                  <KeycapButton key={code} sound={getSound(code)} isActive={activeKeys.has(code)} isEditMode={isEditMode} bgmUIState={sfxPlayingCodes.has(code) ? 'playing' : null} isCueTarget={isCueMode && !isEditMode && nextCueCode === code} onAction={handleSoundAction} onFileUpload={handleFileUpload} onSettingChange={handleSettingChange} onDelete={requestDeleteSound} />
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
                <KeycapButton key={code} sound={getSound(code)} isActive={activeKeys.has(code)} isEditMode={isEditMode} bgmUIState={bgmUIStates[code]} isCueTarget={isCueMode && !isEditMode && nextCueCode === code} onAction={handleSoundAction} onFileUpload={handleFileUpload} onSettingChange={handleSettingChange} onDelete={requestDeleteSound} />
              ))}
            </div>
          </div>

        </div>

        {view === 'board' && !isEditMode && (
          <MixerPanel
            sfxChannels={mixerSfxChannels}
            bgmChannels={mixerBgmChannels}
            sfxBank={sfxBank}
            sfxPlayingCodes={sfxPlayingCodes}
            bgmUIStates={bgmUIStates}
            onVolumeChange={(code, value) => handleSettingChange(code, 'volume', value)}
            onBgmToggle={(code) => { const s = getSound(code); if (s) handleBGMPlayback(s, 'toggle'); }}
            onBgmStop={stopBGMWithFade}
            getLevel={getChannelLevel}
            onSfxTrigger={(code) => { const s = getSound(code); if (!s) return; if (sfxPlayingCodes.has(code)) stopSfx(code); toggleSfx(s); }}
            onSfxStop={stopSfx}
            poppedOut={isMixerPopupOpen}
            onPopOut={openMixerPopup}
            onClosePopOut={closeMixerPopup}
            onResetAll={() => setShowVolumeResetConfirm(true)}
            isDucking={isDucking}
            onToggleDuck={toggleDuck}
            outputDeviceId={outputDeviceId}
            onOutputDeviceChange={handleOutputDeviceChange}
          />
        )}
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
