/**
 * PersistenceService
 * Stores project state in IndexedDB so local images and uploaded files can
 * survive a reload without blocking localStorage quotas.
 */
window.CanvasApp = window.CanvasApp || {};

window.CanvasApp.PersistenceService = class PersistenceService {
  constructor(dbName = 'creaweb-projects', storeName = 'projects') {
    this.dbName = dbName;
    this.storeName = storeName;
  }

  async open() {
    return new Promise((resolve, reject) => {
      const request = indexedDB.open(this.dbName, 1);
      request.onupgradeneeded = () => {
        if (!request.result.objectStoreNames.contains(this.storeName)) {
          request.result.createObjectStore(this.storeName);
        }
      };
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
  }

  async save(key, snapshot, pendingAssets = []) {
    const db = await this.open();
    const tx = db.transaction(this.storeName, 'readwrite');
    const store = tx.objectStore(this.storeName);

    for (const asset of pendingAssets) {
      store.put(asset.blob, `asset:${asset.key}`);
    }
    store.put(snapshot, key);

    await new Promise((resolve, reject) => {
      tx.oncomplete = resolve;
      tx.onerror = () => reject(tx.error);
      tx.onabort = () => reject(tx.error);
    });
  }

  async load(key) {
    const db = await this.open();
    const tx = db.transaction(this.storeName, 'readonly');
    const store = tx.objectStore(this.storeName);
    const snapshot = await new Promise((resolve, reject) => {
      const request = store.get(key);
      request.onsuccess = () => resolve(request.result || null);
      request.onerror = () => reject(request.error);
    });

    if (!snapshot) return null;
    const storedUrls = [];
    const visit = value => {
      if (!value || typeof value !== 'object') return;
      if (typeof value.src === 'string' && value.src.startsWith('asset:')) {
        storedUrls.push(value.src);
      }
      Object.values(value).forEach(visit);
    };
    visit(snapshot);

    await Promise.all([...new Set(storedUrls)].map(async assetUrl => {
      const key = assetUrl.substring('asset:'.length);
      const blob = await new Promise((resolve, reject) => {
        const request = store.get(`asset:${key}`);
        request.onsuccess = () => resolve(request.result || null);
        request.onerror = () => reject(request.error);
      });
      if (!blob) return;
      snapshot.elements.forEach(element => {
        if (element.src === assetUrl) element.src = URL.createObjectURL(blob);
      });
    }));

    return snapshot;
  }
};
