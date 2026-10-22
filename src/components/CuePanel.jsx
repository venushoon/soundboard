export function CueBuilderPanel({
  cueList, mappings, cueAddSelection, setCueAddSelection,
  addCue, addDivider, moveCue, removeCue, clearCueList, getSound, onOpenCueWindow,
}) {
  return (
    <div className="w-full max-w-5xl bg-purple-900/20 border border-purple-500/30 rounded-lg p-4 mb-4 text-purple-200 shadow-inner">
      <div className="flex flex-wrap items-center justify-between gap-2 mb-3">
        <h3 className="font-bold text-purple-300 flex items-center gap-1.5 text-sm">
          <span className="text-base">🎬</span> 큐 시퀀스 구성
          <span className="text-[10px] font-normal text-purple-400/80">(큐 모드 독립 창에서도 실시간 편집 가능)</span>
        </h3>
        {onOpenCueWindow && (
          <button
            type="button"
            onClick={onOpenCueWindow}
            className="text-xs bg-purple-600 hover:bg-purple-500 text-white font-bold px-3 py-1 rounded-md transition-colors flex items-center gap-1"
          >
            ↗ 큐플레이어 창 열기
          </button>
        )}
      </div>

      <div className="flex flex-wrap gap-2 mb-3">
        {cueList.length === 0 && (
          <span className="text-xs text-purple-400/70">등록된 큐가 없습니다. 아래에서 사운드를 골라 추가하세요.</span>
        )}
        {cueList.map((item, idx) => {
          if (item.type === 'divider') {
            return (
              <div
                key={item.id || `div-${idx}`}
                className="flex items-center gap-1 bg-amber-950/60 border border-amber-500/40 rounded-full pl-3 pr-1.5 py-1 text-xs text-amber-200"
              >
                <span className="font-bold">🔖 {item.title}</span>
                <button onClick={() => moveCue(idx, -1)} disabled={idx === 0} aria-label="위로 이동" className="w-5 h-5 rounded hover:bg-slate-700 disabled:opacity-30 text-slate-300">↑</button>
                <button onClick={() => moveCue(idx, 1)} disabled={idx === cueList.length - 1} aria-label="아래로 이동" className="w-5 h-5 rounded hover:bg-slate-700 disabled:opacity-30 text-slate-300">↓</button>
                <button onClick={() => removeCue(idx)} aria-label="큐에서 제거" className="w-5 h-5 rounded hover:bg-rose-900/50 text-rose-400">✕</button>
              </div>
            );
          }

          const s = getSound(item.code);
          return (
            <div
              key={item.id || `${item.code}-${idx}`}
              className="flex items-center gap-1 bg-slate-800 border border-purple-500/40 rounded-full pl-3 pr-1.5 py-1 text-xs"
            >
              <span className="text-purple-300 font-bold">{idx + 1}</span>
              <span className="max-w-[110px] truncate">{s ? s.soundLabel : item.code}</span>
              {item.memo && <span className="text-[10px] text-amber-300 max-w-[80px] truncate">({item.memo})</span>}
              <button onClick={() => moveCue(idx, -1)} disabled={idx === 0} aria-label="위로 이동" className="w-5 h-5 rounded hover:bg-slate-700 disabled:opacity-30 text-slate-300">↑</button>
              <button onClick={() => moveCue(idx, 1)} disabled={idx === cueList.length - 1} aria-label="아래로 이동" className="w-5 h-5 rounded hover:bg-slate-700 disabled:opacity-30 text-slate-300">↓</button>
              <button onClick={() => removeCue(idx)} aria-label="큐에서 제거" className="w-5 h-5 rounded hover:bg-rose-900/50 text-rose-400">✕</button>
            </div>
          );
        })}
      </div>

      <div className="flex flex-wrap gap-2 items-center">
        <select
          value={cueAddSelection}
          onChange={(e) => setCueAddSelection(e.target.value)}
          className="bg-slate-700 text-slate-200 text-xs rounded px-2 py-1.5 border border-slate-600 outline-none max-w-[220px]"
        >
          <option value="">사운드 선택...</option>
          {mappings.filter(s => s.audioBuffer).map(s => (
            <option key={s.code} value={s.code}>{s.keyLabel} — {s.soundLabel}</option>
          ))}
        </select>
        <button
          onClick={() => addCue(cueAddSelection)}
          disabled={!cueAddSelection}
          className="bg-purple-600 hover:bg-purple-500 disabled:opacity-40 text-white text-xs font-medium px-3 py-1.5 rounded transition-colors"
        >
          + 큐에 추가
        </button>
        {addDivider && (
          <button
            onClick={() => addDivider('식순 구분')}
            className="bg-slate-700 hover:bg-slate-600 text-slate-200 text-xs font-medium px-3 py-1.5 rounded transition-colors"
          >
            + 구분선 추가
          </button>
        )}
        {cueList.length > 0 && (
          <button onClick={clearCueList} className="ml-auto text-[10px] text-rose-400 hover:text-rose-300">
            전체 삭제
          </button>
        )}
      </div>
    </div>
  );
}

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
              방금 재생됨 · {cueIndex + 1}번 「{getSound(lastItem.code)?.soundLabel || lastItem.code}」
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
                ? (nextSound?.soundLabel || '알 수 없음')
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
            return (
              <div
                key={item.id || idx}
                title={getSound(item.code)?.soundLabel || item.code}
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
