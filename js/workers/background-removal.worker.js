let remover;
let packageModule;
let currentRequestId = null;

async function ensureRemover(moduleUrl, requestId) {
  if (!packageModule) packageModule = await import(moduleUrl);
  if (!remover) {
    const { RemoveBackground } = packageModule;
    remover = new RemoveBackground({
      device: 'wasm',
      onProgress: info => self.postMessage({ type: 'progress', requestId: currentRequestId, info })
    });
  }
  await remover.load();
}

self.addEventListener('message', async event => {
  const { type, requestId, moduleUrl, imageDataUrl } = event.data || {};
  currentRequestId = requestId;

  try {
    if (type === 'load') {
      await ensureRemover(moduleUrl, requestId);
      self.postMessage({ type: 'loaded', requestId });
      return;
    }

    if (type === 'remove') {
      await ensureRemover(moduleUrl, requestId);
      const png = await remover.remove(imageDataUrl);
      self.postMessage({ type: 'result', requestId, png });
    }
  } catch (error) {
    self.postMessage({
      type: 'error',
      requestId,
      message: error instanceof Error ? error.message : String(error)
    });
  } finally {
    currentRequestId = null;
  }
});
