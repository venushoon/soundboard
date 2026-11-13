// 서버 저장 API 클라이언트 — 모든 영구 데이터는 오라클 서버의 이 API를 통해 저장/복원된다.
async function req(url, options = {}) {
  const res = await fetch(url, options);
  if (!res.ok) {
    let msg = `서버 오류 (${res.status})`;
    try { const j = await res.json(); if (j.error) msg = j.error; } catch { /* ignore */ }
    throw new Error(msg);
  }
  return res.status === 204 ? null : res.json();
}

export const api = {
  getState: () => req('/api/state'),
  createCategory: (name) => req('/api/categories', {
    method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ name }),
  }),
  renameCategory: (id, name) => req(`/api/categories/${id}`, {
    method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ name }),
  }),
  deleteCategory: (id) => req(`/api/categories/${id}`, { method: 'DELETE' }),
  uploadSound: async ({ file, categoryId, categoryName, type, name }) => {
    const fd = new FormData();
    fd.append('file', file);
    if (categoryId) fd.append('categoryId', categoryId);
    if (categoryName) fd.append('categoryName', categoryName);
    if (type) fd.append('type', type);
    if (name) fd.append('name', name);
    return req('/api/sounds/upload', { method: 'POST', body: fd });
  },
  updateSound: (id, patch) => req(`/api/sounds/${id}`, {
    method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(patch),
  }),
  deleteSound: (id) => req(`/api/sounds/${id}`, { method: 'DELETE' }),
  analyzeAll: () => req('/api/sounds/analyze-all', { method: 'POST' }),
  saveBoard: (board) => req('/api/board', {
    method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(board),
  }),
  saveCues: (cueList) => req('/api/cues', {
    method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ cueList }),
  }),
  fetchSoundBlob: async (soundId) => {
    const res = await fetch(`/api/sounds/${soundId}/file`);
    if (!res.ok) throw new Error('사운드 파일을 불러올 수 없습니다');
    return res.blob();
  },
};
