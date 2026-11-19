import { useEffect, useMemo, useRef, useState } from 'react';
import { dbToGain } from '../constants.js';
import { api, STORAGE_MODE } from '../storage/api.js';
import ConfirmDialog from './ConfirmDialog.jsx';

const fmtDb = (v) => `${(v ?? 0) > 0 ? '+' : ''}${(v ?? 0).toFixed(1)}dB`;

// 사운드별 음량 조절: 측정 음량 표시 + 기준 음량 맞춤 토글 + 수동 미세 조정(dB)
function SoundVolumeRow({ sound, onRefresh, showToast }) {
  const [trim, setTrim] = useState(sound.trimDb ?? 0);
  useEffect(() => { setTrim(sound.trimDb ?? 0); }, [sound.trimDb]);

  const commitTrim = async (v) => {
    if (v === (sound.trimDb ?? 0)) return;
    try { await onRefresh('updateSound', sound.id, { trimDb: v }); }
    catch (e) { showToast(e.message, 'error'); setTrim(sound.trimDb ?? 0); }
  };
  const toggleNormalize = async (checked) => {
    try { await onRefresh('updateSound', sound.id, { normalize: checked }); }
    catch (e) { showToast(e.message, 'error'); }
  };

  return (
    <div className="bg-slate-800/60 rounded-lg px-2 py-1.5 flex flex-col gap-1">
      <div className="flex items-center gap-2 text-[11px]">
        {typeof sound.loudnessLufs === 'number'
          ? <span className="text-sky-300 font-semibold">🔊 {sound.loudnessLufs.toFixed(1)} LUFS{sound.loudnessMethod === 'momentary' ? ' (순간)' : sound.loudnessMethod === 'rms' ? ' (RMS 근사)' : ''}</span>
          : <span className="text-slate-500">🔇 음량 미분석</span>}
        <span className="text-slate-400">적용 보정 <b className="text-slate-200">{fmtDb(sound.gainDb)}</b></span>
        <label className="ml-auto inline-flex items-center gap-1 cursor-pointer text-slate-300">
          <input type="checkbox" checked={sound.normalize !== false} onChange={(e) => toggleNormalize(e.target.checked)} className="accent-emerald-500" />
          기준 음량 맞춤
        </label>
      </div>
      <div className="flex items-center gap-2 text-[11px] text-slate-400">
        <span className="whitespace-nowrap">미세 조정</span>
        <input
          type="range" min="-12" max="12" step="0.5" value={trim}
          onChange={(e) => setTrim(parseFloat(e.target.value))}
          onPointerUp={(e) => commitTrim(parseFloat(e.target.value))}
          onKeyUp={(e) => commitTrim(parseFloat(e.target.value))}
          onBlur={() => commitTrim(trim)}
          className="flex-grow accent-sky-500 h-1"
          aria-label={`${sound.name} 미세 조정 (dB)`}
        />
        <span className="w-12 text-right text-slate-200 font-semibold">{fmtDb(trim)}</span>
        <button onClick={() => { setTrim(0); commitTrim(0); }} className="px-1.5 py-0.5 rounded bg-slate-700 hover:bg-slate-600 text-slate-300">0으로</button>
      </div>
    </div>
  );
}

// 사운드별 재생 구간·페이드: 파일 자체를 편집하지 않고 시작/종료 지점과 페이드 인/아웃(초)만 지정
function SoundPlayRow({ sound, onRefresh, showToast }) {
  const dur = typeof sound.durationSec === 'number' ? sound.durationSec : null;
  const [start, setStart] = useState(String(sound.startSec ?? 0));
  const [end, setEnd] = useState(sound.endSec == null ? '' : String(sound.endSec));
  const [fin, setFin] = useState(String(sound.fadeInSec ?? 0));
  const [fout, setFout] = useState(String(sound.fadeOutSec ?? 0));
  useEffect(() => { setStart(String(sound.startSec ?? 0)); }, [sound.startSec]);
  useEffect(() => { setEnd(sound.endSec == null ? '' : String(sound.endSec)); }, [sound.endSec]);
  useEffect(() => { setFin(String(sound.fadeInSec ?? 0)); }, [sound.fadeInSec]);
  useEffect(() => { setFout(String(sound.fadeOutSec ?? 0)); }, [sound.fadeOutSec]);

  const commit = async () => {
    const s = Math.max(0, parseFloat(start) || 0);
    const e = end.trim() === '' ? null : Math.max(0, parseFloat(end) || 0);
    const fi = Math.min(30, Math.max(0, parseFloat(fin) || 0));
    const fo = Math.min(30, Math.max(0, parseFloat(fout) || 0));
    if (e !== null && e <= s) {
      showToast('종료 지점은 시작 지점보다 뒤여야 합니다', 'error');
      setEnd(sound.endSec == null ? '' : String(sound.endSec));
      return;
    }
    const patch = {};
    if (s !== (sound.startSec ?? 0)) patch.startSec = s;
    if (e !== (sound.endSec ?? null)) patch.endSec = e;
    if (fi !== (sound.fadeInSec ?? 0)) patch.fadeInSec = fi;
    if (fo !== (sound.fadeOutSec ?? 0)) patch.fadeOutSec = fo;
    if (!Object.keys(patch).length) return;
    try { await onRefresh('updateSound', sound.id, patch); }
    catch (err) { showToast(err.message, 'error'); }
  };

  const inputCls = 'w-14 bg-slate-900 border border-slate-600 rounded px-1 py-0.5 text-slate-100 text-center';
  const enterBlur = (e) => { if (e.key === 'Enter') e.target.blur(); };
  return (
    <div className="bg-slate-800/60 rounded-lg px-2 py-1.5 flex flex-wrap items-center gap-x-3 gap-y-1 text-[11px] text-slate-400">
      <span className="whitespace-nowrap">⏱ 구간·페이드{dur ? ` (길이 ${dur.toFixed(1)}초)` : ''}</span>
      <label className="inline-flex items-center gap-1">시작 <input type="number" min="0" step="0.1" value={start} onChange={(e) => setStart(e.target.value)} onBlur={commit} onKeyDown={enterBlur} className={inputCls} aria-label={`${sound.name} 시작 지점(초)`} />초</label>
      <label className="inline-flex items-center gap-1">종료 <input type="number" min="0" step="0.1" value={end} placeholder="끝까지" onChange={(e) => setEnd(e.target.value)} onBlur={commit} onKeyDown={enterBlur} className={inputCls} aria-label={`${sound.name} 종료 지점(초)`} />초</label>
      <label className="inline-flex items-center gap-1">페이드인 <input type="number" min="0" max="30" step="0.1" value={fin} onChange={(e) => setFin(e.target.value)} onBlur={commit} onKeyDown={enterBlur} className={inputCls} aria-label={`${sound.name} 페이드인(초)`} />초</label>
      <label className="inline-flex items-center gap-1">페이드아웃 <input type="number" min="0" max="30" step="0.1" value={fout} onChange={(e) => setFout(e.target.value)} onBlur={commit} onKeyDown={enterBlur} className={inputCls} aria-label={`${sound.name} 페이드아웃(초)`} />초</label>
    </div>
  );
}

// 라이브러리(폴더별 사운드 보관함) — 서버 폴더가 곧 카테고리다.
// 미리듣기는 자판 재생과 같은 보정 게인을 적용한 WebAudio 재생, 실제 연주용 배치는 자판 탭에서 한다.
export default function LibraryPanel({
  categories, sounds, mappings, onRefresh, showToast,
  onAssignToKey, onUnassignSound, readOnly = false,
}) {
  const [activeCat, setActiveCat] = useState('all');
  const [query, setQuery] = useState('');
  const [newCatName, setNewCatName] = useState('');
  const [uploadType, setUploadType] = useState('sfx');
  const [uploadCatId, setUploadCatId] = useState('');
  const [playingId, setPlayingId] = useState(null);
  // 사운드별 세부 설정 접기/펼치기 (기본은 접힘, 여러 개를 동시에 펼칠 수 있다)
  const [expandedIds, setExpandedIds] = useState(() => new Set());
  const toggleExpanded = (id) => setExpandedIds(prev => {
    const next = new Set(prev);
    if (next.has(id)) next.delete(id); else next.add(id);
    return next;
  });
  const [analyzing, setAnalyzing] = useState(false);
  const [pendingDeleteSound, setPendingDeleteSound] = useState(null);
  const [pendingDeleteCategory, setPendingDeleteCategory] = useState(null);
  const ctxRef = useRef(null);
  const previewSrcRef = useRef(null);
  const bufferCacheRef = useRef(new Map());
  const fileRef = useRef(null);

  // 브라우저 저장 모드에서만: 이 브라우저가 쓰는 저장공간을 표시한다
  const [storageUsage, setStorageUsage] = useState(null);
  useEffect(() => {
    if (STORAGE_MODE !== 'local' || !navigator.storage?.estimate) return undefined;
    let alive = true;
    navigator.storage.estimate()
      .then(est => { if (alive && typeof est.usage === 'number') setStorageUsage(est.usage); })
      .catch(() => {});
    return () => { alive = false; };
  }, [sounds.length]);

  const assignedBy = useMemo(() => {
    const map = {};
    mappings.forEach(m => { if (m.soundId) map[m.soundId] = m; });
    return map;
  }, [mappings]);

  const visible = sounds.filter(s =>
    (activeCat === 'all' || s.categoryId === activeCat) &&
    (!query || s.name.toLowerCase().includes(query.toLowerCase()))
  );

  const stopPreview = () => {
    if (previewSrcRef.current) {
      previewSrcRef.current.onended = null;
      try { previewSrcRef.current.stop(); } catch { /* 이미 정지 */ }
      previewSrcRef.current = null;
    }
    setPlayingId(null);
  };
  // 화면을 떠나면 미리듣기를 정지하고 전용 AudioContext도 닫는다 — 왕복할 때마다
  // 컨텍스트가 쌓이면 브라우저의 동시 AudioContext 상한에 걸릴 수 있다.
  useEffect(() => () => {
    stopPreview();
    if (ctxRef.current) { ctxRef.current.close().catch(() => {}); ctxRef.current = null; }
  }, []);
  // 미리듣기도 자판과 동일하게 사운드 보정 게인(gainDb)을 적용해 재생한다 (HTMLAudio는 1.0 초과 증폭 불가라 WebAudio 사용)
  const togglePreview = async (sound) => {
    if (playingId === sound.id) { stopPreview(); return; }
    stopPreview();
    try {
      if (!ctxRef.current) ctxRef.current = new (window.AudioContext || window.webkitAudioContext)();
      const ctx = ctxRef.current;
      if (ctx.state === 'suspended') await ctx.resume();
      let buf = bufferCacheRef.current.get(sound.id);
      if (!buf) {
        // 저장 모드 공통 경로로 원본을 가져온다. 로컬 모드는 sound.url이 비어 있어
        // 직접 fetch하면 페이지 HTML을 받아 디코딩이 실패한다 (Pages 미리듣기 버그).
        const blob = await api.fetchSoundBlob(sound.id);
        if (!blob) throw new Error('load failed');
        buf = await ctx.decodeAudioData(await blob.arrayBuffer());
        bufferCacheRef.current.set(sound.id, buf);
      }
      const src = ctx.createBufferSource();
      src.buffer = buf;
      const g = ctx.createGain();
      g.gain.value = dbToGain(sound.gainDb);
      src.connect(g);
      g.connect(ctx.destination);
      src.onended = () => { if (previewSrcRef.current === src) { previewSrcRef.current = null; setPlayingId(null); } };
      previewSrcRef.current = src;
      setPlayingId(sound.id);
      src.start(0);
    } catch { showToast('미리듣기 재생에 실패했습니다', 'error'); }
  };

  const handleAnalyzeAll = async () => {
    setAnalyzing(true);
    try {
      const r = await onRefresh('analyzeAll');
      showToast(`전체 ${r.analyzed}개 사운드 음량을 분석해 -16 LUFS 기준으로 보정했습니다`, 'success');
    } catch (e) { showToast(e.message, 'error'); }
    finally { setAnalyzing(false); }
  };

  const handleCreateCategory = async () => {
    const name = newCatName.trim();
    if (!name) return;
    try {
      await onRefresh('createCategory', name);
      setNewCatName('');
      showToast(`폴더 「${name}」를 만들었습니다`, 'success');
    } catch (e) { showToast(e.message, 'error'); }
  };

  const handleRenameCategory = async (cat) => {
    const name = window.prompt('폴더 이름 변경', cat.name);
    if (!name || name.trim() === cat.name) return;
    try { await onRefresh('renameCategory', cat.id, name.trim()); showToast('폴더 이름을 바꿨습니다', 'success'); }
    catch (e) { showToast(e.message, 'error'); }
  };

  const handleDeleteCategory = (cat) => {
    const count = sounds.filter(s => s.categoryId === cat.id).length;
    setPendingDeleteCategory({ cat, count });
  };

  const confirmDeleteCategory = async () => {
    const { cat } = pendingDeleteCategory || {};
    setPendingDeleteCategory(null);
    if (!cat) return;
    try {
      await onRefresh('deleteCategory', cat.id);
      if (activeCat === cat.id) setActiveCat('all');
      showToast('폴더를 삭제했습니다', 'success');
    } catch (e) { showToast(e.message, 'error'); }
  };

  const handleUpload = async (e) => {
    const files = Array.from(e.target.files || []);
    e.target.value = null;
    if (!files.length) return;
    let ok = 0;
    for (const file of files) {
      try {
        await onRefresh('uploadSound', {
          file,
          categoryId: uploadCatId || (activeCat !== 'all' ? activeCat : undefined),
          categoryName: uploadCatId || activeCat !== 'all' ? undefined : (uploadType === 'bgm' ? '배경음악' : '효과음'),
          type: uploadType,
        });
        ok++;
      } catch (err) { showToast(`「${file.name}」 업로드 실패: ${err.message}`, 'error'); }
    }
    if (ok) showToast(`${ok}개 사운드를 ${STORAGE_MODE === 'local' ? '브라우저에' : '서버에'} 저장했습니다`, 'success');
  };

  const handleRenameSound = async (sound) => {
    const name = window.prompt('사운드 이름 변경', sound.name);
    if (!name || name.trim() === sound.name) return;
    try { await onRefresh('updateSound', sound.id, { name: name.trim() }); }
    catch (e) { showToast(e.message, 'error'); }
  };

  const handleDeleteSound = (sound) => setPendingDeleteSound(sound);

  const confirmDeleteSound = async () => {
    const sound = pendingDeleteSound;
    setPendingDeleteSound(null);
    if (!sound) return;
    try {
      stopPreview();
      onUnassignSound?.(sound.id);
      await onRefresh('deleteSound', sound.id);
      showToast('사운드를 삭제했습니다', 'success');
    } catch (e) { showToast(e.message, 'error'); }
  };

  const handleDownload = async (sound) => {
    try {
      const blob = await onRefresh('fetchSoundBlob', sound.id);
      const ext = blob.type.includes('wav') ? '.wav' : blob.type.includes('ogg') ? '.ogg' : '.mp3';
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = sound.fileName || `${sound.name}${ext}`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      setTimeout(() => URL.revokeObjectURL(url), 5000);
    } catch (e) { showToast(e.message, 'error'); }
  };

  const fmtSize = (b) => b > 1048576 ? `${(b / 1048576).toFixed(1)}MB` : `${Math.max(1, Math.round(b / 1024))}KB`;

  return (
    <div className="w-full max-w-6xl mx-auto flex flex-col gap-4">
      {readOnly && (
        <div className="rounded-xl border border-rose-500/40 bg-rose-900/30 px-4 py-3 text-sm text-rose-100">
          🎭 공연 모드에서는 라이브러리를 수정할 수 없습니다. 수정하려면 상단에서 설정 모드로 전환하세요.
        </div>
      )}
      <div className="flex flex-wrap items-center gap-2 bg-[#2a303c] border border-slate-600/30 rounded-xl p-3">
        <input
          value={query} onChange={(e) => setQuery(e.target.value)} placeholder="🔍 사운드 검색"
          className="bg-slate-800 text-sm px-3 py-2 rounded-lg border border-slate-600 focus:outline-none focus:border-emerald-400 w-44"
        />
        <fieldset disabled={readOnly} className="flex flex-wrap items-center gap-2 border-0 p-0 m-0 min-w-0">
        <select value={uploadType} onChange={(e) => setUploadType(e.target.value)} className="bg-slate-800 text-sm px-2 py-2 rounded-lg border border-slate-600" aria-label="업로드 종류">
          <option value="sfx">효과음</option>
          <option value="bgm">배경음악</option>
        </select>
        <select value={uploadCatId} onChange={(e) => setUploadCatId(e.target.value)} className="bg-slate-800 text-sm px-2 py-2 rounded-lg border border-slate-600" aria-label="업로드 폴더">
          <option value="">(현재 폴더/종류 기본값)</option>
          {categories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
        </select>
        <button onClick={() => fileRef.current?.click()} className="px-4 py-2 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-sm font-bold">
          ⬆️ {STORAGE_MODE === 'local' ? '브라우저에 업로드' : '서버에 업로드'}
        </button>
        <input ref={fileRef} type="file" accept="audio/*" multiple className="hidden" onChange={handleUpload} />
        <button onClick={handleAnalyzeAll} disabled={analyzing} className="px-4 py-2 rounded-lg bg-sky-700 hover:bg-sky-600 disabled:opacity-50 text-white text-sm font-bold">
          {analyzing ? '🎚️ 분석 중…' : '🎚️ 전체 음량 균일화'}
        </button>
        </fieldset>
        <span className="text-xs text-slate-400 ml-auto">총 {sounds.length}개 · {STORAGE_MODE === 'local' ? '브라우저 저장 (이 브라우저에만 유지)' : '서버 저장 (브라우저를 바꿔도 유지)'}{STORAGE_MODE === 'local' && storageUsage != null ? ` · 사용 중 약 ${Math.max(1, Math.round(storageUsage / 1048576))}MB` : ''}</span>
      </div>

      <div className="flex flex-wrap gap-2 items-center">
        <button onClick={() => setActiveCat('all')} className={`px-3 py-1.5 rounded-full text-sm font-bold ${activeCat === 'all' ? 'bg-emerald-500 text-white' : 'bg-slate-700 text-slate-300'}`}>
          📁 전체 ({sounds.length})
        </button>
        {categories.map(cat => (
          <span key={cat.id} className={`inline-flex items-center gap-1 px-3 py-1.5 rounded-full text-sm font-bold ${activeCat === cat.id ? 'bg-emerald-500 text-white' : 'bg-slate-700 text-slate-300'}`}>
            <button onClick={() => setActiveCat(cat.id)}>📁 {cat.name} ({sounds.filter(s => s.categoryId === cat.id).length})</button>
            <button onClick={() => handleRenameCategory(cat)} disabled={readOnly} title="이름 변경" className="opacity-70 hover:opacity-100 disabled:opacity-30 disabled:cursor-not-allowed">✏️</button>
            <button onClick={() => handleDeleteCategory(cat)} disabled={readOnly} title="폴더 삭제 (사운드는 미분류로 이동)" className="opacity-70 hover:opacity-100 disabled:opacity-30 disabled:cursor-not-allowed">🗑️</button>
          </span>
        ))}
        <span className="inline-flex gap-1 ml-2">
          <input value={newCatName} onChange={(e) => setNewCatName(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && handleCreateCategory()} disabled={readOnly} placeholder="새 폴더 이름 (예: 효과음)" className="bg-slate-800 text-sm px-3 py-1.5 rounded-full border border-slate-600 focus:outline-none focus:border-emerald-400 w-44 disabled:opacity-50" />
          <button onClick={handleCreateCategory} disabled={readOnly} className="px-3 py-1.5 rounded-full bg-blue-600 hover:bg-blue-500 text-white text-sm font-bold disabled:opacity-50 disabled:cursor-not-allowed">+ 폴더</button>
        </span>
      </div>

      {visible.length === 0 && (
        <div className="text-center text-slate-400 py-14 bg-[#2a303c] rounded-xl border border-dashed border-slate-600">
          이 폴더에는 아직 사운드가 없습니다. 위에서 업로드해 보세요.
        </div>
      )}

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 items-start">
        {visible.map(sound => {
          const assigned = assignedBy[sound.id];
          const compatibleKeys = mappings.filter(m => m.type === sound.type);
          const expanded = expandedIds.has(sound.id);
          // 기본값에서 바꾼 세부 설정이 있으면 접힌 카드에도 표시한다
          const detailParts = [];
          if ((sound.startSec || 0) > 0 || sound.endSec != null) detailParts.push('구간');
          if ((sound.fadeInSec || 0) > 0 || (sound.fadeOutSec || 0) > 0) detailParts.push('페이드');
          if ((sound.trimDb || 0) !== 0) detailParts.push(`미세 조정 ${fmtDb(sound.trimDb)}`);
          return (
            <div key={sound.id} className="bg-[#2a303c] border border-slate-600/30 rounded-xl p-3 flex flex-col gap-2">
              <div className="flex items-start gap-2">
                <button onClick={() => togglePreview(sound)} className={`flex-shrink-0 w-10 h-10 rounded-lg font-bold ${playingId === sound.id ? 'bg-rose-600' : 'bg-emerald-600 hover:bg-emerald-500'} text-white`} aria-label={`${sound.name} 미리듣기`}>
                  {playingId === sound.id ? '⏹' : '▶'}
                </button>
                <div className="min-w-0 flex-grow">
                  <div className="font-bold text-sm truncate" title={sound.name}>{sound.name}</div>
                  <div className="text-[11px] text-slate-400">
                    {categories.find(c => c.id === sound.categoryId)?.name || '미분류'} · {sound.type === 'bgm' ? '배경음악' : '효과음'} · {fmtSize(sound.size)}
                    {sound.isExample && <span className="ml-1 text-amber-300">· 예시</span>}
                  </div>
                </div>
              </div>
              {assigned
                ? <div className="text-[11px] text-emerald-300 bg-emerald-400/10 rounded px-2 py-1">⌨️ 자판 <b>{assigned.keyLabel}</b> 키에 배치됨</div>
                : <div className="text-[11px] text-slate-500">자판에 배치되지 않음</div>}
              <div className="flex items-center gap-2 text-[11px]">
                {typeof sound.loudnessLufs === 'number'
                  ? <span className="text-sky-300 font-semibold whitespace-nowrap">🔊 {sound.loudnessLufs.toFixed(1)} LUFS · 보정 {fmtDb(sound.gainDb)}</span>
                  : <span className="text-slate-500 whitespace-nowrap">🔇 음량 미분석</span>}
                {detailParts.length > 0 && (
                  <span className="text-amber-300 bg-amber-400/10 rounded px-1.5 py-0.5 whitespace-nowrap" title="기본값에서 바꾼 세부 설정이 있습니다">⚙️ {detailParts.join(' · ')}</span>
                )}
                <button
                  onClick={() => toggleExpanded(sound.id)}
                  aria-expanded={expanded}
                  className="ml-auto text-[11px] font-bold px-2 py-1 rounded bg-slate-700 hover:bg-slate-600 text-slate-200 whitespace-nowrap"
                >
                  {expanded ? '접기 ▴' : '⚙️ 세부 설정 ▾'}
                </button>
              </div>
              {expanded && (
                <fieldset disabled={readOnly} className="flex flex-col gap-2 border-0 p-0 m-0 min-w-0">
              <SoundVolumeRow sound={sound} onRefresh={onRefresh} showToast={showToast} />
              <SoundPlayRow sound={sound} onRefresh={onRefresh} showToast={showToast} />
              <div className="flex flex-wrap gap-1.5 mt-auto">
                <select
                  defaultValue="" aria-label={`${sound.name} 자판 배치`}
                  onChange={(e) => { if (e.target.value) { onAssignToKey(sound, e.target.value); e.target.value = ''; } }}
                  className="bg-slate-800 text-xs px-2 py-1.5 rounded border border-slate-600 flex-grow"
                >
                  <option value="">⌨️ 자판에 배치…</option>
                  {compatibleKeys.map(m => <option key={m.code} value={m.code}>{m.keyLabel} — {m.soundId ? `${m.soundLabel} (교체)` : '비어있음'}</option>)}
                </select>
                <select
                  value={sound.categoryId} aria-label={`${sound.name} 폴더 이동`}
                  onChange={(e) => onRefresh('updateSound', sound.id, { categoryId: e.target.value }).catch(err => showToast(err.message, 'error'))}
                  className="bg-slate-800 text-xs px-2 py-1.5 rounded border border-slate-600"
                >
                  {categories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                </select>
                <button onClick={() => handleRenameSound(sound)} className="text-xs px-2 py-1.5 rounded bg-slate-700 hover:bg-slate-600">이름</button>
                <button onClick={() => handleDownload(sound)} title="다운로드" className="text-xs px-2 py-1.5 rounded bg-slate-700 hover:bg-slate-600">⬇️</button>
                <button onClick={() => handleDeleteSound(sound)} className="text-xs px-2 py-1.5 rounded bg-rose-900/60 hover:bg-rose-700 text-rose-200">삭제</button>
              </div>
                </fieldset>
              )}
            </div>
          );
        })}
      </div>
      <ConfirmDialog
        open={Boolean(pendingDeleteSound)}
        title="사운드 삭제"
        message={pendingDeleteSound ? `사운드 「${pendingDeleteSound.name}」를 ${STORAGE_MODE === 'local' ? '브라우저에서' : '서버에서'} 완전히 삭제할까요? 자판에 배치돼 있으면 배치도 해제됩니다.` : ''}
        confirmLabel="삭제"
        danger
        onConfirm={confirmDeleteSound}
        onCancel={() => setPendingDeleteSound(null)}
      />
      <ConfirmDialog
        open={Boolean(pendingDeleteCategory)}
        title="폴더 삭제"
        message={pendingDeleteCategory ? `폴더 「${pendingDeleteCategory.cat.name}」를 삭제할까요?${pendingDeleteCategory.count ? ` 안의 사운드 ${pendingDeleteCategory.count}개는 '미분류' 폴더로 이동합니다.` : ''}` : ''}
        confirmLabel="삭제"
        danger
        onConfirm={confirmDeleteCategory}
        onCancel={() => setPendingDeleteCategory(null)}
      />
    </div>
  );
}
