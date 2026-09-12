import { memo, useRef } from 'react';

const KeycapButton = memo(({
  sound, isActive, isEditMode, bgmUIState, isCueTarget,
  onAction, onFileUpload, onSettingChange, onDelete,
}) => {
  const fileInputRef = useRef(null);
  const hasAudio = !!sound.audioBuffer;
  const canPlay = !isEditMode && hasAudio && !sound.isDecoding;

  const handlePointerDown = (e) => {
    e.preventDefault();
    if (canPlay) onAction(sound.code, true);
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
  };
  const handleKeyUp = (e) => {
    if (e.key !== 'Enter' && e.key !== ' ') return;
    e.preventDefault();
    if (canPlay) onAction(sound.code, false);
  };

  return (
    <div className="relative flex flex-col w-24 h-24 sm:w-28 sm:h-28">
      <input
        type="file" accept="audio/*" ref={fileInputRef} className="hidden"
        onChange={(e) => onFileUpload(sound.code, e)}
      />

      {isEditMode ? (
        <div className={`p-1.5 rounded-lg flex flex-col justify-between border-2 border-dashed h-full transition-colors ${
          sound.isDecoding ? 'border-yellow-500 bg-yellow-900/30' : hasAudio ? 'border-emerald-500 bg-slate-800' : 'border-slate-500 bg-slate-800/50'
        }`}>
          <div className="flex justify-between items-center mb-1">
            <span className="text-[10px] sm:text-xs font-bold text-slate-400 leading-none">{sound.keyLabel}</span>
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
                aria-label={`${sound.soundLabel} 볼륨`}
                className="w-full h-1 bg-slate-600 rounded-lg appearance-none cursor-pointer accent-emerald-400"
              />
            </div>
          </div>

          <div className="flex gap-1 h-[22px]">
            <button
              onClick={() => fileInputRef.current?.click()}
              disabled={sound.isDecoding}
              className={`flex-grow text-[10px] font-medium py-0.5 rounded transition-colors h-[22px] shadow-sm ${
                sound.isDecoding ? 'bg-yellow-600 text-yellow-100' : hasAudio ? 'bg-slate-600 hover:bg-slate-500 text-white' : 'bg-blue-600 hover:bg-blue-500 text-white'
              }`}
            >
              {hasAudio ? '파일 변경' : '파일 등록'}
            </button>
            {hasAudio && !sound.isDecoding && (
              <button
                onClick={() => onDelete(sound.code)}
                title="비어있음으로 되돌리기"
                aria-label={`${sound.soundLabel} 삭제`}
                className="flex-shrink-0 w-[22px] text-[10px] rounded bg-rose-900/60 hover:bg-rose-700 text-rose-200 hover:text-white transition-colors shadow-sm"
              >
                ✕
              </button>
            )}
          </div>
        </div>
      ) : (
        <button
          onMouseDown={handlePointerDown}
          onMouseUp={handlePointerUp}
          onMouseLeave={handlePointerUp}
          onTouchStart={handlePointerDown}
          onTouchEnd={handlePointerUp}
          onKeyDown={handleKeyDown}
          onKeyUp={handleKeyUp}
          disabled={!hasAudio || sound.isDecoding}
          aria-label={hasAudio ? `${sound.keyLabel} 키, ${sound.soundLabel} 재생` : `${sound.keyLabel} 키, 비어있음`}
          aria-pressed={isActive}
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
      )}
    </div>
  );
});

export default KeycapButton;