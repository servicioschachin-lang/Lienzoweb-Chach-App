/**
 * MediaLibraryService
 * Keeps uploaded media in IndexedDB so it can be reused across projects and reloads.
 */
window.CanvasApp = window.CanvasApp || {};

window.CanvasApp.MediaLibraryService = class MediaLibraryService {
  constructor(dbName = 'creaweb-media-library', storeName = 'assets') {
    this.dbName = dbName;
    this.storeName = storeName;
  }

  open() {
    return new Promise((resolve, reject) => {
      const request = indexedDB.open(this.dbName, 1);
      request.onupgradeneeded = () => {
        if (!request.result.objectStoreNames.contains(this.storeName)) {
          request.result.createObjectStore(this.storeName, { keyPath: 'id' });
        }
      };
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
  }

  async add(file, { name = file.name, type } = {}) {
    const db = await this.open();
    const asset = {
      id: crypto.randomUUID ? crypto.randomUUID() : `${Date.now()}-${Math.random().toString(36).slice(2)}`,
      name: name || 'Archivo multimedia',
      type: type || this.getType(file),
      mimeType: file.type || '',
      size: file.size || 0,
      createdAt: Date.now(),
      blob: file
    };

    await new Promise((resolve, reject) => {
      const tx = db.transaction(this.storeName, 'readwrite');
      tx.objectStore(this.storeName).put(asset);
      tx.oncomplete = resolve;
      tx.onerror = () => reject(tx.error);
      tx.onabort = () => reject(tx.error);
    });
    window.dispatchEvent(new CustomEvent('media-library:changed'));
    return asset;
  }

  async list() {
    const db = await this.open();
    return new Promise((resolve, reject) => {
      const request = db.transaction(this.storeName, 'readonly').objectStore(this.storeName).getAll();
      request.onsuccess = () => resolve((request.result || []).sort((a, b) => b.createdAt - a.createdAt));
      request.onerror = () => reject(request.error);
    });
  }

  async get(id) {
    const db = await this.open();
    return new Promise((resolve, reject) => {
      const request = db.transaction(this.storeName, 'readonly').objectStore(this.storeName).get(id);
      request.onsuccess = () => resolve(request.result || null);
      request.onerror = () => reject(request.error);
    });
  }

  async remove(id) {
    const db = await this.open();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(this.storeName, 'readwrite');
      tx.objectStore(this.storeName).delete(id);
      tx.oncomplete = resolve;
      tx.onerror = () => reject(tx.error);
      tx.onabort = () => reject(tx.error);
    });
  }

  getType(file) {
    if (file.type?.startsWith('image/')) return 'image';
    if (file.type?.startsWith('audio/')) return 'audio';
    if (file.type?.startsWith('video/')) return 'video';
    return 'file';
  }
};
