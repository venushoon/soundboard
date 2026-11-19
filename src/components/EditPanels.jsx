export function ExportImportBar({ onExport, onExportSettingsOnly, onImportSelected, importInputRef }) {
  return (
    <div className="w-full max-w-5xl bg-slate-800/40 border border-slate-600/40 rounded-lg p-4 mb-4 flex flex-wrap items-center justify-end gap-3">
      <div className="flex gap-2 flex-shrink-0">
        <button
          onClick={onExport}
          className="text-xs font-medium px-3 py-2 rounded bg-slate-700 hover:bg-slate-600 text-slate-200 transition-colors flex items-center gap-1.5"
        >
          ⬇️ 전체 내보내기
        </button>
        {onExportSettingsOnly && (
          <button
            onClick={onExportSettingsOnly}
            title="음원 파일 없이 배치·볼륨·큐만 가볍게 저장합니다. 가져올 때 라이브러리에서 이름이 같은 음원을 찾아 연결합니다."
            className="text-xs font-medium px-3 py-2 rounded bg-slate-700 hover:bg-slate-600 text-slate-200 transition-colors flex items-center gap-1.5"
          >
            ⬇️ 설정만
          </button>
        )}
        <label className="text-xs font-medium px-3 py-2 rounded bg-blue-600 hover:bg-blue-500 text-white transition-colors flex items-center gap-1.5 cursor-pointer">
          ⬆️ 가져오기
          <input ref={importInputRef} type="file" accept="application/json" className="hidden" onChange={onImportSelected} />
        </label>
      </div>
    </div>
  );
}

