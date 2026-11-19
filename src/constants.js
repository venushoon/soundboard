export const STORAGE_KEY = 'soundboard_settings_v11';
export const SFX_VOL_KEY = 'soundboard_sfx_vol_v11';
export const CUE_KEY = 'soundboard_cue_list_v1';

export const INITIAL_MAPPINGS = [
  { code: 'KeyQ', keyLabel: 'Q', soundLabel: '정답 딩동댕', audioBuffer: null, soundId: null, color: 'bg-green-500', type: 'sfx', isDecoding: false, volume: 1.0 },
  { code: 'KeyW', keyLabel: 'W', soundLabel: '오답 땡', audioBuffer: null, soundId: null, color: 'bg-red-500', type: 'sfx', isDecoding: false, volume: 1.0 },
  { code: 'KeyE', keyLabel: 'E', soundLabel: '박수 함성', audioBuffer: null, soundId: null, color: 'bg-blue-500', type: 'sfx', isDecoding: false, volume: 1.0 },
  { code: 'KeyR', keyLabel: 'R', soundLabel: '환호성', audioBuffer: null, soundId: null, color: 'bg-emerald-500', type: 'sfx', isDecoding: false, volume: 1.0 },
  { code: 'KeyT', keyLabel: 'T', soundLabel: '빈 키 T', audioBuffer: null, soundId: null, color: 'bg-orange-500', type: 'sfx', isDecoding: false, volume: 1.0 },

  { code: 'KeyA', keyLabel: 'A', soundLabel: '두구두구', audioBuffer: null, soundId: null, color: 'bg-purple-500', type: 'sfx', isDecoding: false, volume: 1.0 },
  { code: 'KeyS', keyLabel: 'S', soundLabel: '웃음 소리', audioBuffer: null, soundId: null, color: 'bg-yellow-500', type: 'sfx', isDecoding: false, volume: 1.0 },
  { code: 'KeyD', keyLabel: 'D', soundLabel: '등장 효과음', audioBuffer: null, soundId: null, color: 'bg-pink-500', type: 'sfx', isDecoding: false, volume: 1.0 },
  { code: 'KeyF', keyLabel: 'F', soundLabel: '빠밤!', audioBuffer: null, soundId: null, color: 'bg-indigo-500', type: 'sfx', isDecoding: false, volume: 1.0 },
  { code: 'KeyG', keyLabel: 'G', soundLabel: '빈 키 G', audioBuffer: null, soundId: null, color: 'bg-teal-500', type: 'sfx', isDecoding: false, volume: 1.0 },

  { code: 'KeyZ', keyLabel: 'Z', soundLabel: '띠로링', audioBuffer: null, soundId: null, color: 'bg-cyan-500', type: 'sfx', isDecoding: false, volume: 1.0 },
  { code: 'KeyX', keyLabel: 'X', soundLabel: '뿅 (점프)', audioBuffer: null, soundId: null, color: 'bg-fuchsia-500', type: 'sfx', isDecoding: false, volume: 1.0 },
  { code: 'KeyC', keyLabel: 'C', soundLabel: '빰빠밤', audioBuffer: null, soundId: null, color: 'bg-lime-500', type: 'sfx', isDecoding: false, volume: 1.0 },
  { code: 'KeyV', keyLabel: 'V', soundLabel: '휘리릭', audioBuffer: null, soundId: null, color: 'bg-rose-500', type: 'sfx', isDecoding: false, volume: 1.0 },
  { code: 'KeyB', keyLabel: 'B', soundLabel: '빈 키 B', audioBuffer: null, soundId: null, color: 'bg-amber-600', type: 'sfx', isDecoding: false, volume: 1.0 },

  { code: 'Numpad7', keyLabel: 'Num 7', soundLabel: '메인 테마', audioBuffer: null, soundId: null, color: 'bg-indigo-600', type: 'bgm', isDecoding: false, loop: true, volume: 1.0 },
  { code: 'Numpad8', keyLabel: 'Num 8', soundLabel: '마을 배경음', audioBuffer: null, soundId: null, color: 'bg-violet-600', type: 'bgm', isDecoding: false, loop: true, volume: 1.0 },
  { code: 'Numpad9', keyLabel: 'Num 9', soundLabel: '전투/긴장', audioBuffer: null, soundId: null, color: 'bg-slate-700', type: 'bgm', isDecoding: false, loop: true, volume: 1.0 },
  { code: 'Numpad4', keyLabel: 'Num 4', soundLabel: '슬픈 장면', audioBuffer: null, soundId: null, color: 'bg-teal-600', type: 'bgm', isDecoding: false, loop: true, volume: 1.0 },
  { code: 'Numpad5', keyLabel: 'Num 5', soundLabel: '회상 씬', audioBuffer: null, soundId: null, color: 'bg-orange-600', type: 'bgm', isDecoding: false, loop: true, volume: 1.0 },
  { code: 'Numpad6', keyLabel: 'Num 6', soundLabel: '엔딩 크레딧', audioBuffer: null, soundId: null, color: 'bg-rose-600', type: 'bgm', isDecoding: false, loop: true, volume: 1.0 },
  { code: 'Numpad1', keyLabel: 'Num 1', soundLabel: '쉬는 시간', audioBuffer: null, soundId: null, color: 'bg-sky-600', type: 'bgm', isDecoding: false, loop: true, volume: 1.0 },
  { code: 'Numpad2', keyLabel: 'Num 2', soundLabel: '행사 시작', audioBuffer: null, soundId: null, color: 'bg-amber-600', type: 'bgm', isDecoding: false, loop: true, volume: 1.0 },
  { code: 'Numpad3', keyLabel: 'Num 3', soundLabel: '시상식', audioBuffer: null, soundId: null, color: 'bg-fuchsia-700', type: 'bgm', isDecoding: false, loop: true, volume: 1.0 },
];

// 효과음 자판 코드 (물리 키보드 왼쪽 블록 15키) + 뱅크
export const SFX_CODES = [
  'KeyQ', 'KeyW', 'KeyE', 'KeyR', 'KeyT',
  'KeyA', 'KeyS', 'KeyD', 'KeyF', 'KeyG',
  'KeyZ', 'KeyX', 'KeyC', 'KeyV', 'KeyB',
];
export const SFX_BANKS = ['A', 'B'];

// 키별 색상 팔레트 (키 설정 모달에서 선택). cls는 키 배경에 그대로 쓰이는 Tailwind 클래스.
export const KEY_COLORS = [
  { cls: 'bg-green-500', label: '초록' },
  { cls: 'bg-red-500', label: '빨강' },
  { cls: 'bg-blue-500', label: '파랑' },
  { cls: 'bg-emerald-500', label: '에메랄드' },
  { cls: 'bg-cyan-500', label: '하늘' },
  { cls: 'bg-orange-500', label: '주황' },
  { cls: 'bg-amber-500', label: '호박' },
  { cls: 'bg-yellow-500', label: '노랑' },
  { cls: 'bg-purple-500', label: '보라' },
  { cls: 'bg-pink-500', label: '분홍' },
  { cls: 'bg-slate-500', label: '회색' },
];

// 서버가 계산한 사운드별 음량 보정값(dB)을 재생 게인(선형)으로 변환
export const dbToGain = (db) => Math.pow(10, (typeof db === 'number' && Number.isFinite(db) ? db : 0) / 20);
export const soundGainOf = (obj) => dbToGain(obj?.soundGainDb);

export const formatTime = (sec) => {
  if (!isFinite(sec) || sec < 0) sec = 0;
  const m = Math.floor(sec / 60);
  const s = Math.floor(sec % 60);
  return `${m}:${s.toString().padStart(2, '0')}`;
};

export const blobToBase64 = (blob) => new Promise((resolve, reject) => {
  const reader = new FileReader();
  reader.onloadend = () => resolve(reader.result);
  reader.onerror = reject;
  reader.readAsDataURL(blob);
});