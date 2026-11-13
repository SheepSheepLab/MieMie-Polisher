import {observeWindowLayer} from './window-layer.js';
// SPDX-License-Identifier: GPL-3.0-or-later
const STORAGE_KEY = 'miemie_polisher_launcher_appearance_v1';
export const LAUNCHER_HOLD_MS = 900;
export const LAUNCHER_MIN_SIZE = 50;
export const LAUNCHER_MAX_SIZE = 150;
const sizePercent = (size) => typeof size === 'number' && Number.isFinite(size)
    ? Math.max(LAUNCHER_MIN_SIZE, Math.min(LAUNCHER_MAX_SIZE, Math.round(size)))
    : 100;
export function createLauncherAppearance(host) {
    let value = { size: 100, tucked: false };
    const listeners = new Set();
    try {
        const saved = JSON.parse(host.localStorage.getItem(STORAGE_KEY) || 'null');
        value = { size: sizePercent(saved?.size), tucked: saved?.tucked === true };
    }
    catch { /* Keep defaults if storage is unavailable or malformed. */ }
    return {
        get: () => value,
        set(next) {
            value = { size: sizePercent(next.size ?? value.size), tucked: next.tucked ?? value.tucked };
            for (const listener of listeners)
                listener();
            try {
                host.localStorage.setItem(STORAGE_KEY, JSON.stringify(value));
            }
            catch {
                return false;
            }
            return true;
        },
        subscribe(listener) {
            listeners.add(listener);
            return () => { listeners.delete(listener); };
        },
    };
}

const launcherSettingsDismissals = new WeakMap();

export function dismissPanelLayer(panel) {
  return launcherSettingsDismissals.get(panel)?.() ?? false;
}

// The settings layer belongs to this panel. It never changes Hub's presentation lease.
export function mountLauncherSettings({host, panel, header, icon, appearance, resources, api, id, dismissEditor}) {
  const doc = panel.ownerDocument;
  resources.add(observeWindowLayer(host,panel));
  const trigger = doc.createElement('button');
  trigger.type = 'button';
  trigger.className = 'mm-launcher-settings-button';
  trigger.title = '悬浮球设置';
  trigger.setAttribute('aria-label', trigger.title);
  trigger.setAttribute('aria-haspopup', 'dialog');
  trigger.setAttribute('aria-controls', `${id}-settings`);
  trigger.innerHTML = `<svg viewBox="0 0 24 24" aria-hidden="true" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linejoin="round"><path d="M12 8a4 4 0 1 0 0 8 4 4 0 0 0 0-8Z"/><path d="M9.5 3h5l.5 2.5 2 1.2 2.4-.7 2.5 4.3-1.9 1.7v2l1.9 1.7-2.5 4.3-2.4-.7-2 1.2-.5 2.5h-5L9 20.5l-2-1.2-2.4.7-2.5-4.3L4 14v-2l-1.9-1.7L4.6 6l2.4.7 2-1.2.5-2.5Z"/></svg>`;
  header.append(trigger);

  const layer = doc.createElement('div');
  layer.className = 'mm-launcher-settings-layer';
  layer.hidden = true;
  layer.innerHTML = `
    <div class="mm-launcher-settings" id="${id}-settings" role="dialog" aria-modal="true" aria-labelledby="${id}-title">
      <div class="mm-launcher-dialog-head"><h3 id="${id}-title" tabindex="-1">悬浮球设置</h3></div>
      <div class="mm-launcher-dialog-body">
        <div class="mm-launcher-card">
          <div class="mm-launcher-card-heading"><h4>悬浮球</h4><small>外观与手势</small></div>
          <div class="mm-launcher-size-row">
            <div class="mm-launcher-size-fields">
              <div class="mm-launcher-size-heading"><label for="${id}-size">悬浮球大小</label><output aria-hidden="true"></output></div>
              <input class="mm-launcher-size-input" id="${id}-size" type="range" min="${LAUNCHER_MIN_SIZE}" max="${LAUNCHER_MAX_SIZE}">
              <div class="mm-launcher-size-stops" aria-hidden="true"><span>50%</span><span>100%</span><span>150%</span></div>
            </div>
            <div class="mm-launcher-size-preview" aria-hidden="true"><img alt="" draggable="false"></div>
          </div>
          <div class="mm-launcher-mode-row">
            <div class="mm-launcher-mode-copy"><strong>潜航模式</strong><p id="${id}-hint">贴边半藏，鼠标悬停时探出。鼠标和触屏都可向内拉，亮起后松手打开。原地长按 ${LAUNCHER_HOLD_MS / 1000} 秒后可拖动换位。</p></div>
            <button class="mm-launcher-mode-switch" type="button" role="switch" aria-label="潜航模式" aria-describedby="${id}-hint"><span class="mm-launcher-mode-track"></span></button>
          </div>
          <p class="mm-launcher-settings-notice" role="status" hidden></p>
        </div>
      </div>
      <div class="mm-launcher-dialog-actions"><button type="button">返回</button></div>
    </div>`;
  panel.append(layer);
  const title = layer.querySelector('h3'), slider = layer.querySelector('input'), value = layer.querySelector('output');
  const preview = layer.querySelector('.mm-launcher-size-preview'), toggle = layer.querySelector('[role="switch"]');
  const back = layer.querySelector('.mm-launcher-dialog-actions button'), notice = layer.querySelector('[role="status"]');
  preview.querySelector('img').src = icon;
  let covered = [];

  function paint() {
    const {size, tucked} = appearance.get();
    slider.value = String(size);
    slider.setAttribute('aria-valuetext', `${size}%`);
    value.textContent = `${size}%`;
    slider.style.setProperty('--mm-size-fill', `${size - LAUNCHER_MIN_SIZE}%`);
    preview.style.setProperty('--mm-preview-diameter', `${size * .34}px`);
    preview.toggleAttribute('data-tucked', tucked);
    toggle.setAttribute('aria-checked', String(tucked));
  }
  function apply(next) {
    const saved = appearance.set(next);
    notice.hidden = saved;
    notice.textContent = saved ? '' : '当前页面已应用。浏览器无法保存此设置。';
    paint();
  }
  function close(restoreFocus = true) {
    if (layer.hidden) return false;
    layer.hidden = true;
    for (const child of covered) child.inert = false;
    covered = [];
    if (restoreFocus && trigger.isConnected && !panel.hidden && !panel.inert) trigger.focus({preventScroll: true});
    return true;
  }
  function open() {
    if (panel.hidden || panel.inert || !layer.hidden || panel.querySelector('dialog[open]')) return;
    paint();
    layer.hidden = false;
    covered = [...panel.children].filter(child => child !== layer && !child.inert);
    for (const child of covered) child.inert = true;
    title.focus({preventScroll: true});
  }
  resources.listen(trigger, 'click', open);
  resources.listen(slider, 'input', () => apply({size: slider.valueAsNumber}));
  resources.listen(toggle, 'click', () => apply({tucked: !appearance.get().tucked}));
  resources.listen(back, 'click', () => close());
  // Handle synchronously so Escape cannot bubble into an outer Back handler.
  function key(event) {
    if (event.key === 'Escape' && !event.isComposing && event.keyCode !== 229) {
      event.preventDefault();
      event.stopPropagation();
      if (!event.repeat) close();
    } else if (event.key === 'Tab') {
      const first = event.shiftKey ? back : slider;
      const last = event.shiftKey ? slider : back;
      if (doc.activeElement === last || doc.activeElement === title) {
        event.preventDefault();
        first.focus();
      }
    }
  }
  layer.addEventListener('keydown', key);
  const observer = new host.MutationObserver(() => {
    if (panel.hidden || panel.inert) close(false);
  });
  observer.observe(panel, {attributes: true, attributeFilter: ['hidden','inert']});
  const dismiss = () => close() || dismissEditor?.() === true;
  launcherSettingsDismissals.set(panel, dismiss);
  api.registerBackHandler?.(request => request.isCurrent() && dismiss());
  resources.add(() => {
    observer.disconnect();
    launcherSettingsDismissals.delete(panel);
    close(false);
    layer.removeEventListener('keydown', key);
    trigger.remove();
    layer.remove();
  });
}
