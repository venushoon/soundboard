import { useEffect, useRef, useState } from 'react';
import { formatTime } from '../constants.js';

const SFX_CODES = [
  'KeyQ', 'KeyW', 'KeyE', 'KeyR',
  'KeyA', 'KeyS', 'KeyD', 'KeyF',
  'KeyZ', 'KeyX', 'KeyC', 'KeyV',
];

function CueSeekBar({ elapsed, duration, onSeek }) {
  const [dragValue, setDragValue] = useState(null);
  const safeDuration = duration > 0 ? duration : 0.01;
  const displayValue = Math.min(dragValue ?? elapsed, safeDuration);
  const pct = safeDuration > 0 ? (displayValue / safeDuration) * 100 : 0;

  const commitSeek = (e) => {
    const value = parseFloat(e.target.value);
    onSeek(value);
    setDragValue(null);
  };

  return (
    <div className="w-full">
      <input
        type="range"
        min="0"
        max={safeDuration}
        step="0.01"
        value={displayValue}
        onChange={(e) => setDragValue(parseFloat(e.target.value))}
        onMouseUp={commitSeek}
        onTouchEnd={commitSeek}
        onKeyUp={commitSeek}
        aria-label="재생 위치 조절"
        style={{
          background: `linear-gradient(to right, #10b981 0%, #10b981 ${pct}%, #334155 ${pct}%, #334155 100%)`,
        }}
        className="w-full h-2 rounded-lg appearance-none cursor-pointer accent-emerald-400"
      />
    </div>
  );
}

export default function CuePlayerWindow({
  mappings,
  getSound,
  bgmUIStates,
  sfxPlayingCodes,
  getPlaybackInfo,
  handleBGMPlayback,
  fadeOutBGM,
  stopBGM,
  seekBGM,
  handleSoundAction,
  handleSettingChange,
  onUploadLocalCueFiles,
  sfxVolume,
  setSfxVolume,
  handlePanicStop,
  cueList,
  cueIndex,
  nextPlayableIndex,
  nextCueItem,
  cueAddSelection,
  setCueAddSelection,
  triggerNextCue,
  playCueAtIndex,
  selectNextCue,
  stepNextCue,
  resetCue,
  addCue,
  addDivider,
  updateCueItem,
  removeCue,
  moveCue,
  clearCueList,
  onCloseWindow,
}) {
  const [memoInput, setMemoInput] = useState('');
  const [dividerInput, setDividerInput] = useState('');
  const [localAudioType, setLocalAudioType] = useState('bgm');
  const [isDraggingFiles, setIsDraggingFiles] = useState(false);
  const [showSfxDeck, setShowSfxDeck] = useState(true);
  const [clockText, setClockText] = useState(() => new Date().toLocaleTimeString('ko-KR', { hour12: false }));

  const localFileInputRef = useRef(null);

  useEffect(() => {
    const id = setInterval(() => {
      setClockText(new Date().toLocaleTimeString('ko-KR', { hour12: false }));
    }, 1000);
    return () => clearInterval(id);
  }, []);

  const activeBgmEntries = Object.entries(bgmUIStates);
  const activeSfxList = Array.from(sfxPlayingCodes).map(code => getSound(code)).filter(Boolean);

  const lastPlayedItem = cueIndex >= 0 && cueList[cueIndex]?.type !== 'divider' ? cueList[cueIndex] : null;
  const lastPlayedSound = lastPlayedItem ? getSound(lastPlayedItem.code) : null;
  const nextSound = nextCueItem ? getSound(nextCueItem.code) : null;

  // 실제 사운드 큐만 번호 매기기용 맵 (구분선 제외 순번 표시)
  let soundOrderCounter = 0;
  const soundOrderMap = {};
  cueList.forEach((item, idx) => {
    if (item.type !== 'divider') {
      soundOrderCounter += 1;
      soundOrderMap[idx] = soundOrderCounter;
    }
  });
  const totalSoundCues = soundOrderCounter;
  const nextSoundOrder = nextPlayableIndex >= 0 ? soundOrderMap[nextPlayableIndex] : null;

  const handleAddSoundCue = (e) => {
    e.preventDefault();
    if (!cueAddSelection) return;
    addCue(cueAddSelection, memoInput.trim());
    setMemoInput('');
  };

  const handleLocalFileChange = async (e) => {
    const files = Array.from(e.target.files || []);
    if (files.length === 0) return;
    await onUploadLocalCueFiles?.(files, {
      audioType: localAudioType,
      memo: memoInput.trim(),
    });
    setMemoInput('');
    e.target.value = null;
  };

  const handleDragOver = (e) => {
    e.preventDefault();
    if (e.dataTransfer?.types?.includes('Files')) {
      setIsDraggingFiles(true);
    }
  };

  const handleDragLeave = (e) => {
    if (e.currentTarget.contains(e.relatedTarget)) return;
    setIsDraggingFiles(false);
  };

  const handleDrop = async (e) => {
    e.preventDefault();
    setIsDraggingFiles(false);
    const files = Array.from(e.dataTransfer?.files || []).filter(
      f => f.type.startsWith('audio/') || /\.(mp3|wav|m4a|ogg|aac|flac|webm)$/i.test(f.name)
    );
    if (files.length === 0) return;
    await onUploadLocalCueFiles?.(files, {
      audioType: localAudioType,
      memo: memoInput.trim(),
    });
    setMemoInput('');
  };

  const handleAddDividerRow = () => {
    addDivider(dividerInput.trim() || '식순 구분');
    setDividerInput('');
  };

  return (
    <div
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
      className="relative h-screen w-screen flex flex-col bg-[#14171c] text-slate-100 font-sans overflow-hidden select-none"
    >
      {/* 파일 드래그 앤 드롭 오버레이 */}
      {isDraggingFiles && (
        <div className="absolute inset-0 z-50 bg-purple-950/85 backdrop-blur-sm border-4 border-dashed border-purple-400 m-3 rounded-2xl flex flex-col items-center justify-center pointer-events-none">
          <span className="text-4xl mb-2">📁</span>
          <p className="text-lg font-extrabold text-white">오디오 파일을 여기에 놓아 큐 시퀀스에 추가</p>
          <p className="text-xs text-purple-200 mt-1">여러 개의 음원 파일을 한 번에 드래그 앤 드롭할 수 있습니다</p>
        </div>
      )}

      {/* 상단 타이틀 & 마스터 헤더 */}
      <header className="flex-shrink-0 px-4 py-2.5 bg-[#0f1216] border-b border-slate-800 flex items-center justify-between gap-2">
        <div className="flex items-center gap-2.5">
          <span className="text-lg">🎬</span>
          <div>
            <h1 className="text-sm font-extrabold tracking-tight text-white flex items-center gap-2">
              큐플레이어
              <span className="text-[10px] font-mono font-semibold px-1.5 py-0.5 rounded bg-purple-500/20 text-purple-300 border border-purple-500/30">
                STANDALONE
              </span>
            </h1>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <div
            className="px-2.5 py-1 rounded bg-slate-900 border border-slate-800 text-xs font-mono text-emerald-400 tracking-wider"
            title="현재 시각"
          >
            🕒 {clockText}
          </div>
          <button
            onClick={handlePanicStop}
            className="px-3 py-1.5 rounded-lg bg-rose-600 hover:bg-rose-500 active:translate-y-0.5 text-white font-bold text-xs transition-all flex items-center gap-1 shadow-sm"
            title="재생 중인 모든 BGM과 효과음을 즉시 정지합니다 (Esc)"
          >
            🛑 전체 정지 <span className="text-[10px] opacity-80 font-mono">[Esc]</span>
          </button>
          {onCloseWindow && (
            <button
              onClick={onCloseWindow}
              className="px-2.5 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-medium transition-colors"
              title="큐플레이어 창 닫기"
            >
              ✕ 닫기
            </button>
          )}
        </div>
      </header>

      {/* ① 상단: NOW & NEXT 대형 전광판 */}
      <section className="flex-shrink-0 p-3 bg-[#181c23] border-b border-slate-800/90 flex flex-col gap-2.5 shadow-lg">
        {/* NOW PLAYING 카드 */}
        <div className="bg-[#1e242d] border border-slate-700/70 rounded-xl p-3 shadow-inner">
          <div className="flex items-center justify-between mb-1.5">
            <span className="text-[10px] font-extrabold uppercase tracking-wider text-emerald-400 flex items-center gap-1.5">
              <span className={`w-2 h-2 rounded-full ${activeBgmEntries.length > 0 || activeSfxList.length > 0 ? 'bg-emerald-400 animate-ping' : 'bg-slate-600'}`} />
              NOW PLAYING · 현재 송출 상태
            </span>
            {lastPlayedItem && (
              <span className="text-[11px] text-slate-400 truncate max-w-[240px]">
                최근 실행 큐: <strong className="text-slate-200">#{soundOrderMap[cueIndex] || cueIndex + 1} {lastPlayedSound?.soundLabel || lastPlayedItem.soundLabel || lastPlayedItem.code}</strong>
              </span>
            )}
          </div>

          {activeBgmEntries.length === 0 && activeSfxList.length === 0 ? (
            <div className="py-2 flex items-center justify-between text-slate-500 text-xs">
              <span>현재 재생 중인 음원이 없습니다.</span>
              <span className="text-[11px] font-mono text-slate-600">Space 키를 눌러 다음 큐를 재생하세요</span>
            </div>
          ) : (
            <div className="flex flex-col gap-2.5">
              {activeBgmEntries.map(([code, uiState]) => {
                const soundData = getSound(code);
                if (!soundData) return null;
                const info = getPlaybackInfo(code);
                const remaining = info ? Math.max(0, info.duration - info.elapsed) : 0;

                return (
                  <div key={code} className="bg-[#14181f] border border-slate-700/60 rounded-lg p-2.5 flex flex-col gap-2">
                    <div className="flex items-center justify-between gap-2">
                      <div className="flex items-center gap-2 min-w-0">
                        <span className={`px-1.5 py-0.5 rounded text-[10px] font-bold flex-shrink-0 ${
                          uiState === 'playing'
                            ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40'
                            : uiState === 'fading'
                            ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40'
                            : 'bg-slate-700 text-slate-300'
                        }`}>
                          {uiState === 'playing' ? '🔊 BGM 재생 중' : uiState === 'fading' ? '📉 페이드아웃' : '⏸ 일시정지'}
                        </span>
                        <span className="font-extrabold text-sm sm:text-base text-white truncate">
                          {soundData.soundLabel}
                        </span>
                        <span className="text-[11px] text-slate-400 font-mono flex-shrink-0">
                          [{soundData.keyLabel}]
                        </span>
                      </div>

                      {/* 남은 시간 대형 카운트다운 */}
                      {info && (
                        <div className="flex items-baseline gap-1.5 flex-shrink-0 font-mono">
                          <span className="text-xs text-slate-400">{formatTime(info.elapsed)}</span>
                          <span className="text-slate-600">/</span>
                          <span className="text-base sm:text-lg font-black text-emerald-400" title="남은 시간">
                            -{formatTime(remaining)}
                          </span>
                        </div>
                      )}
                    </div>

                    {info && (
                      <CueSeekBar
                        elapsed={info.elapsed}
                        duration={info.duration}
                        onSeek={(time) => seekBGM(code, time)}
                      />
                    )}

                    <div className="flex items-center justify-between gap-3 pt-0.5">
                      <div className="flex items-center gap-2 flex-grow max-w-[200px]">
                        <span className="text-[10px] text-slate-400 font-mono">VOL</span>
                        <input
                          type="range"
                          min="0"
                          max="1"
                          step="0.01"
                          value={soundData.volume}
                          onChange={(e) => handleSettingChange(code, 'volume', parseFloat(e.target.value))}
                          aria-label={`${soundData.soundLabel} 볼륨`}
                          className="w-full h-1.5 bg-slate-700 rounded-lg appearance-none cursor-pointer accent-blue-400"
                        />
                        <span className="text-[10px] text-slate-400 font-mono w-7 text-right">
                          {Math.round(soundData.volume * 100)}%
                        </span>
                      </div>

                      <div className="flex items-center gap-1.5">
                        <button
                          onClick={() => handleSettingChange(code, 'loop', !soundData.loop)}
                          className={`px-2 py-1 rounded text-[11px] font-medium border transition-colors ${
                            soundData.loop
                              ? 'bg-blue-900/50 border-blue-500/50 text-blue-300'
                              : 'bg-slate-800 border-slate-700 text-slate-400'
                          }`}
                        >
                          🔁 {soundData.loop ? '반복 켬' : '반복 끔'}
                        </button>
                        <button
                          onClick={() => handleBGMPlayback(soundData, 'toggle')}
                          disabled={uiState === 'fading'}
                          className="px-2.5 py-1 rounded bg-slate-700 hover:bg-slate-600 text-white text-xs font-bold"
                        >
                          {uiState === 'paused' ? '▶️ 재개' : '⏸ 일시정지'}
                        </button>
                        <button
                          onClick={() => fadeOutBGM(code)}
                          disabled={uiState === 'fading'}
                          className="px-2.5 py-1 rounded bg-amber-600/80 hover:bg-amber-500 text-white text-xs font-bold"
                          title="2초간 서서히 볼륨을 줄이며 정지합니다"
                        >
                          📉 페이드아웃
                        </button>
                        <button
                          onClick={() => stopBGM(code)}
                          className="px-2.5 py-1 rounded bg-rose-700/80 hover:bg-rose-600 text-white text-xs font-bold"
                        >
                          ⏹ 정지
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })}

              {activeSfxList.length > 0 && (
                <div className="flex flex-wrap items-center gap-1.5 pt-0.5">
                  <span className="text-[10px] font-bold text-emerald-400 mr-1">⚡ 효과음 재생 중:</span>
                  {activeSfxList.map(sfx => (
                    <button
                      key={sfx.code}
                      onClick={() => handleSoundAction(sfx.code, true)}
                      className="px-2.5 py-1 rounded-full bg-emerald-900/60 border border-emerald-500/50 text-emerald-200 text-xs font-bold flex items-center gap-1 hover:bg-rose-900/60 hover:border-rose-500/50 transition-colors"
                      title="클릭하면 즉시 정지합니다"
                    >
                      <span>🔊 {sfx.soundLabel}</span>
                      <span className="text-[10px] opacity-75">✕</span>
                    </button>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>

        {/* NEXT CUE (대기석) & 대형 GO 버튼 */}
        <div className="bg-gradient-to-r from-purple-950/60 via-[#222733] to-[#222733] border-2 border-purple-500/50 rounded-xl p-3 shadow-lg flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
          <div className="min-w-0 flex-grow">
            <div className="flex items-center gap-2 mb-1">
              <span className="px-2 py-0.5 rounded bg-green-500/20 border border-green-400/50 text-green-300 text-[10px] font-extrabold tracking-wider">
                NEXT CUE · 대기석
              </span>
              <span className="text-xs text-purple-300 font-mono font-bold">
                {totalSoundCues === 0
                  ? '0 / 0'
                  : nextSoundOrder
                  ? `${nextSoundOrder} / ${totalSoundCues}번째 큐`
                  : `완료 (${totalSoundCues} / ${totalSoundCues})`}
              </span>
              {nextSound && (
                <span className={`text-[10px] px-1.5 py-0.5 rounded font-bold ${
                  nextSound.type === 'bgm' ? 'bg-blue-500/20 text-blue-300' : 'bg-emerald-500/20 text-emerald-300'
                }`}>
                  {nextSound.type === 'bgm' ? 'BGM' : 'SFX'} · {nextSound.keyLabel}
                </span>
              )}
            </div>

            <div className="text-lg sm:text-xl font-black text-white truncate">
              {cueList.length === 0 ? (
                <span className="text-slate-400 font-semibold text-sm">아래에서 자판 또는 로컬 음원을 식순에 추가하세요</span>
              ) : nextCueItem ? (
                nextSound ? (
                  <span className="flex items-center gap-2">
                    <span>{nextSound.soundLabel}</span>
                    {!nextSound.audioBuffer && (
                      <span className="text-xs font-normal text-rose-400 bg-rose-950/80 px-2 py-0.5 rounded border border-rose-500/40">
                        ⚠️ 음원 파일 미등록
                      </span>
                    )}
                  </span>
                ) : (
                  <span className="text-rose-400">알 수 없는 음원 ({nextCueItem.code})</span>
                )
              ) : (
                <span className="text-emerald-300">🏁 모든 식순 큐 재생 완료</span>
              )}
            </div>

            {nextCueItem?.memo && (
              <div className="mt-1 text-xs text-amber-300 font-medium bg-amber-500/10 border border-amber-500/30 rounded px-2 py-0.5 inline-block">
                💬 {nextCueItem.memo}
              </div>
            )}
          </div>

          <div className="flex items-center gap-1.5 flex-shrink-0">
            <div className="flex flex-col gap-1">
              <button
                onClick={resetCue}
                disabled={cueIndex === -1}
                className="px-2.5 py-1.5 rounded bg-slate-800 hover:bg-slate-700 disabled:opacity-40 text-slate-200 text-[11px] font-semibold transition-colors"
                title="첫 번째 큐로 대기 위치 초기화"
              >
                ⏮ 처음 대기
              </button>
              <div className="flex gap-1">
                <button
                  onClick={() => stepNextCue(-1)}
                  disabled={cueList.length === 0 || nextPlayableIndex === 0 || (cueIndex === -1)}
                  className="flex-1 px-2 py-1 rounded bg-slate-800 hover:bg-slate-700 disabled:opacity-40 text-slate-300 text-[11px] font-bold"
                  title="이전 큐를 대기석으로 지정 (↑)"
                >
                  ▲ 이전
                </button>
                <button
                  onClick={() => stepNextCue(1)}
                  disabled={cueList.length === 0 || nextPlayableIndex === -1}
                  className="flex-1 px-2 py-1 rounded bg-slate-800 hover:bg-slate-700 disabled:opacity-40 text-slate-300 text-[11px] font-bold"
                  title="다음 큐를 대기석으로 지정 (↓)"
                >
                  ▼ 다음
                </button>
              </div>
            </div>

            <button
              onClick={triggerNextCue}
              disabled={nextPlayableIndex === -1}
              className="h-14 px-7 rounded-xl bg-gradient-to-b from-purple-500 to-purple-700 hover:from-purple-400 hover:to-purple-600 disabled:opacity-40 disabled:cursor-not-allowed text-white font-black text-lg tracking-wide border-b-4 border-purple-900 active:border-b-0 active:translate-y-1 transition-all shadow-[0_0_20px_rgba(168,85,247,0.4)] flex flex-col items-center justify-center"
            >
              <span>GO ⎵</span>
              <span className="text-[10px] font-mono font-normal opacity-80">SPACE</span>
            </button>
          </div>
        </div>
      </section>

      {/* ② 중단: 통합 식순 플레이리스트 (Cue Sheet) */}
      <section className="flex-grow flex flex-col min-h-0 bg-[#14171c] p-3">
        {/* 식순 추가 툴바 (자판 선택 + 로컬/드라이브 파일 불러오기) */}
        <div className="flex-shrink-0 bg-[#1c2129] border border-slate-800 rounded-xl p-2.5 mb-2.5 flex flex-col gap-2">
          {/* 공통 메모 입력 + 자판 음원 선택 */}
          <form onSubmit={handleAddSoundCue} className="flex flex-wrap items-center gap-1.5">
            <select
              value={cueAddSelection}
              onChange={(e) => setCueAddSelection(e.target.value)}
              className="bg-slate-800 text-slate-100 text-xs rounded-lg px-2.5 py-2 border border-slate-700 outline-none focus:border-purple-400 min-w-[155px] flex-grow sm:flex-grow-0"
            >
              <option value="">⌨️ 자판 음원 선택...</option>
              <optgroup label="BGM (숫자 키패드)">
                {mappings.filter(s => s.type === 'bgm').map(s => (
                  <option key={s.code} value={s.code}>
                    [{s.keyLabel}] {s.soundLabel} {s.audioBuffer ? '✓' : '(미등록)'}
                  </option>
                ))}
              </optgroup>
              <optgroup label="SFX (효과음 자판)">
                {mappings.filter(s => s.type === 'sfx').map(s => (
                  <option key={s.code} value={s.code}>
                    [{s.keyLabel}] {s.soundLabel} {s.audioBuffer ? '✓' : '(미등록)'}
                  </option>
                ))}
              </optgroup>
            </select>

            <input
              type="text"
              value={memoInput}
              onChange={(e) => setMemoInput(e.target.value)}
              placeholder="식순 메모 (선택, 예: 사회자 개회 선언 후)"
              className="bg-slate-800 text-slate-100 text-xs rounded-lg px-2.5 py-2 border border-slate-700 outline-none focus:border-purple-400 flex-grow min-w-[130px]"
            />

            <button
              type="submit"
              disabled={!cueAddSelection}
              className="bg-purple-600 hover:bg-purple-500 disabled:opacity-40 text-white text-xs font-bold px-3 py-2 rounded-lg transition-colors flex-shrink-0"
            >
              + 자판 추가
            </button>

            {/* 로컬(드라이브) 파일 직접 추가 영역 */}
            <div className="flex items-center gap-1 bg-slate-900/80 border border-emerald-500/30 rounded-lg p-0.5">
              <select
                value={localAudioType}
                onChange={(e) => setLocalAudioType(e.target.value)}
                title="불러올 로컬 음원의 재생 방식"
                className="bg-transparent text-emerald-300 text-[11px] font-bold px-1.5 py-1.5 outline-none cursor-pointer"
              >
                <option value="bgm" className="bg-slate-900 text-slate-100">BGM 방식</option>
                <option value="sfx" className="bg-slate-900 text-slate-100">SFX 방식</option>
              </select>
              <button
                type="button"
                onClick={() => localFileInputRef.current?.click()}
                className="bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold px-3 py-1.5 rounded-md transition-colors flex items-center gap-1 flex-shrink-0"
                title="내 컴퓨터나 드라이브의 오디오 파일을 직접 불러와 큐에 추가합니다 (다중 선택 가능)"
              >
                📁 로컬 파일 불러오기
              </button>
              <input
                ref={localFileInputRef}
                type="file"
                accept="audio/*"
                multiple
                className="hidden"
                onChange={handleLocalFileChange}
              />
            </div>
          </form>

          <div className="flex flex-wrap items-center justify-between gap-2 pt-1 border-t border-slate-800/80">
            <div className="flex items-center gap-1.5 flex-grow max-w-xs">
              <input
                type="text"
                value={dividerInput}
                onChange={(e) => setDividerInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault();
                    handleAddDividerRow();
                  }
                }}
                placeholder="구분선 제목 (예: 1부 개회식)"
                className="bg-slate-800/80 text-slate-200 text-[11px] rounded px-2 py-1 border border-slate-700/80 outline-none focus:border-slate-500 flex-grow"
              />
              <button
                type="button"
                onClick={handleAddDividerRow}
                className="bg-slate-700 hover:bg-slate-600 text-slate-200 text-[11px] font-medium px-2.5 py-1 rounded transition-colors flex-shrink-0"
              >
                + 구분선
              </button>
            </div>

            <div className="flex items-center gap-2 text-[11px] text-slate-400">
              <span>💡 파일 드래그 앤 드롭 지원 · 행 클릭 시 <strong className="text-green-400">NEXT 대기</strong></span>
              {cueList.length > 0 && (
                <button
                  onClick={clearCueList}
                  className="text-rose-400 hover:text-rose-300 font-medium ml-1"
                >
                  전체 비우기
                </button>
              )}
            </div>
          </div>
        </div>

        {/* 식순 테이블 목록 */}
        <div className="flex-grow overflow-y-auto custom-scrollbar pr-1 space-y-1.5">
          {cueList.length === 0 ? (
            <div className="h-full min-h-[160px] flex flex-col items-center justify-center text-center border border-dashed border-slate-800 rounded-xl p-6 text-slate-500">
              <span className="text-2xl mb-2">📋</span>
              <p className="text-sm font-semibold text-slate-400">등록된 식순(큐)이 없습니다</p>
              <p className="text-xs mt-1">
                위에서 <strong>자판 음원</strong>을 고르거나 <strong>📁 로컬 파일 불러오기</strong>(또는 파일 드래그 앤 드롭)로 음원을 추가하세요.
              </p>
            </div>
          ) : (
            cueList.map((item, idx) => {
              if (item.type === 'divider') {
                return (
                  <div
                    key={item.id || `div-${idx}`}
                    className="flex items-center justify-between gap-2 bg-slate-900/90 border border-slate-700/60 rounded-lg px-3 py-1.5 text-xs"
                  >
                    <div className="flex items-center gap-2 flex-grow">
                      <span className="text-amber-400 font-bold text-[11px]">🔖 구분</span>
                      <input
                        type="text"
                        value={item.title}
                        onChange={(e) => updateCueItem(idx, { title: e.target.value })}
                        className="bg-transparent text-amber-200 font-bold text-xs border-b border-transparent focus:border-amber-400 outline-none flex-grow"
                      />
                    </div>
                    <div className="flex items-center gap-1 flex-shrink-0">
                      <button
                        onClick={() => moveCue(idx, -1)}
                        disabled={idx === 0}
                        className="w-6 h-6 rounded hover:bg-slate-800 disabled:opacity-30 text-slate-400"
                        title="위로 이동"
                      >
                        ↑
                      </button>
                      <button
                        onClick={() => moveCue(idx, 1)}
                        disabled={idx === cueList.length - 1}
                        className="w-6 h-6 rounded hover:bg-slate-800 disabled:opacity-30 text-slate-400"
                        title="아래로 이동"
                      >
                        ↓
                      </button>
                      <button
                        onClick={() => removeCue(idx)}
                        className="w-6 h-6 rounded hover:bg-rose-950 text-rose-400"
                        title="삭제"
                      >
                        ✕
                      </button>
                    </div>
                  </div>
                );
              }

              const sound = getSound(item.code);
              const isLocal = item.source === 'local' || String(item.code).startsWith('local_');
              const isNext = idx === nextPlayableIndex;
              const isPast = idx <= cueIndex;
              const isCurrentlyPlaying =
                sound &&
                (bgmUIStates[sound.code] === 'playing' ||
                  bgmUIStates[sound.code] === 'fading' ||
                  sfxPlayingCodes.has(sound.code));
              const orderNum = soundOrderMap[idx];

              return (
                <div
                  key={item.id || `${item.code}-${idx}`}
                  onClick={() => selectNextCue(idx)}
                  className={`group flex flex-wrap sm:flex-nowrap items-center justify-between gap-2 rounded-xl px-3 py-2 border transition-all cursor-pointer ${
                    isNext
                      ? 'bg-green-950/40 border-green-400 shadow-[0_0_15px_rgba(74,222,128,0.18)]'
                      : isCurrentlyPlaying
                      ? 'bg-emerald-950/30 border-emerald-500/60'
                      : isPast
                      ? 'bg-[#181b22]/70 border-slate-800/80 opacity-65 hover:opacity-100'
                      : 'bg-[#1c212b] border-slate-800 hover:border-slate-600'
                  }`}
                >
                  <div className="flex items-center gap-2.5 min-w-0 flex-grow">
                    {/* 순번 및 상태 뱃지 */}
                    <span
                      className={`w-6 h-6 rounded-full text-xs font-extrabold flex items-center justify-center flex-shrink-0 ${
                        isNext
                          ? 'bg-green-400 text-slate-950'
                          : isCurrentlyPlaying
                          ? 'bg-emerald-500 text-slate-950 animate-pulse'
                          : isPast
                          ? 'bg-slate-800 text-slate-500'
                          : 'bg-slate-800 text-purple-300'
                      }`}
                    >
                      {orderNum}
                    </span>

                    {isNext && (
                      <span className="px-1.5 py-0.5 rounded bg-green-400 text-slate-950 text-[10px] font-black flex-shrink-0">
                        NEXT 대기
                      </span>
                    )}
                    {isCurrentlyPlaying && (
                      <span className="px-1.5 py-0.5 rounded bg-emerald-500/20 border border-emerald-400/50 text-emerald-300 text-[10px] font-bold flex-shrink-0">
                        🔊 송출 중
                      </span>
                    )}

                    <div className="min-w-0 flex-grow">
                      <div className="flex items-center gap-1.5 flex-wrap">
                        {isLocal ? (
                          <input
                            type="text"
                            value={item.soundLabel || sound?.soundLabel || ''}
                            onClick={(e) => e.stopPropagation()}
                            onChange={(e) => updateCueItem(idx, { soundLabel: e.target.value })}
                            placeholder="음원 이름"
                            className="font-bold text-sm text-white bg-transparent border-b border-transparent focus:border-purple-400 outline-none min-w-[100px] max-w-[200px]"
                          />
                        ) : (
                          <span className="font-bold text-sm text-white truncate">
                            {sound ? sound.soundLabel : item.code}
                          </span>
                        )}

                        {isLocal ? (
                          <>
                            <span className="text-[10px] px-1.5 py-0.5 rounded font-mono bg-amber-500/15 text-amber-300 border border-amber-500/30 flex-shrink-0">
                              📁 로컬
                            </span>
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                const nextType = (item.audioType || 'bgm') === 'bgm' ? 'sfx' : 'bgm';
                                updateCueItem(idx, { audioType: nextType });
                              }}
                              title="클릭하여 BGM / SFX 재생 방식 전환"
                              className={`text-[10px] px-1.5 py-0.5 rounded font-mono font-bold flex-shrink-0 ${
                                (item.audioType || 'bgm') === 'bgm'
                                  ? 'bg-blue-500/20 text-blue-300 border border-blue-500/40'
                                  : 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40'
                              }`}
                            >
                              {(item.audioType || 'bgm').toUpperCase()} ⇄
                            </button>
                          </>
                        ) : (
                          sound && (
                            <span
                              className={`text-[10px] px-1.5 py-0.5 rounded font-mono flex-shrink-0 ${
                                sound.type === 'bgm'
                                  ? 'bg-blue-500/15 text-blue-300 border border-blue-500/30'
                                  : 'bg-emerald-500/15 text-emerald-300 border border-emerald-500/30'
                              }`}
                            >
                              ⌨️ {sound.keyLabel}
                            </span>
                          )
                        )}

                        {sound && !sound.audioBuffer && (
                          <span className="text-[10px] text-rose-400 font-semibold flex-shrink-0">
                            (음원 없음)
                          </span>
                        )}
                      </div>

                      {/* 인라인 메모 수정 */}
                      <input
                        type="text"
                        value={item.memo || ''}
                        onClick={(e) => e.stopPropagation()}
                        onChange={(e) => updateCueItem(idx, { memo: e.target.value })}
                        placeholder="메모 입력 (클릭하여 식순 노트 작성)..."
                        className="w-full bg-transparent text-[11px] text-amber-300/90 placeholder:text-slate-600 border-b border-transparent focus:border-amber-400/60 outline-none mt-0.5"
                      />
                    </div>
                  </div>

                  {/* 우측 액션 버튼들 */}
                  <div
                    className="flex items-center gap-1 flex-shrink-0"
                    onClick={(e) => e.stopPropagation()}
                  >
                    <button
                      onClick={() => playCueAtIndex(idx)}
                      className="px-2 py-1 rounded bg-purple-600/80 hover:bg-purple-500 text-white text-[11px] font-bold transition-colors"
                      title="이 큐를 즉시 재생합니다"
                    >
                      ▶ 재생
                    </button>
                    <button
                      onClick={() => moveCue(idx, -1)}
                      disabled={idx === 0}
                      className="w-6 h-6 rounded bg-slate-800/80 hover:bg-slate-700 disabled:opacity-30 text-slate-300 text-xs"
                      title="위로 이동"
                    >
                      ↑
                    </button>
                    <button
                      onClick={() => moveCue(idx, 1)}
                      disabled={idx === cueList.length - 1}
                      className="w-6 h-6 rounded bg-slate-800/80 hover:bg-slate-700 disabled:opacity-30 text-slate-300 text-xs"
                      title="아래로 이동"
                    >
                      ↓
                    </button>
                    <button
                      onClick={() => removeCue(idx)}
                      className="w-6 h-6 rounded bg-slate-800/80 hover:bg-rose-900/70 text-rose-400 text-xs"
                      title="큐에서 제거"
                    >
                      ✕
                    </button>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </section>

      {/* ③ 하단: 미니 효과음 패드 (Quick SFX Pads) */}
      <footer className="flex-shrink-0 bg-[#101318] border-t border-slate-800 p-3">
        <div className="flex items-center justify-between mb-2">
          <button
            onClick={() => setShowSfxDeck(v => !v)}
            className="text-xs font-bold text-slate-300 hover:text-white flex items-center gap-1.5"
          >
            <span>⚡ 즉시 효과음 패드 (Quick SFX)</span>
            <span className="text-[10px] text-slate-500">{showSfxDeck ? '▼ 접기' : '▲ 펼치기'}</span>
          </button>

          <div className="flex items-center gap-2 text-xs text-slate-400">
            <span className="text-[11px]">SFX 마스터 볼륨</span>
            <input
              type="range"
              min="0"
              max="1"
              step="0.01"
              value={sfxVolume}
              onChange={(e) => setSfxVolume(parseFloat(e.target.value))}
              aria-label="전체 효과음 볼륨"
              className="w-20 h-1.5 bg-slate-700 rounded-lg appearance-none cursor-pointer accent-emerald-400"
            />
          </div>
        </div>

        {showSfxDeck && (
          <div className="grid grid-cols-4 sm:grid-cols-6 gap-1.5">
            {SFX_CODES.map((code) => {
              const s = getSound(code);
              if (!s) return null;
              const hasAudio = !!s.audioBuffer;
              const isPlaying = sfxPlayingCodes.has(code);

              return (
                <button
                  key={code}
                  disabled={!hasAudio || s.isDecoding}
                  onClick={() => handleSoundAction(code, true)}
                  className={`relative px-2 py-2 rounded-lg text-left transition-all border flex flex-col justify-between min-h-[48px] ${
                    !hasAudio
                      ? 'bg-slate-900/60 border-slate-800/80 text-slate-600 cursor-not-allowed'
                      : isPlaying
                      ? 'bg-emerald-600 border-emerald-300 text-white shadow-[0_0_12px_rgba(16,185,129,0.6)] scale-[0.98]'
                      : 'bg-[#1d232d] hover:bg-[#262e3b] border-slate-700/80 text-slate-100 active:translate-y-0.5'
                  }`}
                >
                  <div className="flex items-center justify-between w-full">
                    <span className="text-[10px] font-black font-mono opacity-70">{s.keyLabel}</span>
                    {isPlaying && <span className="text-[10px] animate-pulse">🔊</span>}
                  </div>
                  <span className="text-[11px] font-bold truncate w-full mt-0.5">
                    {hasAudio ? s.soundLabel : '비어있음'}
                  </span>
                </button>
              );
            })}
          </div>
        )}
      </footer>
    </div>
  );
}
