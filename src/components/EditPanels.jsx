export function ExportImportBar({ onExport, onImportSelected, importInputRef }) {
  return (
    <div className="w-full max-w-5xl bg-slate-800/40 border border-slate-600/40 rounded-lg p-4 mb-4 flex flex-wrap items-center justify-between gap-3">
      <div className="text-xs text-slate-400">
        <strong className="text-white">💾 설정 백업/공유:</strong> 지금 등록된 자판·볼륨·큐 목록을 파일로 저장하거나, 다른 컴퓨터에서 저장한 파일을 불러옵니다.
      </div>
      <div className="flex gap-2 flex-shrink-0">
        <button
          onClick={onExport}
          className="text-xs font-medium px-3 py-2 rounded bg-slate-700 hover:bg-slate-600 text-slate-200 transition-colors flex items-center gap-1.5"
        >
          ⬇️ 내보내기
        </button>
        <label className="text-xs font-medium px-3 py-2 rounded bg-blue-600 hover:bg-blue-500 text-white transition-colors flex items-center gap-1.5 cursor-pointer">
          ⬆️ 가져오기
          <input ref={importInputRef} type="file" accept="application/json" className="hidden" onChange={onImportSelected} />
        </label>
      </div>
    </div>
  );
}

export function EditGuideBar() {
  return (
    <div className="w-full max-w-5xl bg-blue-900/20 border border-blue-500/30 rounded-lg p-3 mb-4 text-blue-200 shadow-inner animate-fade-in flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
      <h3 className="font-bold text-blue-400 flex items-center gap-1.5 text-sm whitespace-nowrap">
        <span className="text-base">💡</span> 설정 가이드
      </h3>
      <div className="flex flex-wrap items-center gap-x-5 gap-y-1 text-[10px] sm:text-xs opacity-90">
        <span className="flex items-center gap-1"><strong className="text-white">📁 파일:</strong> 내 컴퓨터 음원 (새로고침에도 저장됨)</span>
        <span className="flex items-center gap-1"><strong className="text-white">🔗 내보내기:</strong> 100M 이상 용량일 경우 내보내기 불가</span>
        <span className="flex items-center gap-1"><strong className="text-white">🔊 Vol:</strong> 자판별 개별 볼륨 세밀 조절</span>
      </div>
    </div>
  );
}