// Keep the forwarding closure outside the tool's activation scope. A later
// third-party wrapper may retain it; after disposal it must retain no tool state.
export function installPolisherFetchHook(host, handler, previous = host.fetch) {
  const link = {handler, previous};
  handler = null;
  function forward(input, init) { return (link.handler || link.previous).call(host, input, init); }
  host.fetch = forward;
  return () => { link.handler = null; if (host.fetch === forward) host.fetch = previous; };
}

// Extension-local lifetime helpers. No settings or host generation are owned here.
export function createPolisherResources(api, host) {
  let closed = false, completion;
  const cleanups = [], timers = new Map();
  function add(fn) { if (closed) void Promise.resolve().then(fn).catch(error => console.warn('[MieMie Polisher]', error)); else cleanups.push(fn); return fn; }
  function dispose() {
    if (closed) return completion;
    closed = true;
    const errors = [], pending = [];
    for (const fn of cleanups.splice(0).reverse()) try { pending.push(Promise.resolve(fn()).catch(e => errors.push(e))); } catch (e) { errors.push(e); }
    for (const [id, clear] of timers) clear(id);
    timers.clear();
    completion = Promise.all(pending).then(() => { if (errors.length) throw new AggregateError(errors, '润色扩展清理失败'); });
    return completion;
  }
  // Abort immediately, including while open/activation is still queued.
  const abort = () => { void dispose()?.catch(e => console.warn('[MieMie Polisher]', e)); };
  api.signal.addEventListener('abort', abort, {once: true});
  add(() => api.signal.removeEventListener('abort', abort));
  api.onCleanup(dispose);
  function guard(fn) {
    const fault = api.guard(error => { throw error; });
    return function (...args) {
      if (closed || api.signal.aborted) return;
      try {
        const result = fn.apply(this, args);
        return result?.then ? result.catch(fault) : result;
      } catch (error) { return fault(error); }
    };
  }
  function listen(target, name, fn, options) {
    if (!target?.addEventListener || closed) return;
    const callback = guard(fn);
    target.addEventListener(name, callback, options);
    add(() => target.removeEventListener(name, callback, options));
  }
  function wait(promise, signal) {
    return new Promise((resolve, reject) => {
      const signals = [api.signal, signal].filter(Boolean);
      const finish = (fn, value) => { for (const s of signals) s.removeEventListener('abort', cancel); fn(value); };
      const cancel = () => finish(reject, new Error('扩展已停用或请求已取消。'));
      Promise.resolve(promise).then(value => finish(resolve, value), error => finish(reject, error));
      for (const s of signals) s.addEventListener('abort', cancel, {once: true});
      if (closed || signals.some(s => s.aborted)) cancel();
    });
  }
  function timeout(fn, delay) {
    if (closed) return null;
    const id = host.setTimeout(guard(() => {timers.delete(id); fn();}), delay);
    timers.set(id, host.clearTimeout.bind(host)); return id;
  }
  function interval(fn, delay) {
    if (closed) return null;
    const id = host.setInterval(guard(fn), delay);
    timers.set(id, host.clearInterval.bind(host)); return id;
  }
  function clear(id) { timers.get(id)?.(id); timers.delete(id); }
  return {add, dispose, guard, listen, wait, timeout, interval, clear};
}
