export function mountRequestProgress({doc, resources, panelAnchor, label, palette}) {
  const style = doc.createElement('style');
  style.textContent = `
    .mm-request-progress{box-sizing:border-box;display:grid;gap:5px;min-width:0;margin:4px 0 6px;padding:6px 10px 7px;border:1px solid var(--mm-rp-border);border-radius:10px;background:var(--mm-rp-bg);color:var(--mm-rp-text);font:12px/1.4 system-ui;text-align:left;white-space:normal;pointer-events:none}
    .mm-request-progress[hidden]{display:none!important}
    .mm-request-progress[data-mm-progress-fallback]{position:fixed;inset-inline:12px;bottom:calc(74px + env(safe-area-inset-bottom,0px) + var(--mm-rp-offset));z-index:3000;width:auto;max-width:360px;margin-inline:auto}
    .mm-request-progress [data-mm-progress-label]{display:flex;align-items:center;gap:6px;min-width:0}
    .mm-request-progress [data-mm-progress-mark]{flex:none;display:grid;place-items:center;width:15px;height:15px;font-size:12px;font-weight:750;color:var(--mm-rp-ink,var(--mm-rp-accent))}
    .mm-request-progress [data-mm-progress-mark]:empty::before{content:'';width:5px;height:5px;border-radius:50%;background:currentColor}
    .mm-request-progress [data-mm-progress-track]{display:block;position:relative;overflow:hidden;height:3px;border-radius:999px;background:var(--mm-rp-border)}
    .mm-request-progress [data-mm-progress-track]::after{content:'';position:absolute;inset:0;border-radius:inherit;background:var(--mm-rp-ink,var(--mm-rp-accent));transform-origin:left center}
    .mm-request-progress[data-mm-progress-state=waiting] [data-mm-progress-track]::after,
    .mm-request-progress[data-mm-progress-state=applying] [data-mm-progress-track]::after{background:linear-gradient(90deg,transparent,var(--mm-rp-accent) 60%,#fff 86%,var(--mm-rp-accent));animation:mm-rp-sweep 1.65s cubic-bezier(.46,.1,.54,.9) infinite}
    .mm-request-progress[data-mm-progress-state=applying] [data-mm-progress-track]::after{animation-duration:1.05s}
    .mm-request-progress[data-mm-progress-state=done]{--mm-rp-ink:#8fe0b7}
    .mm-request-progress[data-mm-progress-state=cancelled]{--mm-rp-ink:#bac1d3}
    .mm-request-progress[data-mm-progress-state=failed]{--mm-rp-ink:#ffabab}
    .mm-request-progress[data-mm-progress-state=done] [data-mm-progress-track]::after{animation:mm-rp-complete .34s cubic-bezier(.22,.8,.3,1) both}
    .mm-request-progress[data-mm-progress-state=done] [data-mm-progress-mark]{animation:mm-rp-check .28s .13s cubic-bezier(.2,.75,.3,1.35) both}
    .mm-request-progress[data-mm-progress-state=cancelled] [data-mm-progress-track]::after{animation:mm-rp-retract .32s ease-out both}
    .mm-request-progress[data-mm-progress-state=failed] [data-mm-progress-track]::after{animation:mm-rp-error .38s ease-out both}
    @keyframes mm-rp-sweep{from{transform:translateX(-38%) scaleX(.32)}to{transform:translateX(104%) scaleX(.32)}}
    @keyframes mm-rp-complete{from{transform:scaleX(.28);opacity:.72}to{transform:scaleX(1);opacity:1}}
    @keyframes mm-rp-check{from{transform:scale(.6);opacity:0}to{transform:scale(1);opacity:1}}
    @keyframes mm-rp-retract{from{transform:scaleX(.65);opacity:.9}to{transform:scaleX(.04);opacity:.65}}
    @keyframes mm-rp-error{0%{opacity:.3}55%{opacity:1}100%{opacity:.82}}
    @media(prefers-reduced-motion:reduce){
      .mm-request-progress [data-mm-progress-track]::after,.mm-request-progress [data-mm-progress-mark]{animation:none!important}
      .mm-request-progress[data-mm-progress-state=waiting] [data-mm-progress-track]::after,
      .mm-request-progress[data-mm-progress-state=applying] [data-mm-progress-track]::after{background:repeating-linear-gradient(110deg,var(--mm-rp-accent) 0 6px,transparent 6px 10px)}
      .mm-request-progress[data-mm-progress-state=cancelled] [data-mm-progress-track]::after{transform:scaleX(.04)}
    }
  `;
  (doc.head || doc.documentElement).appendChild(style);
  const composer = doc.querySelector('#form_sheld > #send_form') || doc.getElementById('send_form');
  function view() {
    const element = doc.createElement('div');
    element.className = 'mm-request-progress';
    element.hidden = true;
    for (const [key, value] of Object.entries(palette)) element.style.setProperty('--mm-rp-' + key, value);
    element.innerHTML = '<span data-mm-progress-label><span data-mm-progress-mark aria-hidden="true"></span><span data-mm-progress-text></span></span><span data-mm-progress-track aria-hidden="true"></span>';
    return {element, mark:element.querySelector('[data-mm-progress-mark]'), text:element.querySelector('[data-mm-progress-text]')};
  }
  const chat = view(), panel = view();
  chat.element.dataset.mmRequestProgress = label;
  chat.element.setAttribute('role','status');
  chat.element.setAttribute('aria-atomic','true');
  panel.element.setAttribute('aria-hidden','true');
  panelAnchor.before(panel.element);
  if (composer) composer.before(chat.element);
  else {
    chat.element.setAttribute('data-mm-progress-fallback','');
    (doc.body || doc.documentElement).appendChild(chat.element);
  }
  const views = [chat,panel], marks = {done:'✓',cancelled:'–',failed:'!'};
  let timer, disposed = false;
  function clear() {
    resources.clear(timer);
    timer = undefined;
    for (const item of views) {
      item.element.hidden = true;
      item.text.textContent = '';
    }
  }
  function show(state, text) {
    if (disposed) return;
    resources.clear(timer);
    for (const item of views) {
      item.element.hidden = false;
      item.element.dataset.mmProgressState = state;
      item.mark.textContent = marks[state] || '';
      item.text.textContent = (item === chat ? label + ' · ' : '') + text;
    }
    if (marks[state]) timer = resources.timeout(clear, state === 'failed' ? 5500 : 3000);
  }
  resources.add(() => {disposed = true; clear(); chat.element.remove(); panel.element.remove(); style.remove();});
  return {show,clear};
}
