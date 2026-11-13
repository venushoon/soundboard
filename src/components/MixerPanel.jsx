import React, { useEffect, useRef, useState } from 'react';

// 하단 볼륨 믹서: 자판에 배치된 효과음(현재 뱅크)·BGM을 실제 믹서처럼
// 세로 페이더 채널 스트립으로 보여준다. 페이더 범위는 0~200%이고
// 가운데(100%)가 기본 볼륨 — 위로 올리면 부스트, 아래로 내리면 감쇠.
// 값은 키별 볼륨(mapping.volume)과 동일하며 handleSettingChange 경로로
// 라이브 적용 + 서버 저장까지 함께 이뤄진다.
const MAX_VOL = 2;
const keyBadge = (code) => code.replace(/^Key/, '').replace(/^Numpad/, '');

function Fader({ value, fillClass, label, onChange }) {
  const trackRef = useRef(null);
  const draggingRef = useRef(false);
  const pct = Math.min(100, Math.max(0, (value / MAX_VOL) * 100));

  const setFromClientY = (clientY) => {
    const rect = trackRef.current.getBoundingClientRect();
    if (!rect.height) return;
    const ratio = 1 - (clientY - rect.top) / rect.height;
    onChange(Math.round(Math.min(MAX_VOL, Math.max(0, ratio * MAX_VOL)) * 100) / 100);
  };
  const handlePointerDown = (e) => {
    draggingRef.current = true;
    e.currentTarget.setPointerCapture(e.pointerId);
    setFromClientY(e.clientY);
  };
  const handlePointerMove = (e) => { if (draggingRef.current) setFromClientY(e.clientY); };
  const endDrag = () => { draggingRef.current = false; };
  const handleKeyDown = (e) => {
    if (e.key === 'ArrowUp' || e.key === 'ArrowRight') { e.preventDefault(); onChange(Math.min(MAX_VOL, Math.round((value + 0.05) * 100) / 100)); }
    if (e.key === 'ArrowDown' || e.key === 'ArrowLeft') { e.preventDefault(); onChange(Math.max(0, Math.round((value - 0.05) * 100) / 100)); }
  };

  return (
    <div
      ref={trackRef}
      role="slider" aria-label={label}
      aria-valuemin={0} aria-valuemax={200} aria-valuenow={Math.round(value * 100)}
      aria-valuetext={`${Math.round(value * 100)}%`}
      tabIndex={0}
      onPointerDown={handlePointerDown} onPointerMove={handlePointerMove}
      onPointerUp={endDrag} onPointerCancel={endDrag}
      onDoubleClick={() => onChange(1)}
      onKeyDown={handleKeyDown}
      title="드래그로 조절 · 더블클릭하면 100%로"
      className="mixer-fader relative w-12 cursor-pointer touch-none select-none rounded-lg focus:outline-none focus:ring-2 focus:ring-slate-400/50"
    >
      <div className="absolute left-1/2 -translate-x-1/2 top-0 bottom-0 w-2 rounded-full bg-slate-700" />
      <div className={`absolute left-1/2 -translate-x-1/2 bottom-0 w-2 rounded-full ${fillClass}`} style={{ height: `${pct}%` }} />
      <div className="absolute left-1/2 -translate-x-1/2 top-1/2 -translate-y-1/2 w-7 h-[3px] bg-slate-200/80 rounded" />
      <div
        className="mixer-handle absolute left-1/2 -translate-x-1/2 w-9 h-4 rounded bg-slate-200 border border-slate-400 shadow-[0_2px_6px_rgba(0,0,0,0.55)]"
        style={{ bottom: `calc(${pct}% - 8px)` }}
      />
    </div>
  );
}

const ctrlBtn = 'mixer-btn w-8 h-8 rounded flex items-center justify-center text-[13px] bg-slate-700 hover:bg-slate-600 disabled:opacity-30 disabled:hover:bg-slate-700 transition-colors';

// 채널 출력 레벨 미터: 엔진 애널라이저(RMS)를 MixerGroups가 rAF로 읽어 내려준다
function LevelMeter({ level, label }) {
  const pct = Math.round(Math.min(1, Math.max(0, level || 0)) * 100);
  return (
    <div
      className="relative w-1.5 self-stretch rounded-full bg-slate-800 overflow-hidden shrink-0"
      role="meter" aria-label={`${label} 출력 레벨`} aria-valuemin={0} aria-valuemax={100} aria-valuenow={pct}
      title="출력 레벨"
    >
      <div
        className="absolute bottom-0 left-0 right-0"
        style={{
          height: `${pct}%`,
          background: 'linear-gradient(to top, #34d399 0%, #34d399 55%, #fbbf24 78%, #f87171 96%)',
        }}
      />
    </div>
  );
}

function ChannelStrip({ ch, kind, state, level, onVolumeChange, onBgmToggle, onBgmStop, onSfxTrigger, onSfxStop }) {
  const vol = ch.volume ?? 1;
  const pct = Math.round(vol * 100);
  const isPlaying = kind === 'bgm' ? state === 'playing' : !!state;
  const pctClass = pct > 100 ? 'text-amber-400' : pct === 100 ? 'text-emerald-400' : 'text-slate-400';

  return (
    <div className="mixer-strip flex flex-col items-center w-[84px] shrink-0 bg-[#222731] border border-black/20 rounded-xl px-1.5 py-3 gap-1.5">
      <div className="flex items-center gap-1.5">
        <span className={`mixer-badge w-7 h-7 rounded-md flex items-center justify-center text-[11px] font-extrabold ${isPlaying ? (kind === 'bgm' ? 'bg-blue-500' : 'bg-emerald-500') + ' text-white' : 'bg-slate-700 text-slate-300'}`}>
          {keyBadge(ch.code)}
        </span>
        <span className={`w-2 h-2 rounded-full ${isPlaying ? (kind === 'bgm' ? 'bg-blue-400' : 'bg-emerald-400') + ' animate-pulse' : 'bg-slate-600'}`} aria-hidden="true" />
      </div>

      <div className="flex items-stretch gap-1">
        <LevelMeter level={level} label={ch.soundLabel} />
        <Fader
          value={vol}
          fillClass={kind === 'bgm' ? 'bg-blue-500' : 'bg-emerald-500'}
          label={`${ch.soundLabel} 볼륨`}
          onChange={(v) => onVolumeChange(ch.code, v)}
        />
      </div>

      <button type="button" onClick={() => onVolumeChange(ch.code, 1)}
        title="100%로 초기화"
        className={`text-[11px] font-mono font-bold hover:underline ${pctClass}`}>
        {pct}%
      </button>
      <span className="mixer-name w-full text-center text-[11px] font-bold leading-tight text-slate-200 line-clamp-2 min-h-7" title={ch.soundLabel}>{ch.soundLabel}</span>

      <div className="mixer-btns flex gap-1 mt-0.5">
        {kind === 'bgm' ? (
          <>
            <button onClick={() => onBgmToggle(ch.code)} disabled={state === 'fading'}
              aria-label={state === 'playing' ? `${ch.soundLabel} 일시정지` : `${ch.soundLabel} 재생`} className={ctrlBtn}>
              {state === 'playing' ? '⏸️' : '▶️'}
            </button>
            <button onClick={() => onBgmStop(ch.code)} disabled={!state}
              aria-label={`${ch.soundLabel} 정지`} className={`${ctrlBtn} hover:bg-rose-800`}>
              ⏹️
            </button>
          </>
        ) : (
          <>
            <button onClick={() => onSfxTrigger(ch.code)}
              aria-label={`${ch.soundLabel} 재생`} className={ctrlBtn}>
              ▶️
            </button>
            <button onClick={() => onSfxStop(ch.code)} disabled={!isPlaying}
              aria-label={`${ch.soundLabel} 정지`} className={`${ctrlBtn} hover:bg-rose-800`}>
              ⏹️
            </button>
          </>
        )}
      </div>
    </div>
  );
}

// 채널 그룹(효과음/BGM) — 인라인 패널과 팝업 창이 공유한다
export function MixerGroups({ sfxChannels, bgmChannels, sfxBank, sfxPlayingCodes, bgmUIStates, getLevel, onVolumeChange, onBgmToggle, onBgmStop, onSfxTrigger, onSfxStop }) {
  // 채널별 출력 레벨을 짧은 주기 타이머로 읽어 미터에 반영한다.
  // rAF는 메인 창이 가려지거나 최소화되면 멈춰 미터가 얼어붙으므로 타이머를 쓴다.
  // 재생 중이 아닌 채널은 0으로 고정해, 소리가 끝난 뒤 미터 잔상이 남지 않게 한다.
  const [levels, setLevels] = useState({});
  const liveRef = useRef({ sfxChannels, bgmChannels, sfxPlayingCodes, bgmUIStates });
  liveRef.current = { sfxChannels, bgmChannels, sfxPlayingCodes, bgmUIStates };
  useEffect(() => {
    if (!getLevel) return undefined;
    const tick = () => {
      const { sfxChannels: sfx, bgmChannels: bgm, sfxPlayingCodes: playing, bgmUIStates: bgmStates } = liveRef.current;
      setLevels(prev => {
        const next = {};
        sfx.forEach(ch => {
          const raw = playing.has(ch.code) ? getLevel(ch.code) : 0;
          next[ch.code] = raw < 0.02 ? 0 : raw;
        });
        bgm.forEach(ch => {
          const st = bgmStates[ch.code];
          const raw = (st === 'playing' || st === 'fading') ? getLevel(ch.code) : 0;
          next[ch.code] = raw < 0.02 ? 0 : raw;
        });
        const keys = Object.keys(next);
        const changed = keys.length !== Object.keys(prev).length
          || keys.some(code => (next[code] === 0 ? (prev[code] || 0) !== 0 : Math.abs((prev[code] || 0) - next[code]) > 0.01));
        return changed ? next : prev;
      });
    };
    tick();
    const id = setInterval(tick, 50);
    return () => clearInterval(id);
  }, [getLevel]);

  return (
    <div className="mixer-groups flex flex-col gap-5">
      {sfxChannels.length > 0 && (
        <div className="mixer-group" style={{ '--mixer-grow': sfxChannels.length }}>
          <h3 className="text-xs font-bold text-slate-500 ml-2 mb-2">효과음 · 뱅크 {sfxBank}</h3>
          <div className="mixer-row flex flex-wrap gap-2">
            {sfxChannels.map(ch => (
              <ChannelStrip key={ch.code} ch={ch} kind="sfx" state={sfxPlayingCodes.has(ch.code)} level={levels[ch.code] || 0}
                onVolumeChange={onVolumeChange} onBgmToggle={onBgmToggle} onBgmStop={onBgmStop}
                onSfxTrigger={onSfxTrigger} onSfxStop={onSfxStop} />
            ))}
          </div>
        </div>
      )}
      {bgmChannels.length > 0 && (
        <div className="mixer-group" style={{ '--mixer-grow': bgmChannels.length }}>
          <h3 className="text-xs font-bold text-slate-500 ml-2 mb-2">BGM · 숫자 키패드</h3>
          <div className="mixer-row flex flex-wrap gap-2">
            {bgmChannels.map(ch => (
              <ChannelStrip key={ch.code} ch={ch} kind="bgm" state={bgmUIStates[ch.code]} level={levels[ch.code] || 0}
                onVolumeChange={onVolumeChange} onBgmToggle={onBgmToggle} onBgmStop={onBgmStop}
                onSfxTrigger={onSfxTrigger} onSfxStop={onSfxStop} />
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

const headerBtn = 'px-3 py-1.5 rounded-lg text-xs font-extrabold bg-slate-700 border-b-4 border-slate-900 text-slate-300 hover:bg-slate-600 active:border-b-0 active:translate-y-0.5 transition-all';

const MixerPanel = (props) => {
  const { sfxChannels, bgmChannels, poppedOut, onPopOut, onClosePopOut, onResetAll } = props;
  // 처음 접속하면 접힌 상태가 기본. 한 번 펼치거나 접으면 그 선택을 기억한다.
  const [open, setOpen] = useState(() => {
    try { return localStorage.getItem('soundboard_mixer_open') === '1'; } catch { return false; }
  });
  const toggleOpen = () => setOpen((o) => {
    const next = !o;
    try { localStorage.setItem('soundboard_mixer_open', next ? '1' : '0'); } catch { /* ignore */ }
    return next;
  });
  const total = sfxChannels.length + bgmChannels.length;

  return (
    <section className="mt-6 bg-[#2a303c] p-4 sm:p-6 rounded-2xl shadow-[inset_0_4px_10px_rgba(255,255,255,0.05),0_15px_25px_rgba(0,0,0,0.5)] border border-slate-600/30">
      <div className="flex items-center justify-between gap-2 ml-2 mb-1">
        <h2 className="text-lg font-bold text-slate-400 flex items-center gap-2">
          🎚️ 볼륨 믹서
          <span className="text-[10px] font-normal text-slate-300 bg-slate-400/10 px-2 py-0.5 rounded">등록 {total}개</span>
        </h2>
        <div className="flex items-center gap-1.5">
          {poppedOut ? (
            <>
              <button onClick={onPopOut} className={headerBtn}>창 앞으로</button>
              <button onClick={onClosePopOut} className={headerBtn}>창 닫기</button>
            </>
          ) : (
            <>
              <button onClick={onResetAll} className={headerBtn}>↺ 초기화</button>
              <button onClick={onPopOut} className={headerBtn}>🪟 창으로 띄우기</button>
              <button onClick={toggleOpen} aria-expanded={open} className={headerBtn}>
                {open ? '접기' : '펼치기'}
              </button>
            </>
          )}
        </div>
      </div>

      {poppedOut ? (
        <p className="text-sm text-slate-500 ml-2 py-3">믹서가 별도 창에 열려 있습니다. 창을 닫으면 여기로 돌아옵니다.</p>
      ) : open && (
        total === 0 ? (
          <p className="text-sm text-slate-500 ml-2 py-3">자판에 배치된 사운드가 없습니다. 키에 사운드를 배치하면 여기에 채널이 생깁니다.</p>
        ) : (
          <div className="mt-3">
            <MixerGroups {...props} />
          </div>
        )
      )}
    </section>
  );
};

export default MixerPanel;
