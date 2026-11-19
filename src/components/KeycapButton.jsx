import { memo } from 'react';

// 재생 전용 키캡. 편집 모드는 폐지됐다 — 설정은 키별 모달(KeySettingsModal)로 연다.
// - 소리가 있는 키: 우측 하단에 흐린 ⚙ 배지 (잠금 시 숨김). 재생 버튼과 형제 요소로 분리해
//   배지를 눌러도 재생이 트리거되지 않는다.
// - 빈 키: 재생할 게 없으므로 키 전체 클릭으로 설정을 연다 (잠금 시 비활성).
const KeycapButton = memo(({
  sound, isActive, bgmUIState, isCueTarget,
  onAction, locked, onOpenSettings,
}) => {
  const hasAudio = !!sound.audioBuffer;
  const canPlay = hasAudio && !sound.isDecoding;
  const canOpenSettings = !locked && !sound.isDecoding;

  const handlePointerDown = (e) => {
    e.preventDefault();
    if (canPlay) onAction(sound.code, true);
    else if (!hasAudio && canOpenSettings) onOpenSettings(sound.code);
  };
  const handlePointerUp = (e) => {
    e.preventDefault();
    if (canPlay) onAction(sound.code, false);
  };

  const handleKeyDown = (e) => {
    if (e.key !== 'Enter' && e.key !== ' ') return;
    e.preventDefault();
    if (e.repeat) return;
    if (canPlay) onAction(sound.code, true);
    else if (!hasAudio && canOpenSettings) onOpenSettings(sound.code);
  };
  const handleKeyUp = (e) => {
    if (e.key !== 'Enter' && e.key !== ' ') return;
    e.preventDefault();
    if (canPlay) onAction(sound.code, false);
  };

  return (
    <div className="relative flex flex-col w-24 sm:w-28 h-24 sm:h-28">
      <button
        onMouseDown={handlePointerDown}
        onMouseUp={handlePointerUp}
        onMouseLeave={handlePointerUp}
        onTouchStart={handlePointerDown}
        onTouchEnd={handlePointerUp}
        onKeyDown={handleKeyDown}
        onKeyUp={handleKeyUp}
        disabled={sound.isDecoding || (!hasAudio && locked)}
        aria-label={hasAudio
          ? `${sound.keyLabel} 키, ${sound.soundLabel} 재생`
          : `${sound.keyLabel} 키, 비어있음${canOpenSettings ? '. 눌러서 설정 열기' : ''}`}
        aria-pressed={isActive}
        title={!hasAudio && canOpenSettings ? '눌러서 소리 등록·설정' : undefined}
        className={`
          relative w-full h-full rounded-xl flex flex-col items-center justify-center p-2
          transition-all duration-75 select-none outline-none
          focus-visible:ring-2 focus-visible:ring-blue-400 focus-visible:ring-offset-2 focus-visible:ring-offset-[#1e232a]
          ${!hasAudio ? 'bg-slate-800 border-2 border-dashed border-slate-600 opacity-60 shadow-none mt-1' : `border border-slate-700/50 ${sound.color}`}
          ${hasAudio && !isActive ? 'shadow-[0_6px_0_rgba(0,0,0,0.6),0_8px_10px_rgba(0,0,0,0.4)] transform -translate-y-1' : ''}
          ${isActive && hasAudio && !sound.isDecoding ? 'shadow-[0_1px_0_rgba(0,0,0,0.8)] transform translate-y-1 brightness-90' : ''}
          ${bgmUIState === 'playing' ? 'ring-2 ring-green-400 shadow-[0_0_15px_rgba(74,222,128,0.5),0_6px_0_rgba(0,0,0,0.6)]' : ''}
          ${isCueTarget ? 'ring-4 ring-green-400 shadow-[0_0_20px_rgba(74,222,128,0.7)] scale-105' : ''}
          text-white cursor-pointer
        `}
      >
        {isCueTarget && (
          <div className="absolute -top-2 -right-2 w-4 h-4 rounded-full bg-green-400 animate-ping" />
        )}
        {hasAudio && bgmUIState && (
          <div className="absolute top-1 right-1.5 text-xs drop-shadow-md">
            {bgmUIState === 'playing' && <span className="inline-block animate-pulse text-green-300">🔊</span>}
            {bgmUIState === 'paused' && <span className="opacity-70 text-amber-300">⏸️</span>}
            {bgmUIState === 'fading' && <span className="text-amber-300">📉</span>}
          </div>
        )}

        <span className="absolute top-1.5 left-2 text-[11px] sm:text-xs font-black opacity-60 drop-shadow-sm">
          {sound.keyLabel}
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

      {hasAudio && canOpenSettings && (
        <button
          type="button"
          aria-label={`${sound.soundLabel} 키 설정 열기`}
          title="키 설정"
          onPointerDown={(e) => e.stopPropagation()}
          onClick={(e) => { e.stopPropagation(); onOpenSettings(sound.code); }}
          className="absolute bottom-1 right-1 z-10 flex h-6 w-6 items-center justify-center rounded-full bg-black/40 text-[11px] leading-none text-white/75 opacity-60 backdrop-blur-[1px] transition hover:bg-black/70 hover:text-white hover:opacity-100"
        >
          ⚙
        </button>
      )}
    </div>
  );
});

export default KeycapButton;
