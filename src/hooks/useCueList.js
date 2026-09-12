import { useCallback, useEffect, useRef, useState } from 'react';
import { CUE_KEY } from '../constants.js';

export function useCueList({ mappingsRef, playSfx, handleBGMPlayback, showToast }) {
  const [cueList, setCueList] = useState(() => {
    const saved = localStorage.getItem(CUE_KEY);
    if (saved) { try { return JSON.parse(saved); } catch (e) { return []; } }
    return [];
  });
  const [cueIndex, setCueIndex] = useState(-1);
  const [isCueMode, setIsCueMode] = useState(false);
  const [cueAddSelection, setCueAddSelection] = useState('');

  const cueListRef = useRef(cueList);
  const cueIndexRef = useRef(cueIndex);
  const isCueModeRef = useRef(isCueMode);

  useEffect(() => { cueListRef.current = cueList; }, [cueList]);
  useEffect(() => { cueIndexRef.current = cueIndex; }, [cueIndex]);
  useEffect(() => { isCueModeRef.current = isCueMode; }, [isCueMode]);

  useEffect(() => {
    const id = setTimeout(() => localStorage.setItem(CUE_KEY, JSON.stringify(cueList)), 300);
    return () => clearTimeout(id);
  }, [cueList]);

  const triggerNextCue = useCallback(() => {
    const list = cueListRef.current;
    if (list.length === 0) { showToast('등록된 큐가 없습니다', 'error'); return; }
    const nextIndex = cueIndexRef.current + 1;
    if (nextIndex >= list.length) { showToast('마지막 큐입니다', 'success'); return; }

    const code = list[nextIndex];
    const soundObj = mappingsRef.current.find(s => s.code === code);
    if (!soundObj || !soundObj.audioBuffer) {
      showToast('등록되지 않은 음원입니다. 다음 큐로 건너뜁니다.', 'error');
      setCueIndex(nextIndex);
      return;
    }

    if (soundObj.type === 'sfx') {
      playSfx(soundObj);
    } else {
      handleBGMPlayback(soundObj, 'play');
    }
    setCueIndex(nextIndex);
  }, [mappingsRef, playSfx, handleBGMPlayback, showToast]);

  const resetCue = useCallback(() => {
    setCueIndex(-1);
    showToast('큐가 처음으로 이동했습니다', 'success');
  }, [showToast]);

  const addCue = useCallback((code) => {
    if (!code) return;
    setCueList(prev => [...prev, code]);
    setCueAddSelection('');
  }, []);

  const removeCue = useCallback((idx) => {
    setCueList(prev => prev.filter((_, i) => i !== idx));
    setCueIndex(-1);
  }, []);

  const moveCue = useCallback((idx, dir) => {
    setCueList(prev => {
      const next = [...prev];
      const target = idx + dir;
      if (target < 0 || target >= next.length) return prev;
      [next[idx], next[target]] = [next[target], next[idx]];
      return next;
    });
  }, []);

  const clearCueList = useCallback(() => {
    setCueList([]);
    setCueIndex(-1);
  }, []);

  return {
    cueList, cueIndex, isCueMode, setIsCueMode,
    cueAddSelection, setCueAddSelection, isCueModeRef,
    triggerNextCue, resetCue, addCue, removeCue, moveCue, clearCueList,
    setCueList, setCueIndex,
  };
}