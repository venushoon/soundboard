// 업로드된 원본 오디오 파일(Blob)을 IndexedDB에 저장 -> 새로고침 후에도 복원
// localStorage는 문자열만 저장 가능해 오디오 파일 자체는 담을 수 없어 별도 저장소 사용

const DB_NAME = 'soundboard_files';
const STORE = 'sounds';
const DB_VERSION = 1;

function openDB() {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, DB_VERSION);
    req.onupgradeneeded = () => {
      if (!req.result.objectStoreNames.contains(STORE)) {
        req.result.createObjectStore(STORE);
      }
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

export async function saveSoundFile(code, blob) {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE, 'readwrite');
    tx.objectStore(STORE).put(blob, code);
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
}

export async function deleteSoundFile(code) {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE, 'readwrite');
    tx.objectStore(STORE).delete(code);
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
}

// { code: Blob, ... } 형태로 저장된 모든 파일 반환
export async function loadAllSoundFiles() {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE, 'readonly');
    const store = tx.objectStore(STORE);
    const result = {};
    const req = store.openCursor();
    req.onsuccess = (e) => {
      const cursor = e.target.result;
      if (cursor) {
        result[cursor.key] = cursor.value;
        cursor.continue();
      } else {
        resolve(result);
      }
    };
    req.onerror = () => reject(req.error);
  });
}
