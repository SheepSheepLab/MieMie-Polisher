// SPDX-License-Identifier: GPL-3.0-or-later
// Extension-owned API2 presentation bridge. Business state stays in one factory.
export function createAPI2NativeBridge(api, {createLauncher, onError}) {
  let panel = null, native = null, nativeLease = null, instance = null;
  const live = () => !api.signal.aborted;
  const nativeCurrent = lease => live() && lease === nativeLease && lease?.isCurrent() === true;
  function release() {
    nativeLease = null;
    native?.release(); // Synchronous: revoke animations/gestures before returning ownership.
  }
  const facade = Object.freeze({...api,
    attachPanel(value, presentation) {
      const result = api.attachPanel(value, presentation);
      if (result !== false) panel = value;
      return result;
    },
    showPanel(lease) {
      if (nativeCurrent(lease)) return native?.show(panel, () => nativeCurrent(lease)) ?? false;
      return api.showPanel(lease);
    },
    closePanel(lease) {
      if (nativeCurrent(lease)) return native?.close(panel, () => nativeCurrent(lease)) ?? false;
      return api.closePanel(lease);
    },
  });
  api.onCleanup(() => {release(); native?.dispose(); native = null; instance = null;});
  let stopKeys=()=>{};
  api.onCleanup(()=>stopKeys());
  return {api: facade,
    register(value) {
      instance = value;
      if (!live()) return false;
      const doc=panel?.ownerDocument;
      const key=event=>{
        const lease=nativeLease;
        if(event.key!=='Escape'||event.defaultPrevented||event.isComposing||event.keyCode===229||!nativeCurrent(lease))return;
        const origin=native?.getOrigin(),path=event.composedPath();
        if(!path.includes(panel)&&!path.includes(origin)&&!panel.contains(doc.activeElement))return;
        if(panel.querySelector('dialog[open]'))return;
        event.preventDefault();
        if(!event.repeat)void Promise.resolve(facade.closePanel(lease)).catch(onError);
      };
      doc?.addEventListener('keydown',key);
      stopKeys=()=>doc?.removeEventListener('keydown',key);
      return api.registerNativeWindow({
        mount({open, signal}) {
          if (!live() || signal.aborted) throw Error('Native mount is no longer current.');
          const handle = createLauncher(() => live() && !signal.aborted ? open() : false);
          native = handle;
          return {getOrigin: handle.getOrigin, dispose() {
            if (native === handle) {release(); native = null;}
            handle.dispose();
          }};
        },
        open(lease) {
          if (!live() || !lease.isCurrent() || !native) return;
          // Core restores the pre-Surface root, which can initially be visible.
          // A new Native lease must establish its own placement before showing.
          if(nativeLease !== lease && panel){panel.hidden=true;panel.inert=true;}
          nativeLease = lease;
          // open remains synchronous; the product owns its guarded animation task.
          try {void Promise.resolve(instance.open(lease)).catch(onError);} catch (error) {onError(error);}
        },
        release(lease) {
          if (nativeLease && nativeLease !== lease) return;
          release();
        },
      });
    },
  };
}
