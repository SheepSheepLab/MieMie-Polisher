// This local script supplies code only. Hub still owns register/enable/uninstall.
// Both startup orders work without polling or remote loading.
const extensionHost = window.parent;
let sourceLease = null, attachedHub = null, sourceDisposed = false;
function connectPolisher() {
  const hub = extensionHost.__MieMieHub;
  if (sourceDisposed || !hub?.extensions.provide || hub === attachedHub) return;
  const result = hub.extensions.provide(POLISHER_MANIFEST, createPolisherExtension);
  if (result.ok) { sourceLease = result; attachedHub = hub; }
  else console.warn('[MieMie Polisher]', result.error);
}
function disconnectPolisher(event) {
  if (event?.detail !== attachedHub) return;
  sourceLease = null; attachedHub = null;
}
extensionHost.addEventListener('miemie:hub-ready', connectPolisher);
extensionHost.addEventListener('miemie:hub-disposed', disconnectPolisher);
connectPolisher();
function disposePolisherSource() {
  if (sourceDisposed) return;
  sourceDisposed = true;
  extensionHost.removeEventListener('miemie:hub-ready', connectPolisher);
  extensionHost.removeEventListener('miemie:hub-disposed', disconnectPolisher);
  void sourceLease?.release(); sourceLease = null; attachedHub = null;
}
window.addEventListener('pagehide', disposePolisherSource, {once: true});
window.addEventListener('unload', disposePolisherSource, {once: true});
