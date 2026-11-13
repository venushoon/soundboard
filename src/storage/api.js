// 저장 모드 선택 — 빌드 시점에 결정된다.
// - server (기본): Express 서버에 저장. `npm run build` / Docker 배포용.
// - local: 브라우저(IndexedDB/localStorage)에 저장. GitHub Pages용 `npm run build:pages`.
// 앱 코드(App.jsx 등)는 어느 모드인지 몰라도 되도록 같은 인터페이스를 내보낸다.
import { api as serverApiImpl } from './serverApi.js';
import { localApi } from './localApi.js';

export const STORAGE_MODE = import.meta.env.VITE_STORAGE_MODE === 'local' ? 'local' : 'server';
export const api = STORAGE_MODE === 'local' ? localApi : serverApiImpl;
