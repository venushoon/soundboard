export function CueGoBar({
  cueList,
  cueIndex,
  nextPlayableIndex,
  nextCueItem,
  getSound,
  resetCue,
  triggerNextCue,
  isPopupOpen,
  onFocusOrReopenPopup,
}) {
  const lastItem = cueIndex >= 0 && cueList[cueIndex]?.type !== 'divider' ? cueList[cueIndex] : null;
  const nextSound = nextCueItem ? getSound(nextCueItem.code) : null;

  return (
    <div className="w-full max-w-5xl bg-[#222731] border border-purple-500/40 rounded-xl p-4 mb-4 shadow-lg">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          {lastItem && (
            <div className="text-[10px] text-emerald-400 mb-0.5 font-medium flex items-center gap-1">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
              방금 재생됨 · {cueIndex + 1}번 「{lastItem.type === 'fade' ? `🌗 페이드 아웃 ${lastItem.seconds}초` : (getSound(lastItem.code)?.soundLabel || lastItem.soundLabel || lastItem.code)}」
            </div>
          )}
          <div className="text-[10px] text-purple-400 mb-1 font-medium flex items-center gap-2">
            <span>
              {cueList.length === 0
                ? '큐 없음'
                : nextPlayableIndex >= 0
                ? `다음 대기 큐 · #${nextPlayableIndex + 1}`
                : '모든 큐 완료'}
            </span>
            {isPopupOpen && (
              <span className="px-1.5 py-0.5 rounded bg-purple-500/20 border border-purple-500/40 text-purple-300">
                🗗 독립 창 실행 중
              </span>
            )}
          </div>
          <div className="text-base font-bold text-white flex items-center gap-2">
            <span>
              {cueList.length === 0
                ? '큐플레이어 창에서 식순을 추가하세요'
                : nextCueItem
                ? (nextCueItem.type === 'fade'
                    ? `🌗 페이드 아웃 (${nextCueItem.target === 'all' ? '전체 소리' : 'BGM'} · ${nextCueItem.seconds}초)`
                    : (nextSound?.soundLabel || nextCueItem.soundLabel || '알 수 없음'))
                : '🏁 마지막 큐입니다'}
            </span>
            {nextCueItem?.memo && (
              <span className="text-xs font-normal text-amber-300 bg-amber-500/10 border border-amber-500/30 px-2 py-0.5 rounded">
                💬 {nextCueItem.memo}
              </span>
            )}
          </div>
        </div>
        <div className="flex items-center gap-2">
          {onFocusOrReopenPopup && (
            <button
              onClick={onFocusOrReopenPopup}
              className="text-xs px-3 py-2.5 rounded-lg bg-purple-900/60 hover:bg-purple-800/80 border border-purple-500/40 text-purple-200 font-semibold transition-colors"
            >
              {isPopupOpen ? '↗ 큐플레이어 창 보기' : '↗ 독립 창 다시 열기'}
            </button>
          )}
          <button
            onClick={resetCue}
            disabled={cueIndex === -1}
            className="text-xs px-3 py-2.5 rounded-lg bg-slate-700 hover:bg-slate-600 disabled:opacity-40 transition-colors"
          >
            ⏮ 처음으로
          </button>
          <button
            onClick={triggerNextCue}
            disabled={nextPlayableIndex === -1}
            className="bg-purple-600 hover:bg-purple-500 disabled:opacity-40 disabled:cursor-not-allowed text-white font-bold px-6 py-2.5 rounded-lg border-b-4 border-purple-800 active:border-b-0 active:translate-y-1 transition-all"
          >
            GO ⎵
          </button>
        </div>
      </div>
      {cueList.length > 0 && (
        <div className="flex gap-1.5 mt-3 flex-wrap">
          {cueList.map((item, idx) => {
            if (item.type === 'divider') {
              return (
                <div
                  key={item.id || idx}
                  title={`[구분] ${item.title}`}
                  className="w-1.5 h-3 bg-amber-400/70 rounded-full mx-0.5"
                />
              );
            }
            if (item.type === 'fade') {
              return (
                <div
                  key={item.id || idx}
                  title={`[페이드] ${item.target === 'all' ? '전체 소리' : 'BGM'} ${item.seconds}초`}
                  className={`w-3 h-3 rounded-full transition-colors ${
                    idx <= cueIndex
                      ? 'bg-slate-600'
                      : idx === nextPlayableIndex
                      ? 'bg-green-400 shadow-[0_0_6px_rgba(74,222,128,0.8)]'
                      : 'bg-sky-500/50 border border-sky-400/60'
                  }`}
                />
              );
            }
            return (
              <div
                key={item.id || idx}
                title={getSound(item.code)?.soundLabel || item.soundLabel || item.code}
                className={`w-3 h-3 rounded-sm transition-colors ${
                  idx <= cueIndex
                    ? 'bg-slate-600'
                    : idx === nextPlayableIndex
                    ? 'bg-green-400 shadow-[0_0_6px_rgba(74,222,128,0.8)]'
                    : 'bg-transparent border border-dashed border-slate-500'
                }`}
              />
            );
          })}
        </div>
      )}
    </div>
  );
}
