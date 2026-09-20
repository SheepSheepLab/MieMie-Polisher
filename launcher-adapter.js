// Optional cooperative launcher protocol v1. No Hub code or polling is needed.
// A retained standalone button delegates to Hub, never a second business instance.
export function createPolisherDualMode({host, frame, manifest, factory, icon, keepStandalone = false, onError = error => console.warn('[MieMie Polisher]', error)}) {
  const marker = '__MieMiePolisherSource';
  const previousSource = host[marker];
  if (previousSource && !previousSource.disposed) {
    onError(Error('检测到重复的咩咩润色脚本；请只启用一个安装实例。'));
    return {ready: Promise.resolve(false), settled: () => Promise.resolve(), dispose: () => Promise.resolve()};
  }
  const doc = host.document;
  let disposed = false, queue = previousSource?.settled?.() || Promise.resolve(), attached = null, standalone = null, button = null, style = null;
  let mode = 'starting';
  let handoff = null; // Page-only credentials remain private to this adapter.
  function report(error) { try { onError(error); } catch (_) {} }
  function currentHub() {
    const hub = host.__MieMieHub;
    return hub?.apiVersion === 1 && typeof hub.extensions?.provide === 'function' ? hub : null;
  }
  function removeButton() { if (button) button.onclick = null; button?.remove(); style?.remove(); button = style = null; }
  function capture(instance) { if (!disposed) handoff = instance?.captureSession?.() || null; }
  function restore(instance) { if (handoff && !disposed) {instance?.restoreSession?.(handoff); handoff = null;} }
  function launcher(open) {
    if (button) { button.onclick = () => void Promise.resolve().then(open).catch(report); return; }
    style = doc.createElement('style');
    style.textContent = '[data-miemie-polisher-standalone]{position:fixed;right:18px;bottom:26px;width:64px;height:64px;display:grid;place-items:center;box-sizing:border-box;overflow:hidden;border-radius:50%;border:1px solid #da72b4;background:#201332;box-shadow:0 4px 16px #0009,0 0 12px #da72b444;padding:0;cursor:pointer;z-index:9999;color:#fff;font-size:28px;transition:transform .16s,box-shadow .16s}[data-miemie-polisher-standalone]:hover{transform:translateY(-2px);box-shadow:0 6px 20px #000a,0 0 18px #da72b466}[data-miemie-polisher-standalone]:focus-visible{outline:2px solid #ffd0ee;outline-offset:3px}[data-miemie-polisher-standalone] img{width:100%;height:100%;object-fit:cover;border-radius:50%;pointer-events:none}';
    button = doc.createElement('button'); button.type = 'button'; button.dataset.miemiePolisherStandalone = '';
    button.title = manifest.name; button.setAttribute('aria-label', '打开' + manifest.name);
    const img = doc.createElement('img'); img.src = icon; img.alt = ''; img.draggable = false;
    img.onerror = () => { img.remove(); if (button) button.textContent = '🪶'; };
    button.appendChild(img); button.onclick = () => void Promise.resolve().then(open).catch(report);
    (doc.head || doc.documentElement).appendChild(style); (doc.body || doc.documentElement).appendChild(button);
  }
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
        if (back) { back.textContent = '收起'; back.onclick = hide; cleanups.push(() => {back.onclick = null;}); }
        const key = event => { if (event.key === 'Escape' && !panel.hidden) hide(); };
        doc.addEventListener('keydown', key); cleanups.push(() => doc.removeEventListener('keydown', key));
        return true;
      },
      showPanel() { if (!active() || !session.panel) return false; session.panel.hidden = false; session.panel.inert = false; return true; },
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
      return {...instance, async activate() {await instance.activate?.(); if (!api.signal.aborted) restore(instance);}};
    }
    const lease = hub.extensions.provide(manifest, trackedFactory);
    if (!lease.ok) {mode = 'error'; throw Error(lease.error || 'Hub 注册失败。');}
    connection.lease = lease; attached = connection; mode = 'hub';
    await lease.ready;
    if (!disposed && attached === connection && currentHub() === hub && keepStandalone) launcher(async () => {
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
