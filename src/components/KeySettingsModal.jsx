import { useEffect, useRef, useState } from 'react';
import { KEY_COLORS } from '../constants.js';

// 키 1개의 설정을 여는 중앙 모달 (편집 모드 폐지 후의 유일한 키 설정 표면).
// 보드 영역이 스크롤 컨테이너라 키 옆 팝오버는 끝줄에서 잘리므로 중앙 모달로 연다.
// ←/→ 버튼·방향키로 옆 키 설정으로 바로 이동할 수 있어 일괄 세팅 피로를 줄인다.
// 부모가 key={sound.code}로 렌더해 키가 바뀌면 내부 상태(팔레트 등)가 초기화된다.
export default function KeySettingsModal({
  sound, onClose, onNavigate, onSettingChange, onFileUpload, onDelete,
}) {
  const fileInputRef = useRef(null);
  const [paletteOpen, setPaletteOpen] = useState(false);
  const hasAudio = !!sound.audioBuffer;
  const isBgm = String(sound.code).startsWith('Numpad');
  const currentColor = KEY_COLORS.find(c => c.cls === sound.color);

  useEffect(() => {
    const onKey = (e) => {
      if (e.code === 'Escape') {
        e.preventDefault();
        e.stopPropagation();
        if (paletteOpen) setPaletteOpen(false);
        else onClose();
        return;
      }
      const tag = e.target?.tagName;
      if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT') return;
      if (e.code === 'ArrowLeft') { e.preventDefault(); e.stopPropagation(); onNavigate(-1); }
      if (e.code === 'ArrowRight') { e.preventDefault(); e.stopPropagation(); onNavigate(1); }
    };
    window.addEventListener('keydown', onKey, true);
    return () => window.removeEventListener('keydown', onKey, true);
  }, [onClose, onNavigate, paletteOpen]);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div
        className="absolute inset-0 bg-black/60 backdrop-blur-sm"
        onClick={() => (paletteOpen ? setPaletteOpen(false) : onClose())}
      />
      <div
        role="dialog"
        aria-modal="true"
        aria-label={`${sound.keyLabel} 키 설정`}
        className="relative w-full max-w-sm rounded-2xl border border-slate-600 bg-slate-800 p-5 shadow-2xl"
      >
        <input
          type="file" accept="audio/*" ref={fileInputRef} className="hidden"
          onChange={(e) => onFileUpload(sound.code, e)}
        />

        <div className="mb-4 flex items-center justify-between">
          <h3 className="flex items-center gap-2 text-base font-bold text-white">
            <span className="rounded bg-slate-700 px-2 py-0.5 text-sm font-black text-slate-200">{sound.keyLabel}</span>
            키 설정
            <span className={`rounded px-2 py-0.5 text-[10px] font-normal ${isBgm ? 'bg-blue-400/10 text-blue-400' : 'bg-emerald-400/10 text-emerald-400'}`}>
              {isBgm ? '배경음악' : '효과음'}
            </span>
          </h3>
          <button
            type="button"
            onClick={onClose}
            aria-label="설정 닫기"
            className="flex h-8 w-8 items-center justify-center rounded-lg bg-slate-700 text-slate-300 transition hover:bg-slate-600 hover:text-white"
          >
            ✕
          </button>
        </div>

        {sound.isDecoding ? (
          <p className="py-6 text-center text-sm text-yellow-300">파일을 분석하는 중입니다…</p>
        ) : !sound.soundId ? (
          <div className="py-2 text-center">
            <p className="mb-4 text-sm leading-relaxed text-slate-300">
              이 키에 등록된 소리가 없습니다.<br />파일을 등록하거나 라이브러리에서 배치하세요.
            </p>
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              className="w-full rounded-lg bg-blue-600 py-2.5 text-sm font-bold text-white transition hover:bg-blue-500"
            >
              📁 파일 등록
            </button>
          </div>
        ) : (
          <div className="flex flex-col gap-4">
            <div>
              <label htmlFor="key-settings-name" className="mb-1 block text-xs font-semibold text-slate-400">이름</label>
              <input
                id="key-settings-name"
                type="text"
                value={sound.soundLabel}
                onChange={(e) => onSettingChange(sound.code, 'soundLabel', e.target.value)}
                placeholder="효과음 이름"
                className="w-full rounded-lg border border-slate-600 bg-slate-700 p-2 text-sm text-white focus:border-blue-400 focus:outline-none"
              />
            </div>

            <div>
              <span className="mb-1 block text-xs font-semibold text-slate-400">볼륨</span>
              <div className="flex items-center gap-2">
                <input
                  type="range" min="0" max="2" step="0.05"
                  value={sound.volume}
                  onChange={(e) => onSettingChange(sound.code, 'volume', parseFloat(e.target.value))}
                  aria-label={`${sound.soundLabel} 볼륨`}
                  className="h-1.5 flex-grow cursor-pointer appearance-none rounded-lg bg-slate-600 accent-emerald-400"
                />
                <span className="w-12 text-right text-xs font-medium text-slate-300">{Math.round(sound.volume * 100)}%</span>
              </div>
            </div>

            <div>
              <span className="mb-1 block text-xs font-semibold text-slate-400">키 색상</span>
              <button
                type="button"
                onClick={() => setPaletteOpen(o => !o)}
                aria-expanded={paletteOpen}
                className="flex items-center gap-2 rounded-lg border border-slate-600 bg-slate-700 px-3 py-2 text-sm text-white transition hover:border-slate-500"
              >
                <span className={`h-4 w-4 rounded-full ring-1 ring-white/40 ${sound.color || 'bg-slate-700'}`} />
                {currentColor?.label || '기본'}
                <span className="text-[10px] text-slate-400">▾</span>
              </button>
              {paletteOpen && (
                <div className="mt-2 grid grid-cols-6 justify-items-center gap-2 rounded-lg border border-slate-600 bg-slate-900 p-3" role="group" aria-label="키 색상 선택">
                  {KEY_COLORS.map(c => (
                    <button
                      key={c.cls}
                      type="button"
                      title={c.label}
                      aria-label={`키 색상 ${c.label}`}
                      aria-pressed={sound.color === c.cls}
                      onClick={() => { onSettingChange(sound.code, 'color', c.cls); setPaletteOpen(false); }}
                      className={`h-6 w-6 rounded-full ${c.cls} transition-transform ${
                        sound.color === c.cls ? 'scale-110 ring-2 ring-white' : 'opacity-70 hover:scale-110 hover:opacity-100'
                      }`}
                    />
                  ))}
                </div>
              )}
            </div>

            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="flex-grow rounded-lg bg-slate-600 py-2 text-sm font-medium text-white transition hover:bg-slate-500"
              >
                파일 변경
              </button>
              <button
                type="button"
                onClick={() => onDelete(sound.code)}
                className="rounded-lg bg-rose-900/60 px-4 py-2 text-sm font-medium text-rose-200 transition hover:bg-rose-700 hover:text-white"
              >
                비우기
              </button>
            </div>
          </div>
        )}

        <div className="mt-5 flex items-center justify-between border-t border-slate-700 pt-4">
          <button
            type="button"
            onClick={() => onNavigate(-1)}
            className="rounded-lg bg-slate-700 px-3 py-2 text-xs font-bold text-slate-200 transition hover:bg-slate-600"
          >
            ← 이전 키
          </button>
          <span className="text-[10px] text-slate-500">키보드 ← → 로도 이동</span>
          <button
            type="button"
            onClick={() => onNavigate(1)}
            className="rounded-lg bg-slate-700 px-3 py-2 text-xs font-bold text-slate-200 transition hover:bg-slate-600"
          >
            다음 키 →
          </button>
        </div>
      </div>
    </div>
  );
}
