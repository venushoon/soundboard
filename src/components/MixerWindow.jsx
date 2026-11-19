import React, { useRef } from 'react';
import { MixerGroups, OutputDeviceSelect } from './MixerPanel.jsx';

// 믹서 전용 팝업 창: 상단 메뉴 바(뱅크 전환·전체 정지·창 닫기) + 채널 스트립.
// 듀얼 모니터의 보조 화면에 띄워 두는 용도라 폭 자동맞춤(.mixer-window)이 항상 적용된다.
export default function MixerWindow({
  sfxBank, bankCounts, onSwitchBank, onPanicStop, onResetAll, onToggleFit, isFitted, isDucking, onToggleDuck, outputDeviceId, onOutputDeviceChange, onCloseWindow, total, ...groupProps
}) {
  // OS 제목줄 더블클릭은 웹앱이 받을 수 없어서, 앱 상단 바 더블클릭으로 대신한다.
  // 네이티브 dblclick 이벤트는 팝업(포털) 환경에서 전달이 안 되는 경우가 있어,
  // 일반 클릭(버튼 동작으로 전달이 확인된 경로)의 간격을 재서 더블클릭을 판정한다.
  // 버튼 같은 조작 요소를 클릭한 경우는 제외한다.
  const lastHeaderClickRef = useRef(0);
  const handleHeaderClick = (e) => {
    if (e.target.closest('button, a, input, select, textarea, [role="button"]')) return;
    const now = Date.now();
    if (now - lastHeaderClickRef.current <= 400) {
      lastHeaderClickRef.current = 0;
      onToggleFit?.();
    } else {
      lastHeaderClickRef.current = now;
    }
  };
  return (
    <div className="mixer-window flex flex-col h-full bg-[#14171c] text-slate-200">
      <header
        onClick={handleHeaderClick}
        className="shrink-0 flex items-center justify-between gap-3 px-4 py-2.5 bg-[#1e232a] border-b border-black/50"
      >
        <div className="flex items-center gap-3 min-w-0 cursor-pointer" title="이 바를 더블클릭하면 화면에 맞추거나 원래 크기로 되돌립니다">
          <h1 className="text-base font-extrabold text-slate-200 whitespace-nowrap">🎚️ 볼륨 믹서</h1>
          <span className="text-[10px] font-normal text-slate-400 bg-slate-400/10 px-2 py-0.5 rounded whitespace-nowrap">등록 {total}개</span>
          <span className="text-[10px] text-slate-500 whitespace-nowrap hidden xl:inline">상단 바 더블클릭 = 화면맞춤</span>
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
            onClick={onToggleDuck}
            aria-pressed={!!isDucking}
            title="멘트 중 BGM 줄이기 (단축키 `) — 켜면 BGM이 약 25%로 부드럽게 내려갑니다"
            className={`px-3 py-1.5 rounded-lg text-xs font-extrabold border-b-4 active:border-b-0 active:translate-y-0.5 transition-all ${isDucking ? 'bg-amber-500 border-amber-700 text-white' : 'bg-slate-700 border-slate-900 text-slate-300 hover:bg-slate-600'}`}
          >
            🎙️ 멘트 중
          </button>
          <OutputDeviceSelect value={outputDeviceId} onChange={onOutputDeviceChange} />
          <button
            onClick={onToggleFit}
            aria-pressed={!!isFitted}
            title="이 창이 있는 모니터 화면에 꽉 차게 맞추거나 원래 크기로 되돌립니다 (상단 바를 더블클릭해도 됩니다)"
            className="px-3 py-1.5 rounded-lg text-xs font-extrabold bg-slate-700 border-b-4 border-slate-900 text-slate-300 hover:bg-slate-600 active:border-b-0 active:translate-y-0.5 transition-all"
          >
            {isFitted ? '⛶ 원래 크기로' : '⛶ 화면에 맞추기'}
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
