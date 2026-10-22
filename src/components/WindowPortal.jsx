import { useEffect, useMemo } from 'react';
import { createPortal } from 'react-dom';

function copyStyles(sourceDoc, targetDoc) {
  Array.from(sourceDoc.querySelectorAll('link[rel="stylesheet"], style')).forEach((node) => {
    targetDoc.head.appendChild(node.cloneNode(true));
  });
}

function getOrCreatePopupRoot(win, title) {
  if (!win || win.closed) return null;
  const doc = win.document;
  doc.title = title;

  let rootDiv = doc.getElementById('cue-player-root');
  if (!rootDiv) {
    doc.documentElement.className = 'dark';
    doc.body.className = 'bg-[#14171c] text-slate-200 font-sans m-0 p-0 overflow-hidden select-none';
    doc.body.innerHTML = '';
    doc.head.innerHTML = '<meta charset="utf-8" /><meta name="viewport" content="width=device-width, initial-scale=1.0" />';
    copyStyles(window.document, doc);

    rootDiv = doc.createElement('div');
    rootDiv.id = 'cue-player-root';
    rootDiv.className = 'h-screen w-screen overflow-hidden';
    doc.body.appendChild(rootDiv);
  }
  return rootDiv;
}

export default function WindowPortal({
  externalWindow,
  title = '🎬 큐플레이어 (CuePlayer) — 기계식 사운드보드',
  onClose,
  onKeyDown,
  onKeyUp,
  children,
}) {
  const containerEl = useMemo(
    () => getOrCreatePopupRoot(externalWindow, title),
    [externalWindow, title]
  );

  useEffect(() => {
    if (!externalWindow || externalWindow.closed) return;
    const doc = externalWindow.document;

    // Vite HMR이나 동적 스타일 변경 시 동기화
    const observer = new MutationObserver(() => {
      doc.head.querySelectorAll('link[rel="stylesheet"], style').forEach(n => n.remove());
      copyStyles(window.document, doc);
    });
    observer.observe(window.document.head, { childList: true, subtree: true, characterData: true });

    const handleUnload = () => {
      onClose?.();
    };

    const handleWinKeyDown = (e) => {
      onKeyDown?.(e, doc);
    };

    const handleWinKeyUp = (e) => {
      onKeyUp?.(e, doc);
    };

    externalWindow.addEventListener('beforeunload', handleUnload);
    externalWindow.addEventListener('keydown', handleWinKeyDown);
    externalWindow.addEventListener('keyup', handleWinKeyUp);

    const checkClosedTimer = setInterval(() => {
      if (externalWindow.closed) {
        clearInterval(checkClosedTimer);
        onClose?.();
      }
    }, 500);

    return () => {
      clearInterval(checkClosedTimer);
      observer.disconnect();
      externalWindow.removeEventListener('beforeunload', handleUnload);
      externalWindow.removeEventListener('keydown', handleWinKeyDown);
      externalWindow.removeEventListener('keyup', handleWinKeyUp);
    };
  }, [externalWindow, onClose, onKeyDown, onKeyUp]);

  if (!containerEl) return null;
  return createPortal(children, containerEl);
}
