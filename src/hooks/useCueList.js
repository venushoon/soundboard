import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { CUE_KEY } from '../constants.js';

let cueIdCounter = 1;
const makeCueId = () => `cue_${Date.now()}_${cueIdCounter++}`;

export function normalizeCueItem(item) {
  if (!item) return null;
  if (typeof item === 'string') {
    return { id: makeCueId(), type: 'sound', source: 'keycap', code: item, memo: '' };
  }
  if (typeof item === 'object') {
    if (item.type === 'divider') {
      return {
        id: item.id || makeCueId(),
        type: 'divider',
        title: item.title || '구분선',
      };
    }
    if (item.code) {
      const isLocal = item.source === 'local' || String(item.code).startsWith('local_');
      return {
        id: item.id || makeCueId(),
        type: 'sound',
        source: isLocal ? 'local' : 'keycap',
        code: item.code,
        soundLabel: item.soundLabel || '',
        audioType: item.audioType || 'bgm',
        loop: item.loop ?? false,
        volume: item.volume ?? 1.0,
        memo: item.memo || '',
      };
    }
  }
  return null;
}

export function normalizeCueList(list) {
  if (!Array.isArray(list)) return [];
  return list.map(normalizeCueItem).filter(Boolean);
}

export function useCueList({ mappingsRef, playSfx, handleBGMPlayback, showToast, onRemoveLocalCodes }) {
  const [cueList, setCueListRaw] = useState(() => {
    const saved = localStorage.getItem(CUE_KEY);
    if (saved) {
      try {
        return normalizeCueList(JSON.parse(saved));
      } catch {
        return [];
      }
    }
    return [];
  });

  // cueIndex: 방금 실행된 큐의 인덱스 (-1이면 첫 번째 큐가 대기 상태)
  const [cueIndex, setCueIndex] = useState(-1);
  const [isCueMode, setIsCueMode] = useState(false);
  const [cueAddSelection, setCueAddSelection] = useState('');

  const cueListRef = useRef(cueList);
  const cueIndexRef = useRef(cueIndex);
  const isCueModeRef = useRef(isCueMode);

  useEffect(() => { cueListRef.current = cueList; }, [cueList]);
  useEffect(() => { cueIndexRef.current = cueIndex; }, [cueIndex]);
  useEffect(() => { isCueModeRef.current = isCueMode; }, [isCueMode]);

  const setCueList = useCallback((updater) => {
    setCueListRaw((prev) => {
      const next = typeof updater === 'function' ? updater(prev) : updater;
      return normalizeCueList(next);
    });
  }, []);

  useEffect(() => {
    const id = setTimeout(() => localStorage.setItem(CUE_KEY, JSON.stringify(cueList)), 300);
    return () => clearTimeout(id);
  }, [cueList]);

  // 현재 cueIndex 이후 가장 먼저 나오는 실제 사운드 큐의 인덱스
  const nextPlayableIndex = useMemo(() => {
    for (let i = cueIndex + 1; i < cueList.length; i++) {
      if (cueList[i]?.type !== 'divider') return i;
    }
    return -1;
  }, [cueList, cueIndex]);

  const nextCueItem = nextPlayableIndex >= 0 ? cueList[nextPlayableIndex] : null;
  const nextCueCode = nextCueItem?.code || null;

  // 특정 인덱스의 큐를 즉시 실행
  const playCueAtIndex = useCallback((targetIndex) => {
    const list = cueListRef.current;
    const item = list[targetIndex];
    if (!item || item.type === 'divider') return;

    const soundObj = mappingsRef.current.find(s => s.code === item.code);
    if (!soundObj || !soundObj.audioBuffer) {
      showToast('등록되지 않은 음원입니다. 다음 큐로 건너뜁니다.', 'error');
      setCueIndex(targetIndex);
      return;
    }

    if (soundObj.type === 'sfx') {
      playSfx(soundObj);
    } else {
      handleBGMPlayback(soundObj, 'play');
    }
    setCueIndex(targetIndex);
  }, [mappingsRef, playSfx, handleBGMPlayback, showToast]);

  const triggerNextCue = useCallback(() => {
    const list = cueListRef.current;
    if (list.length === 0) {
      showToast('등록된 큐가 없습니다', 'error');
      return;
    }

    let targetIndex = -1;
    for (let i = cueIndexRef.current + 1; i < list.length; i++) {
      if (list[i]?.type !== 'divider') {
        targetIndex = i;
        break;
      }
    }

    if (targetIndex === -1) {
      showToast('마지막 큐입니다', 'success');
      return;
    }

    playCueAtIndex(targetIndex);
  }, [playCueAtIndex, showToast]);

  // 특정 큐를 '다음 대기(NEXT)' 상태로 지정
  const selectNextCue = useCallback((targetIndex) => {
    const list = cueListRef.current;
    if (targetIndex < 0 || targetIndex >= list.length) return;
    setCueIndex(targetIndex - 1);
  }, []);

  // 대기 큐 커서를 이전/다음 사운드 큐로 이동
  const stepNextCue = useCallback((direction) => {
    const list = cueListRef.current;
    if (list.length === 0) return;

    let currentNext = list.length;
    for (let i = cueIndexRef.current + 1; i < list.length; i++) {
      if (list[i]?.type !== 'divider') {
        currentNext = i;
        break;
      }
    }

    if (direction > 0) {
      for (let i = currentNext + 1; i < list.length; i++) {
        if (list[i]?.type !== 'divider') {
          setCueIndex(i - 1);
          return;
        }
      }
    } else if (direction < 0) {
      const startFrom = currentNext >= list.length ? list.length - 1 : currentNext - 1;
      for (let i = startFrom; i >= 0; i--) {
        if (list[i]?.type !== 'divider') {
          setCueIndex(i - 1);
          return;
        }
      }
    }
  }, []);

  const resetCue = useCallback(() => {
    setCueIndex(-1);
    showToast('큐가 처음으로 이동했습니다', 'success');
  }, [showToast]);

  const addCue = useCallback((code, memo = '') => {
    if (!code) return;
    setCueListRaw(prev => [
      ...prev,
      { id: makeCueId(), type: 'sound', source: 'keycap', code, memo },
    ]);
    setCueAddSelection('');
  }, []);

  const addLocalCue = useCallback(({
    code,
    soundLabel,
    audioType = 'bgm',
    loop = false,
    volume = 1.0,
    memo = '',
  }) => {
    if (!code) return;
    setCueListRaw(prev => [
      ...prev,
      {
        id: makeCueId(),
        type: 'sound',
        source: 'local',
        code,
        soundLabel: soundLabel || '로컬 음원',
        audioType,
        loop,
        volume,
        memo,
      },
    ]);
  }, []);

  const addDivider = useCallback((title = '식순 구분') => {
    setCueListRaw(prev => [...prev, { id: makeCueId(), type: 'divider', title: title.trim() || '식순 구분' }]);
  }, []);

  const updateCueItem = useCallback((idx, patch) => {
    setCueListRaw(prev => prev.map((item, i) => (i === idx ? { ...item, ...patch } : item)));
  }, []);

  const updateLocalCueByCode = useCallback((code, patch) => {
    setCueListRaw(prev =>
      prev.map(item => (item.code === code ? { ...item, ...patch } : item))
    );
  }, []);

  const removeCue = useCallback((idx) => {
    const current = cueListRef.current;
    const removed = current[idx];
    const nextList = current.filter((_, i) => i !== idx);
    setCueListRaw(nextList);
    setCueIndex(prev => (idx <= prev ? Math.max(-1, prev - 1) : prev));

    if (removed?.source === 'local' && removed.code) {
      const stillUsed = nextList.some(item => item.code === removed.code);
      if (!stillUsed) onRemoveLocalCodes?.([removed.code]);
    }
  }, [onRemoveLocalCodes]);

  const moveCue = useCallback((idx, dir) => {
    setCueListRaw(prev => {
      const next = [...prev];
      const target = idx + dir;
      if (target < 0 || target >= next.length) return prev;
      [next[idx], next[target]] = [next[target], next[idx]];
      return next;
    });
  }, []);

  const clearCueList = useCallback(() => {
    const localCodes = Array.from(
      new Set(
        cueListRef.current
          .filter(item => item.source === 'local' && item.code)
          .map(item => item.code)
      )
    );
    setCueListRaw([]);
    setCueIndex(-1);
    if (localCodes.length > 0) onRemoveLocalCodes?.(localCodes);
  }, [onRemoveLocalCodes]);

  return {
    cueList,
    cueIndex,
    nextPlayableIndex,
    nextCueItem,
    nextCueCode,
    isCueMode,
    setIsCueMode,
    cueAddSelection,
    setCueAddSelection,
    isCueModeRef,
    triggerNextCue,
    playCueAtIndex,
    selectNextCue,
    stepNextCue,
    resetCue,
    addCue,
    addLocalCue,
    addDivider,
    updateCueItem,
    updateLocalCueByCode,
    removeCue,
    moveCue,
    clearCueList,
    setCueList,
    setCueIndex,
  };
}
