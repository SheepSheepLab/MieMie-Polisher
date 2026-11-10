// Copyright (C) 2026 SheepSheepLab
// Launcher gestures aligned with MieMie Preset Manager.
// Adapted from MieMie Polisher 1.2.1
// (commit 5a0a5cf9f4ac7cf5dbb9dac0134d307ad1caa9d1).
// SPDX-License-Identifier: GPL-3.0-or-later
import { createNativeFloatingPresentation } from './native-floating-presentation.js';
import { raiseNativeWindow, releaseNativeWindow } from './window-layer.js';
import { POLISHER_PRODUCT } from './product-identity.js';
import { createLauncherAppearance, LAUNCHER_HOLD_MS } from './launcher-settings.js';
const clamp = (value, min, max) => Math.max(min, Math.min(max, value));
const peekDistance = (size) => Math.min(12, size * .18);
const returnMotion = { duration: 240, easing: 'cubic-bezier(.18,.76,.25,1)' };
let pullSequence = 0;
export function createPolisherNativeLauncher({ host, icon, styles = '', mode = 'standalone', appearance = createLauncherAppearance(host), open, requestBack, onError = () => { } }) {
    const doc = host.document, style = doc.createElement('style'), orb = doc.createElement('button');
    style.textContent = styles;
    orb.type = 'button';
    if (mode === 'standalone')
        orb.dataset.miemiePolisherStandalone = '';
    orb.dataset.miemiePolisherNative = '';
    orb.dataset.miemiePolisherMode = mode;
    orb.title = POLISHER_PRODUCT.launcherName;
    orb.setAttribute('aria-label', `打开${POLISHER_PRODUCT.name}`);
    const image = doc.createElement('img');
    image.alt = '';
    image.draggable = false;
    const imageFailed = () => {
        if (disposed || image.parentElement !== orb)
            return;
        image.remove();
        orb.textContent = '🪶';
    };
    image.addEventListener('error', imageFailed, { once: true });
    image.src = icon;
    orb.append(image);
    (doc.head || doc.documentElement).append(style);
    // Use the same stacking context as the product's native window on narrow screens.
    (doc.documentElement || doc.body).append(orb);
    let pullArt = null;
    function preparePull(gesture) {
        if (!pullArt) {
            const shape = doc.createElementNS('http://www.w3.org/2000/svg', 'svg');
            const wash = `mm-mp-pull-wash-${++pullSequence}`;
            shape.setAttribute('data-polisher-pull', '');
            shape.setAttribute('aria-hidden', 'true');
            shape.setAttribute('hidden', '');
            shape.innerHTML = `<defs><linearGradient id="${wash}" y1="0" y2="0">
        <stop offset="0" stop-color="#a45a92" stop-opacity=".04"/>
        <stop offset=".62" stop-color="#c47eae" stop-opacity=".17"/>
        <stop offset="1" stop-color="#f4bce2" stop-opacity=".38"/>
        </linearGradient></defs><path fill="url(#${wash})"/>`;
            pullArt = { shape, gradient: shape.querySelector('linearGradient'), curve: shape.querySelector('path') };
            orb.before(shape);
        }
        const { left, top, width, height } = gesture.view, { direction } = gesture;
        Object.assign(pullArt.shape.style, { left: `${left}px`, top: `${top}px`, width: `${width}px`, height: `${height}px`, transformOrigin: direction === 1 ? 'left center' : 'right center' });
        pullArt.gradient.setAttribute('x1', direction === 1 ? '0%' : '100%');
        pullArt.gradient.setAttribute('x2', direction === 1 ? '100%' : '0%');
    }
    let dock = { side: 'right', ratio: .6 };
    let drag = null, suppress = false, disposed = false, queue = Promise.resolve();
    let pullReturn = null, orbReturn = null, peekTimer = 0;
    let pending = null, activePanel = null, followFrame = 0;
    const raf = host.requestAnimationFrame?.bind(host) || ((fn) => host.setTimeout(fn, 16));
    const caf = host.cancelAnimationFrame?.bind(host) || host.clearTimeout.bind(host);
    const presentation = createNativeFloatingPresentation({ host, orb, bounds });
    let epoch = 0, ownedPanel = null, savedStyles = [];
    const ownedFields = ['position', 'left', 'top', 'right', 'bottom', 'transform', 'width', 'height', 'max-height', 'transform-origin'];
    function retain(panel) { if (ownedPanel === panel)
        return; ownedPanel = panel; savedStyles = ownedFields.map(k => [k, panel.style.getPropertyValue?.(k) || '', panel.style.getPropertyPriority?.(k) || '']); }
    function release() {
        ++epoch;
        pending = null;
        queue = Promise.resolve();
        resetGesture();
        presentation.release();
        if (followFrame)
            caf(followFrame);
        followFrame = 0;
        if (ownedPanel) {
            ownedPanel.hidden = true;
            ownedPanel.inert = true;
            ownedPanel.dataset.surfaceState = 'closed';
            releaseNativeWindow(ownedPanel,orb);
            for (const [k, v, p] of savedStyles) {
                if (v)
                    ownedPanel.style.setProperty(k, v, p);
                else
                    ownedPanel.style.removeProperty(k);
            }
        }
        ownedPanel = null;
        savedStyles = [];
        activePanel = null;
        place();
    }
    try {
        const value = JSON.parse(host.localStorage.getItem('miemie_polisher_dock_v1') || 'null');
        if (['left', 'right'].includes(value?.side) && Number.isFinite(value.ratio))
            dock = { side: value.side, ratio: Math.max(0, Math.min(1, value.ratio)) };
    }
    catch { /* Storage may be unavailable; Dock remains page-local. */ }
    function viewport() {
        const v = host.visualViewport;
        return { left: v?.offsetLeft ?? 0, top: v?.offsetTop ?? 0, width: v?.width || host.innerWidth, height: v?.height || host.innerHeight };
    }
    function bounds() {
        const { left: x, top: y, width, height } = viewport(), css = host.getComputedStyle(orb);
        const safe = (side) => Math.max(10, parseFloat(css.getPropertyValue(`--mp-safe-${side}`)) || 0);
        const left = x + safe('left'), top = y + safe('top');
        const size = Math.max(1, Math.min(64 * appearance.get().size / 100, width - safe('left') - safe('right'), height - safe('top') - safe('bottom')));
        return { left, top, size, right: Math.max(left, x + width - safe('right') - size), bottom: Math.max(top, y + height - safe('bottom') - size) };
    }
    function dockPosition(b, tucked) {
        const v = viewport(), leftSide = dock.side === 'left';
        const left = tucked ? v.left + (leftSide ? 0 : v.width) - b.size / 2 : leftSide ? b.left : b.right;
        return { left, top: b.top + dock.ratio * (b.bottom - b.top) };
    }
    function place() {
        const b = bounds(), tucked = appearance.get().tucked;
        const expanded = tucked && activePanel !== null;
        const { left, top } = dockPosition(b, tucked && !expanded);
        Object.assign(orb.style, { position: 'fixed', transform: 'none', width: `${b.size}px`, height: `${b.size}px`, left: `${left}px`, top: `${top}px` });
        orb.style.setProperty('--mp-peek', `${peekDistance(b.size) * (dock.side === 'left' ? 1 : -1)}px`);
        paintOrbState(tucked, expanded);
    }
    function paintOrbState(tucked = appearance.get().tucked, expanded = tucked && activePanel !== null) {
        orb.title = activePanel ? '点击关闭润色工具' : tucked ? '潜航模式 · 向内拉开 / 长按换位' : POLISHER_PRODUCT.launcherName;
        orb.setAttribute('aria-label', `${activePanel ? '关闭' : '打开'}${POLISHER_PRODUCT.name}`);
        if (tucked) {
            orb.dataset.mpTucked = '';
            if (expanded) {
                orb.dataset.mpExpanded = '';
                orb.removeAttribute('aria-description');
            }
            else {
                delete orb.dataset.mpExpanded;
                orb.setAttribute('aria-description', `向屏幕中央拉，亮起后松手打开。原地长按 ${LAUNCHER_HOLD_MS / 1000} 秒后可拖动换位。`);
            }
        }
        else if (orb.dataset.mpTucked !== undefined) {
            delete orb.dataset.mpTucked;
            delete orb.dataset.mpExpanded;
            orb.removeAttribute('aria-description');
        }
    }
    function follow() { if (!followFrame)
        followFrame = raf(() => { followFrame = 0; presentation.follow(); }); }
    function settlePosition() { if (followFrame)
        caf(followFrame); followFrame = 0; presentation.follow(); }
    function cancelPointer() {
        const old = drag;
        drag = null;
        if (old) {
            host.clearTimeout(old.timer);
            try {
                orb.releasePointerCapture(old.id);
            }
            catch { /* Already released. */ }
        }
        delete orb.dataset.mpGesture;
        delete orb.dataset.mpReady;
    }
    function clearPeek() { host.clearTimeout(peekTimer); delete orb.dataset.mpPeek; }
    function cancelOrbReturn() {
        const animation = orbReturn;
        orbReturn = null;
        animation?.cancel();
    }
    function clearPull() {
        const animation = pullReturn;
        pullReturn = null;
        animation?.cancel();
        cancelOrbReturn();
        pullArt?.shape.setAttribute('hidden', '');
        pullArt?.shape.removeAttribute('data-ready');
    }
    function resetGesture() { cancelPointer(); clearPull(); clearPeek(); delete orb.dataset.mpHover; suppress = true; }
    function resize() { resetGesture(); presentation.cancel(); place(); presentation.follow(); }
    const unsubscribeAppearance = appearance.subscribe(() => {
        resetGesture();
        place();
        if (activePanel?.dataset.surfaceState === 'open') settlePosition();
    });
    function openFromOrb() { return Promise.resolve().then(() => !disposed && open()).catch(onError); }
    function moveTo(gesture, x, y) {
        gesture.leftNow = x;
        gesture.topNow = y;
        Object.assign(orb.style, { left: `${x}px`, top: `${y}px` });
        follow();
    }
    function moveGrabbed(gesture, x, y) {
        const v = gesture.view, radius = gesture.bounds.size / 2;
        moveTo(gesture, clamp(x, v.left, v.left + v.width) - radius, clamp(y, v.top, v.top + v.height) - radius);
    }
    function pullReady(gesture, e) {
        return (e.clientX - gesture.x) * gesture.direction >= Math.max(clamp(gesture.bounds.size * .34, 12, 28), Math.abs(e.clientY - gesture.y) * .8);
    }
    function drawPull(gesture, e) {
        const { shape, curve } = pullArt;
        const { left, top, width } = gesture.view, { direction } = gesture, { size } = gesture.bounds;
        const delta = (e.clientX - gesture.x) * direction;
        const x = gesture.left + clamp(gesture.peek + delta, 0, size / 2 + 10) * direction;
        const edge = direction === 1 ? 0 : width;
        const tipX = x + size / 2 - left, tipY = gesture.top + size / 2 - top;
        const span = size * .66 + Math.min(40, Math.abs(tipX - edge) * .48);
        // The arc follows the orb's center while its ends stay on the screen edge.
        curve.setAttribute('d', `M ${edge} ${tipY - span}
      C ${edge} ${tipY - span * .64} ${tipX} ${tipY - span * .56} ${tipX} ${tipY}
      C ${tipX} ${tipY + span * .56} ${edge} ${tipY + span * .64} ${edge} ${tipY + span}`);
        const ready = pullReady(gesture, e);
        shape.toggleAttribute('hidden', delta <= 0);
        shape.toggleAttribute('data-ready', ready);
        orb.toggleAttribute('data-mp-ready', ready);
        orb.style.left = `${x}px`;
    }
    function retract(gesture, ready) {
        const pull = pullArt.shape;
        if (pull.hasAttribute('hidden') || !pull.animate || host.matchMedia?.('(prefers-reduced-motion: reduce)').matches) {
            clearPull();
            return;
        }
        const animation = pullReturn = pull.animate([{ transform: 'scaleX(1)', opacity: 1 }, { transform: 'scaleX(0)', opacity: 0 }], { ...returnMotion, fill: 'forwards' });
        if (!ready) {
            const from = parseFloat(orb.style.left) - gesture.left;
            const to = orb.matches('[data-mp-hover], :focus-visible') ? peekDistance(gesture.bounds.size) * gesture.direction : 0;
            orbReturn = orb.animate([{ translate: `${from}px 0` }, { translate: `${to}px 0` }], returnMotion);
        }
        const finish = () => { if (pullReturn === animation)
            clearPull(); };
        void animation.finished.then(finish, finish);
    }
    function down(e) {
        if (disposed || drag || activePanel?.dataset.surfaceState === 'closing' || e.isPrimary === false || e.button !== 0)
            return;
        const b = bounds(), left = parseFloat(orb.style.left), top = parseFloat(orb.style.top), tucked = appearance.get().tucked && !activePanel;
        const direction = dock.side === 'left' ? 1 : -1;
        const peek = tucked && e.pointerType === 'mouse'
            ? clamp((orb.getBoundingClientRect().left - left) * direction, 0, peekDistance(b.size)) : 0;
        clearPull();
        clearPeek();
        if (e.pointerType !== 'mouse')
            delete orb.dataset.mpHover;
        const gesture = { id: e.pointerId, x: e.clientX, y: e.clientY, left, top, leftNow: left, topNow: top, bounds: b, moved: false,
            mode: tucked ? 'hold' : 'direct', view: viewport(), direction, peek, holdX: e.clientX, holdY: e.clientY };
        drag = gesture;
        suppress = false;
        try {
            orb.setPointerCapture(e.pointerId);
        }
        catch { /* Older hosts still dispatch document events. */ }
        if (tucked)
            gesture.timer = host.setTimeout(() => {
                if (drag !== gesture)
                    return;
                gesture.mode = 'grabbed';
                orb.dataset.mpGesture = 'grabbed';
                moveGrabbed(gesture, gesture.holdX, gesture.holdY);
            }, LAUNCHER_HOLD_MS);
    }
    function move(e) {
        if (!drag || drag.id !== e.pointerId)
            return;
        const gesture = drag, dx = e.clientX - gesture.x, dy = e.clientY - gesture.y, b = gesture.bounds;
        if (Math.hypot(dx, dy) > 7)
            gesture.moved = true;
        if (!gesture.moved && gesture.mode !== 'grabbed') {
            gesture.holdX = e.clientX;
            gesture.holdY = e.clientY;
            return;
        }
        e.preventDefault();
        if (gesture.mode === 'hold') {
            host.clearTimeout(gesture.timer);
            gesture.mode = 'pull';
            orb.dataset.mpGesture = 'pull';
            preparePull(gesture);
        }
        if (gesture.mode === 'pull')
            drawPull(gesture, e);
        else if (gesture.mode === 'grabbed')
            moveGrabbed(gesture, e.clientX, e.clientY);
        else
            moveTo(gesture, clamp(gesture.left + dx, b.left, b.right), clamp(gesture.top + dy, b.top, b.bottom));
    }
    function end(e) {
        if (!drag || drag.id !== e.pointerId)
            return;
        const old = drag;
        suppress = old.mode !== 'direct' || old.moved;
        cancelPointer();
        if (old.mode === 'pull') {
            const ready = pullReady(old, e);
            retract(old, ready);
            if (ready) {
                void openFromOrb().finally(() => { if (!disposed && !drag)
                    place(); });
                return;
            }
        }
        else if (old.mode === 'hold') {
            orb.dataset.mpPeek = '';
            peekTimer = host.setTimeout(clearPeek, 640);
        }
        else if (old.moved) {
            const b = old.bounds;
            dock = { side: old.leftNow + b.size / 2 < old.view.left + old.view.width / 2 ? 'left' : 'right', ratio: clamp((old.topNow - b.top) / Math.max(1, b.bottom - b.top), 0, 1) };
            try {
                host.localStorage.setItem('miemie_polisher_dock_v1', JSON.stringify(dock));
            }
            catch { /* Memory-only Dock fallback. */ }
        }
        if (suppress) {
            place();
            if (old.mode !== 'pull' && old.mode !== 'hold')
                settlePosition();
        }
    }
    function abort(e) { if (!drag || drag.id !== e.pointerId)
        return; resetGesture(); place(); settlePosition(); }
    function enter(e) { if (appearance.get().tucked && !activePanel && e.pointerType === 'mouse')
        orb.dataset.mpHover = ''; }
    function leave(e) { if (e.pointerType === 'mouse')
        delete orb.dataset.mpHover; }
    function contextMenu(e) { if (appearance.get().tucked)
        e.preventDefault(); }
    function click(e) {
        const tucked = appearance.get().tucked;
        if ((suppress || (tucked && !activePanel)) && (e.detail !== 0 || e.pointerType)) {
            suppress = false;
            e.preventDefault();
            return;
        }
        suppress = false;
        const state = activePanel?.dataset.surfaceState;
        if (e.isTrusted && state === 'closing')
            return;
        if (e.isTrusted && state === 'open' && requestBack) {
            void Promise.resolve().then(() => !disposed && requestBack()).catch(onError);
            return;
        }
        void openFromOrb();
    }
    const listeners = { pointerdown: down, pointermove: move, pointerup: end, pointercancel: abort, lostpointercapture: abort, pointerenter: enter, pointerleave: leave, contextmenu: contextMenu, click: click };
    for (const [name, fn] of Object.entries(listeners))
        orb.addEventListener(name, fn);
    for (const name of ['resize', 'orientationchange'])
        host.addEventListener(name, resize);
    host.visualViewport?.addEventListener('resize', resize);
    host.visualViewport?.addEventListener('scroll', resize);
    place();
    function transition(panel, opening, isCurrent = () => true) {
        const serial = epoch, valid = () => !disposed && serial === epoch && isCurrent();
        if (!valid() || !panel)
            return Promise.resolve(false);
        if (pending?.opening === opening)
            return pending.task;
        const task = queue.then(async () => {
            if (!valid())
                return false;
            if (opening && !panel.hidden) {
                // Focus requests must not displace an active editor or its selection.
                if (!doc.activeElement || !panel.contains(doc.activeElement))
                    panel.focus?.({ preventScroll: true });
                return true;
            }
            if (!opening && panel.hidden)
                return true;
            retain(panel);
            activePanel = panel;
            panel.hidden = false;
            panel.inert = true;
            panel.dataset.surfaceState = opening ? 'opening' : 'closing';
            if (opening) {
                cancelOrbReturn();
                clearPeek();
                delete orb.dataset.mpHover;
                if (appearance.get().tucked) place();
                else paintOrbState();
                raiseNativeWindow(panel,orb);
            }
            const returnDock = !opening && appearance.get().tucked ? dockPosition(bounds(), true) : undefined;
            if (returnDock) {
                resetGesture();
                if (followFrame)
                    caf(followFrame);
                followFrame = 0;
            }
            try {
                await presentation.run(panel, opening, returnDock);
            }
            catch (error) {
                presentation.cancel();
                onError(error);
            }
            if (!valid())
                return false;
            panel.hidden = !opening;
            panel.inert = !opening;
            panel.dataset.surfaceState = opening ? 'open' : 'closed';
            if (opening)
                panel.focus?.({ preventScroll: true });
            else {
                activePanel = null;
                presentation.release();
                releaseNativeWindow(panel,orb);
                place();
                orb.inert = false;
                orb.focus({ preventScroll: true });
            }
            return true;
        });
        queue = task.catch(onError);
        pending = { opening, task };
        void task.finally(() => { if (pending?.task === task)
            pending = null; }).catch(() => { });
        return task;
    }
    return { presentation, getOrigin: () => disposed ? null : orb,
        setActive(active) { if (active)
            orb.dataset.surfaceActive = 'true';
        else
            delete orb.dataset.surfaceActive; },
        highlight() { if (!disposed) {
            orb.inert = false;
            orb.focus({ preventScroll: true });
        } },
        show: (panel, current) => transition(panel, true, current), close: (panel, current) => transition(panel, false, current), release,
        dispose() {
            if (disposed)
                return;
            release();
            disposed = true;
            cancelPointer();
            presentation.dispose();
            if (followFrame)
                caf(followFrame);
            followFrame = 0;
            // Only this handle's owned transitions may change hidden/inert.
            if (activePanel) {
                activePanel.hidden = true;
                activePanel.inert = true;
            }
            for (const [name, fn] of Object.entries(listeners))
                orb.removeEventListener(name, fn);
            for (const name of ['resize', 'orientationchange'])
                host.removeEventListener(name, resize);
            host.visualViewport?.removeEventListener('resize', resize);
            host.visualViewport?.removeEventListener('scroll', resize);
            unsubscribeAppearance();
            image.removeEventListener('error', imageFailed);
            pullArt?.shape.remove();
            orb.remove();
            style.remove();
        },
    };
}
