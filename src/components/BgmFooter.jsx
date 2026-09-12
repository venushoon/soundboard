export default function BgmFooter({
  bgmUIStates, getSound, getPlaybackInfo,
  handleBGMPlayback, fadeOutBGM, stopBGM, handleSettingChange, formatTime,
}) {
  if (Object.keys(bgmUIStates).length === 0) return null;

  return (
    <footer className="flex-shrink-0 bg-[#171a1f]/95 backdrop-blur-md border-t border-black/50 p-4 z-20 shadow-[0_-10px_30px_rgba(0,0,0,0.6)] animate-slide-up">
      <div className="max-w-6xl mx-auto flex flex-wrap gap-4 items-center justify-center lg:justify-start">
        {Object.entries(bgmUIStates).map(([code, uiState]) => {
          const soundData = getSound(code);
          if (!soundData) return null;
          const info = getPlaybackInfo(code);
          const pct = info && info.duration > 0 ? (info.elapsed / info.duration) * 100 : 0;

          return (
            <div key={code} className="flex flex-col gap-3 bg-[#222731] border border-slate-700/50 rounded-lg p-3 min-w-[320px] flex-grow max-w-md shadow-lg">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2.5 overflow-hidden w-full">
                  <div className={`flex-shrink-0 w-2.5 h-2.5 rounded-full ${
                    uiState === 'playing' ? 'bg-green-500 animate-pulse shadow-[0_0_8px_rgba(34,197,94,0.6)]' : uiState === 'fading' ? 'bg-amber-500' : 'bg-slate-500'
                  }`} />
                  <span className="font-bold text-sm truncate flex-grow mr-2 text-slate-200">
                    {soundData.soundLabel} <span className="text-[10px] text-slate-500 font-normal">({soundData.keyLabel})</span>
                  </span>
                </div>
                <div className="flex gap-1 flex-shrink-0">
                  <button
                    onClick={() => handleBGMPlayback(soundData, 'toggle')}
                    disabled={uiState === 'fading'}
                    aria-label={uiState === 'paused' ? `${soundData.soundLabel} 재생` : `${soundData.soundLabel} 일시정지`}
                    className="w-9 h-9 bg-slate-700 hover:bg-slate-600 rounded"
                  >
                    {uiState === 'paused' ? '▶️' : '⏸️'}
                  </button>
                  <button
                    onClick={() => fadeOutBGM(code)}
                    disabled={uiState === 'fading'}
                    aria-label={`${soundData.soundLabel} 페이드아웃`}
                    title="페이드아웃"
                    className="w-9 h-9 bg-slate-700 hover:bg-slate-600 rounded"
                  >
                    📉
                  </button>
                  <button
                    onClick={() => stopBGM(code)}
                    aria-label={`${soundData.soundLabel} 정지`}
                    className="w-9 h-9 bg-rose-900/50 hover:bg-rose-700 text-rose-300 rounded"
                  >
                    ⏹️
                  </button>
                </div>
              </div>

              {info && (
                <div className="px-1">
                  <div className="h-1 bg-slate-700 rounded-full overflow-hidden mb-1">
                    <div className="h-full bg-blue-500" style={{ width: `${pct}%` }} />
                  </div>
                  <div className="flex justify-between text-[10px] text-slate-500 font-mono">
                    <span>{formatTime(info.elapsed)}</span>
                    <span>{formatTime(info.duration)}</span>
                  </div>
                </div>
              )}

              <div className="flex items-center justify-between gap-4 px-1">
                <input
                  type="range" min="0" max="1" step="0.01" value={soundData.volume}
                  onChange={(e) => handleSettingChange(code, 'volume', parseFloat(e.target.value))}
                  aria-label={`${soundData.soundLabel} 볼륨`}
                  className="flex-grow h-1.5 bg-slate-700 rounded-lg appearance-none cursor-pointer accent-blue-500"
                />
                <button
                  onClick={() => handleSettingChange(code, 'loop', !soundData.loop)}
                  className={`flex-shrink-0 text-[10px] px-2 py-1 rounded border ${
                    soundData.loop ? 'bg-blue-900/50 border-blue-500/50 text-blue-300' : 'bg-slate-800 border-slate-600 text-slate-500'
                  }`}
                >
                  {soundData.loop ? '🔁 반복 켬' : '➡️ 반복 끔'}
                </button>
              </div>
            </div>
          );
        })}
      </div>
    </footer>
  );
}