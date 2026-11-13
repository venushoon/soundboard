import React from 'react';
import { MixerGroups } from './MixerPanel.jsx';

// 믹서 전용 팝업 창: 상단 메뉴 바(뱅크 전환·전체 정지·창 닫기) + 채널 스트립.
// 듀얼 모니터의 보조 화면에 띄워 두는 용도라 폭 자동맞춤(.mixer-window)이 항상 적용된다.
export default function MixerWindow({
  sfxBank, bankCounts, onSwitchBank, onPanicStop, onResetAll, onCloseWindow, total, ...groupProps
}) {
  return (
    <div className="mixer-window flex flex-col h-full bg-[#14171c] text-slate-200">
      <header className="shrink-0 flex items-center justify-between gap-3 px-4 py-2.5 bg-[#1e232a] border-b border-black/50">
        <div className="flex items-center gap-3 min-w-0">
          <h1 className="text-base font-extrabold text-slate-200 whitespace-nowrap">🎚️ 볼륨 믹서</h1>
          <span className="text-[10px] font-normal text-slate-400 bg-slate-400/10 px-2 py-0.5 rounded whitespace-nowrap">등록 {total}개</span>
        </div>
        <nav className="flex items-center gap-1.5 shrink-0" aria-label="믹서 메뉴">
          <span className="text-[11px] font-bold text-slate-500 mr-0.5">뱅크</span>
          {['A', 'B'].map(b => (
            <button
              key={b}
              onClick={() => onSwitchBank(b)}
              aria-pressed={sfxBank === b}
              className={`px-3 py-1.5 rounded-lg text-xs font-extrabold transition-all border-b-4 active:border-b-0 active:translate-y-0.5 ${sfxBank === b ? 'bg-emerald-500 border-emerald-700 text-white' : 'bg-slate-700 border-slate-900 text-slate-300 hover:bg-slate-600'}`}
            >
              {b} <span className="font-medium opacity-80">{bankCounts[b]}/15</span>
            </button>
          ))}
          <button
            onClick={onResetAll}
            className="ml-2 px-3 py-1.5 rounded-lg text-xs font-extrabold bg-slate-700 border-b-4 border-slate-900 text-slate-300 hover:bg-slate-600 active:border-b-0 active:translate-y-0.5 transition-all"
          >
            ↺ 볼륨 초기화
          </button>
          <button
            onClick={onPanicStop}
            className="px-3 py-1.5 rounded-lg text-xs font-extrabold bg-rose-900/60 border-b-4 border-rose-950 text-rose-200 hover:bg-rose-800 active:border-b-0 active:translate-y-0.5 transition-all"
          >
            ⏹ 전체 정지
          </button>
          <button
            onClick={onCloseWindow}
            className="px-3 py-1.5 rounded-lg text-xs font-extrabold bg-slate-700 border-b-4 border-slate-900 text-slate-300 hover:bg-slate-600 active:border-b-0 active:translate-y-0.5 transition-all"
          >
            ✖ 창 닫기
          </button>
        </nav>
      </header>

      <div className="flex-1 overflow-y-auto p-4">
        {total === 0 ? (
          <p className="text-sm text-slate-500 py-6 text-center">자판에 배치된 사운드가 없습니다. 키에 사운드를 배치하면 여기에 채널이 생깁니다.</p>
        ) : (
          <MixerGroups sfxBank={sfxBank} {...groupProps} />
        )}
      </div>
    </div>
  );
}
