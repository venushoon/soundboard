export function CueBuilderPanel({
  cueList, mappings, cueAddSelection, setCueAddSelection,
  addCue, moveCue, removeCue, clearCueList, getSound,
}) {
  return (
    <div className="w-full max-w-5xl bg-purple-900/20 border border-purple-500/30 rounded-lg p-4 mb-4 text-purple-200 shadow-inner">
      <h3 className="font-bold text-purple-300 mb-3 flex items-center gap-1.5 text-sm">
        <span className="text-base">🎬</span> 큐 시퀀스 구성
        <span className="text-[10px] font-normal text-purple-400/80">(큐 모드에서 Space로 순서대로 재생)</span>
      </h3>
      <div className="flex flex-wrap gap-2 mb-3">
        {cueList.length === 0 && <span className="text-xs text-purple-400/70">등록된 큐가 없습니다. 아래에서 사운드를 골라 추가하세요.</span>}
        {cueList.map((code, idx) => {
          const s = getSound(code);
          return (
            <div key={`${code}-${idx}`} className="flex items-center gap-1 bg-slate-800 border border-purple-500/40 rounded-full pl-3 pr-1.5 py-1 text-xs">
              <span className="text-purple-300 font-bold">{idx + 1}</span>
              <span className="max-w-[100px] truncate">{s ? s.soundLabel : code}</span>
              <button onClick={() => moveCue(idx, -1)} disabled={idx === 0} aria-label="위로 이동" className="w-5 h-5 rounded hover:bg-slate-700 disabled:opacity-30 text-slate-300">↑</button>
              <button onClick={() => moveCue(idx, 1)} disabled={idx === cueList.length - 1} aria-label="아래로 이동" className="w-5 h-5 rounded hover:bg-slate-700 disabled:opacity-30 text-slate-300">↓</button>
              <button onClick={() => removeCue(idx)} aria-label="큐에서 제거" className="w-5 h-5 rounded hover:bg-rose-900/50 text-rose-400">✕</button>
            </div>
          );
        })}
      </div>
      <div className="flex gap-2 items-center">
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
        {cueList.length > 0 && (
          <button onClick={clearCueList} className="ml-auto text-[10px] text-rose-400 hover:text-rose-300">
            전체 삭제
          </button>
        )}
      </div>
    </div>
  );
}

export function CueGoBar({ cueList, cueIndex, getSound, resetCue, triggerNextCue }) {
  return (
    <div className="w-full max-w-5xl bg-[#222731] border border-purple-500/40 rounded-xl p-4 mb-4 shadow-lg">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          {cueIndex >= 0 && (
            <div className="text-[10px] text-emerald-400 mb-0.5 font-medium flex items-center gap-1">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
              방금 재생됨 · {cueIndex + 1}번 「{getSound(cueList[cueIndex])?.soundLabel || cueList[cueIndex]}」
            </div>
          )}
          <div className="text-[10px] text-purple-400 mb-1 font-medium">
            {cueList.length === 0 ? '큐 없음' : `다음 큐 · ${Math.min(cueIndex + 2, cueList.length)} / ${cueList.length}`}
          </div>
          <div className="text-base font-bold text-white">
            {cueList.length === 0
              ? '편집 모드에서 큐를 먼저 구성하세요'
              : cueList[cueIndex + 1]
              ? (getSound(cueList[cueIndex + 1])?.soundLabel || '알 수 없음')
              : '🏁 마지막 큐입니다'}
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={resetCue} disabled={cueIndex === -1} className="text-xs px-3 py-2.5 rounded-lg bg-slate-700 hover:bg-slate-600 disabled:opacity-40 transition-colors">
            ⏮ 처음으로
          </button>
          <button
            onClick={triggerNextCue}
            disabled={cueList.length === 0 || cueIndex + 1 >= cueList.length}
            className="bg-purple-600 hover:bg-purple-500 disabled:opacity-40 disabled:cursor-not-allowed text-white font-bold px-6 py-2.5 rounded-lg border-b-4 border-purple-800 active:border-b-0 active:translate-y-1 transition-all"
          >
            GO ⎵
          </button>
        </div>
      </div>
      {cueList.length > 0 && (
        <div className="flex gap-1.5 mt-3 flex-wrap">
          {cueList.map((code, idx) => (
            <div
              key={idx}
              title={getSound(code)?.soundLabel || code}
              className={`w-3 h-3 rounded-sm transition-colors ${
                idx < cueIndex + 1 ? 'bg-slate-600'
                : idx === cueIndex + 1 ? 'bg-green-400 shadow-[0_0_6px_rgba(74,222,128,0.8)]'
                : 'bg-transparent border border-dashed border-slate-500'
              }`}
            />
          ))}
        </div>
      )}
    </div>
  );
}