const DB_NAME = 'TarpuYachayDB';
const DB_VERSION = 1;
const STORE = 'seeds';
let db;

// Abrir BD
function openDB() {
  if (db) return Promise.resolve(db);
  return new Promise((res, rej) => {
    const req = indexedDB.open(DB_NAME, DB_VERSION);
    req.onupgradeneeded = () => {
      req.result.createObjectStore(STORE, { keyPath: 'id' });
    };
    req.onsuccess = () => { db = req.result; res(db); };
    req.onerror = () => rej(req.error);
  });
}

// Obtener todas las semillas
function getAllSeeds() {
  return openDB().then(database => new Promise((res, rej) => {
    const tx = database.transaction(STORE, 'readonly');
    const store = tx.objectStore(STORE);
    const r = store.getAll();
    r.onsuccess = () => res(r.result);
    r.onerror = () => rej(r.error);
  }));
}

// Añadir semilla
function addSeed(seed) {
  return openDB().then(database => new Promise((res, rej) => {
    const tx = database.transaction(STORE, 'readwrite');
    tx.objectStore(STORE).add(seed);
    tx.oncomplete = () => res();
    tx.onerror = () => rej(tx.error);
  }));
}

// Actualizar semilla
function updateSeed(storeObj) {
  return openDB().then(database => new Promise((res, rej) => {
    const tx = database.transaction(STORE, 'readwrite');
    tx.objectStore(STORE).put(storeObj);
    tx.oncomplete = () => res();
    tx.onerror = () => rej(tx.error);
  }));
}

// Eliminar semilla
function deleteSeed(id) {
  return openDB().then(database => new Promise((res, rej) => {
    const tx = database.transaction(STORE, 'readwrite');
    tx.objectStore(STORE).delete(id);
    tx.oncomplete = () => res();
    tx.onerror = () => rej(tx.error);
  }));
}

// Exponer globalmente
window.db = { getAllSeeds, addSeed, updateSeed, deleteSeed };
