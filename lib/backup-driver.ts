// lib/backup-driver.ts — Acesso direto ao IndexedDB para operações de backup
// Não passa pelas regras de negócio (que bloqueiam delete/create de parcelas)

const DB_NAME = 'sistema-cobrancas-db';
const STORES = ['clientes', 'produtos_servicos', 'cobrancas', 'parcelas', 'configuracoes'] as const;

let dbPromise: Promise<IDBDatabase> | null = null;

function getDB(): Promise<IDBDatabase> {
  if (!dbPromise) {
    dbPromise = new Promise((resolve, reject) => {
      const request = indexedDB.open(DB_NAME, 1);
      request.onupgradeneeded = () => {
        const db = request.result;
        for (const store of STORES) {
          if (!db.objectStoreNames.contains(store)) {
            db.createObjectStore(store, { keyPath: 'id' });
          }
        }
      };
      request.onsuccess = () => {
        const db = request.result;
        db.onversionchange = () => { db.close(); dbPromise = null; };
        resolve(db);
      };
      request.onerror = () => { dbPromise = null; reject(request.error); };
    });
  }
  return dbPromise;
}

/**
 * Limpa todos os object stores — remove todos os registros.
 */
export async function clearAllStores(): Promise<void> {
  const db = await getDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction([...STORES], 'readwrite');
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
    tx.onabort = () => reject(tx.error);
    for (const store of STORES) {
      tx.objectStore(store).clear();
    }
  });
}

/**
 * Faz put de um registro preservando o ID original.
 */
export async function putRecord(storeName: string, record: any): Promise<void> {
  const db = await getDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(storeName, 'readwrite');
    const req = tx.objectStore(storeName).put(record);
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
    tx.onabort = () => reject(tx.error);
    void req; // mark as used
  });
}
