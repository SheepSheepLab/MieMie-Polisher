import {POLISHER_PRODUCT} from './product-identity.js';
import {createPolisherNativeLauncher} from './native-launcher.js';
// Optional cooperative launcher protocol v1. No Hub code or polling is needed.
// A retained standalone button delegates to Hub, never a second business instance.
export function createPolisherDualMode({host, frame, manifest, factory, icon, launcherStyles='', keepStandalone = false, onError = error => console.warn('['+POLISHER_PRODUCT.englishName+']', error)}) {
  const marker = '__MieMiePolisherSource';
  const previousSource = host[marker];
  if (previousSource && !previousSource.disposed) {
    onError(Error('检测到重复的'+POLISHER_PRODUCT.launcherName+'脚本；请只启用一个安装实例。'));
    return {ready: Promise.resolve(false), settled: () => Promise.resolve(), dispose: () => Promise.resolve()};
  }
  const doc = host.document;
  let disposed = false, queue = previousSource?.settled?.() || Promise.resolve(), attached = null, standalone = null, native = null, shortcutSupported = false;
  let mode = 'starting';
  let handoff = null; // Page-only credentials remain private to this adapter.
  function report(error) { try { onError(error); } catch (_) {} }
  function currentHub() {
    const hub = host.__MieMieHub;
    return hub?.apiVersion === 1 && typeof hub.extensions?.provide === 'function' ? hub : null;
  }
  function removeButton() {native?.dispose();native=null;}
  function capture(instance) { if (!disposed) handoff = instance?.captureSession?.() || null; }
  function restore(instance) { if (handoff && !disposed) {instance?.restoreSession?.(handoff); handoff = null;} }
  function launcher(open) {return native ||= createPolisherNativeLauncher({host,icon,styles:launcherStyles,open,onError:report});}
  async function stopStandalone() {
    const session = standalone; standalone = null; removeButton();
    if (!session) return;
    capture(session.instance);
    session.controller.abort();
    try { await session.instance?.deactivate?.(); } catch (error) { report(error); }
    for (const fn of session.cleanups.splice(0).reverse()) try { await fn(); } catch (error) { report(error); }
  }
  async function startStandalone() {
    if (disposed || standalone || currentHub()) return;
    const controller = new AbortController(), cleanups = [];
    const session = {controller, cleanups, instance: null, panel: null}; standalone = session;
    const active = () => !disposed && standalone === session && !controller.signal.aborted;
    const hide = () => { if (session.panel) {session.panel.hidden = true; session.panel.inert = true;} };
    const api = Object.freeze({
      manifest, signal: controller.signal,
      onCleanup(fn) { if (typeof fn !== 'function') throw Error('清理回调必须是函数。'); cleanups.push(fn); return fn; },
      guard(fn) { return function (...args) { if (!active()) return; try { const result = fn.apply(this, args); return result?.then ? result.catch(report) : result; } catch (error) { report(error); } }; },
      attachPanel(panel) {
        if (!active() || session.panel || panel?.ownerDocument !== doc || !panel.isConnected) throw Error('润色面板挂载失败。');
        session.panel = panel; hide();
        const back = panel.querySelector('.mm-return');
        if (back) { back.textContent = '收起'; back.onclick = () => api.closePanel(); cleanups.push(() => {back.onclick = null;}); }
        const key = event => { if (event.key === 'Escape' && !panel.hidden) api.closePanel(); };
        doc.addEventListener('keydown', key); cleanups.push(() => doc.removeEventListener('keydown', key));
        return true;
      },
      showPanel() { if (!active() || !session.panel) return false; return native?.show(session.panel) ?? false; },
      closePanel() {if(!active()||!session.panel)return false;return native?.close(session.panel) ?? false;},
      showMessage(text) { if (!active()) return false; report(String(text)); return true; },
    });
    try {
      session.instance = factory(api); await session.instance.activate?.();
      if (!active()) return;
      restore(session.instance);
      mode = 'standalone'; launcher(() => session.instance.open?.());
    } catch (error) { await stopStandalone(); mode = 'error'; report(error); }
  }
  async function detachHub() {
    const previous = attached; attached = null; removeButton();
    if (!previous) return;
    await previous.lease.ready;
    await previous.lease.release?.();
    // Modern Hub resolves after full runtime cleanup. The final cleanup callback
    // below also covers older versions whose disposed event fires early.
    if (previous.hub.whenDisposed && host.__MieMieHub !== previous.hub) await previous.hub.whenDisposed;
    await Promise.all([...previous.sessions].map(session => session.finished));
  }
  async function attachHub(hub) {
    await stopStandalone();
    if (disposed || currentHub() !== hub) return;
    const connection = {hub, sessions: new Set(), lease: null};
    function trackedFactory(api) {
      let complete, instance;
      const session = {finished: new Promise(resolve => { complete = resolve; })}; connection.sessions.add(session);
      // This listener precedes the business resource abort listener, so it can
      // capture a page-only key before the old panel is removed.
      const abort = () => capture(instance);
      api.signal.addEventListener('abort', abort, {once: true});
      // Registered first, therefore called last by the Runtime's LIFO cleanup.
      api.onCleanup(() => {api.signal.removeEventListener('abort', abort); connection.sessions.delete(session); complete();});
      instance = factory(api);
      return {...instance, async activate() {
        await instance.activate?.();
        if (!api.signal.aborted) {
          restore(instance);
          shortcutSupported=typeof api.registerShortcutLauncher==='function';
          if(shortcutSupported)api.registerShortcutLauncher({mount:({open})=>createPolisherNativeLauncher({host,icon,styles:launcherStyles,mode:'shortcut',open,onError:report})});
        }
      }};
    }
    const lease = hub.extensions.provide(manifest, trackedFactory);
    if (!lease.ok) {mode = 'error'; throw Error(lease.error || 'Hub 注册失败。');}
    connection.lease = lease; attached = connection; mode = 'hub';
    await lease.ready;
    if (!disposed && attached === connection && currentHub() === hub && keepStandalone && !shortcutSupported) launcher(async () => {
      const result = await hub.extensions.open(manifest.id);
      if (result?.ok === false) throw Error(result.error || '扩展未启用，无法打开。');
    });
  }
  async function reconcile() {
    if (disposed) {await detachHub(); await stopStandalone(); mode = 'disposed'; return;}
    const hub = currentHub();
    if (attached && attached.hub !== hub) await detachHub();
    if (disposed) return;
    if (currentHub()) {
      if (!attached) await attachHub(currentHub());
    } else if (!standalone) await startStandalone();
  }
  function schedule() { queue = queue.then(reconcile, reconcile).catch(error => {mode = 'error'; report(error);}); return queue; }
  const ready = () => {void schedule();};
  const gone = event => { if (!attached || event.detail === attached.hub) void schedule(); };
  function dispose() {
    if (disposed) return queue;
    disposed = true; handoff = null; removeButton(); standalone?.controller.abort();
    host.removeEventListener('miemie:hub-ready', ready); host.removeEventListener('miemie:hub-disposed', gone);
    frame.removeEventListener('pagehide', dispose); frame.removeEventListener('unload', dispose);
    return schedule().finally(() => {if (host[marker] === source) delete host[marker];});
  }
  const source = {get mode() {return mode;}, get disposed() {return disposed;}, dispose, settled: () => queue};
  host[marker] = source;
  host.addEventListener('miemie:hub-ready', ready); host.addEventListener('miemie:hub-disposed', gone);
  frame.addEventListener('pagehide', dispose, {once: true}); frame.addEventListener('unload', dispose, {once: true});
  source.ready = schedule();
  return source;
}
