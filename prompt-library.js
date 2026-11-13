const promptIcons = {
  add:'<path d="M12 5v14M5 12h14"/>',
  import:'<path d="M12 3v11m-4-4 4 4 4-4M4 15v5h16v-5"/>',
  export:'<path d="M12 15V4m-4 4 4-4 4 4M4 15v5h16v-5"/>',
  edit:'<path d="m15 5 4 4M4 20l5-1L20 8a2.8 2.8 0 0 0-4-4L5 15z"/>',
  view:'<path d="M12 6c-3-2-6-2-9-1v14c3-1 6-1 9 1 3-2 6-2 9-1V5c-3-1-6-1-9 1zm0 0v14"/>',
  translate:'<path d="M3 5h11M8.5 3v2m-3 3c1.1 3 3.6 5.1 6.5 6.5M12 5c-1.2 4-4.2 7.5-8 9m9 6 4-10 4 10m-6.5-3h5"/>',
  polish:'<path d="M10 3c0 5-2 7-7 7 5 0 7 2 7 7 0-5 2-7 7-7-5 0-7-2-7-7zm8 11v7m-3.5-3.5h7"/>',
  check:'<path d="m5 12 4 4L19 6"/>',
  chevron:'<path d="m7 10 5 5 5-5"/>',
  delete:'<path d="M4 6h16M9 6V3h6v3M6 6l1 15h10l1-15M10 10v7M14 10v7"/>',
};
const promptIcon = name => `<svg viewBox="0 0 24 24" aria-hidden="true" fill="none" stroke="currentColor" stroke-width="1.65" stroke-linecap="round" stroke-linejoin="round">${promptIcons[name]}</svg>`;
const promptModeLabel = mode => mode === 'polish' ? '润色' : '翻译';
const promptModes = ['translate','polish'];
const promptModeOption = mode => `<span class="mt-prompt-icon" data-kind="${mode}">${promptIcon(mode)}</span><span>${promptModeLabel(mode)}模式</span>`;

export const promptLibraryMarkup = `
  <div class="mt-library-head">
    <h3 class="mt-page-heading">翻译/润色提示库</h3>
    <div class="mt-library-actions">
      <button type="button" class="mt-icon-action" data-template-import title="导入提示词" aria-label="导入提示词">${promptIcon('import')}</button>
      <button type="button" class="mt-library-new" data-template-new aria-haspopup="dialog">${promptIcon('add')}<span>新建条目</span></button>
    </div>
  </div>
  <div class="mt-prompt-list" data-template-list role="list" aria-label="自定义提示词"></div>
  <div class="mt-library-examples"><h4>内置示例</h4><div class="mt-prompt-list" data-template-examples role="list" aria-label="内置示例"></div></div>
  <input type="file" data-template-file accept=".json,application/json" hidden>
`;

export const promptEditorMarkup = `
  <div class="mt-editor-layer" data-template-layer hidden>
  <dialog class="mt-prompt-dialog" data-template-editor aria-modal="true" aria-labelledby="mt-editor-title">
    <form data-template-form>
      <header class="mt-editor-head">
        <div><h3 id="mt-editor-title" tabindex="-1"></h3><small data-editor-hint hidden>内置示例 · 可查看或导出</small></div>
        <div class="mt-editor-tools">
          <button type="button" class="mt-icon-action mt-editor-delete" data-template-delete aria-label="删除条目" title="删除条目">${promptIcon('delete')}</button>
          <button type="button" class="mt-icon-action" data-template-export aria-label="导出提示词" title="导出提示词">${promptIcon('export')}</button>
        </div>
      </header>
      <div class="mt-editor-body">
        <label>名称<input data-edit-name maxlength="80" required></label>
        <label>目标语言<input data-edit-target placeholder="例如：简体中文" required></label>
        <div class="mt-editor-mode" data-edit-mode>
          <label id="mt-mode-label" for="mt-mode-trigger">处理模式</label>
          <button id="mt-mode-trigger" class="mt-mode-trigger" type="button" role="combobox" aria-labelledby="mt-mode-label mt-mode-value" aria-controls="mt-mode-options" aria-expanded="false" aria-haspopup="listbox">
            <span class="mt-mode-value" id="mt-mode-value"></span><span class="mt-mode-chevron">${promptIcon('chevron')}</span>
          </button>
          <div id="mt-mode-options" class="mt-mode-options" role="listbox" aria-labelledby="mt-mode-label" hidden>
            ${promptModes.map(mode=>`<div id="mt-mode-${mode}" class="mt-mode-option" role="option" aria-selected="false" data-mode-option="${mode}">${promptModeOption(mode)}<span class="mt-mode-check">${promptIcon('check')}</span></div>`).join('')}
          </div>
        </div>
        <label class="mt-editor-rules">提示词<textarea data-edit-rules placeholder="填写翻译或润色要求"></textarea></label>
        <p data-editor-status role="status" hidden></p>
      </div>
      <footer class="mt-editor-actions">
        <button type="button" data-template-close>返回</button>
        <button type="submit" data-template-save>保存</button>
      </footer>
    </form>
  </dialog>
  </div>
`;

export function mountPromptLibrary({panel, resources, entries, selectedId, isExample, actions, say}) {
  const doc = panel.ownerDocument, host = doc.defaultView;
  const el = name => panel.querySelector(`[data-${name}]`);
  const list = el('template-list'), examples = el('template-examples'), dialog = el('template-editor'), layer = el('template-layer');
  const form = el('template-form'), heading = dialog.querySelector('h3'), fileInput = el('template-file');
  const [name, target, rules] = ['name','target','rules'].map(key => el('edit-'+key));
  const mode = el('edit-mode'), modeTrigger = mode.querySelector('[role=combobox]'), modeValue = mode.querySelector('.mt-mode-value');
  const modeList = mode.querySelector('[role=listbox]'), modeOptions = [...modeList.children];
  const save = el('template-save'), closeButton = el('template-close'), remove = el('template-delete'), exportButton = el('template-export');
  const notice = el('editor-status'), newButton = el('template-new'), rows = new Map();
  const scroller = el('tab-content');
  let edited, opener, covered = [], confirmDelete = false, drag = null, previousEntries, suppressClick = false, clickTimer;
  let modeIndex = 0, activeMode = 0;
  const attempt = fn => {try {return fn();} catch (error) {say(error.message);}};

  function selection() {
    const activeId = selectedId();
    for (const [id, row] of rows) {
      const selected = id === activeId;
      const control = row.querySelector('.mt-prompt-select');
      if (control.getAttribute('aria-pressed') === String(selected)) continue;
      row.toggleAttribute('data-selected', selected);
      control.setAttribute('aria-pressed', String(selected));
    }
  }
  function iconButton(icon, label, action) {
    const button = doc.createElement('button');
    button.type = 'button';button.className = 'mt-icon-action';button.innerHTML = promptIcon(icon);
    button.title = label;button.setAttribute('aria-label', label);button.onclick = action;
    return button;
  }
  function render() {
    const items = entries();
    if (items !== previousEntries) {
      stopDrag();rows.clear();
      const customRows = doc.createDocumentFragment(), exampleRows = doc.createDocumentFragment();
      for (const item of items) {
        const example = isExample(item), row = doc.createElement('div');
        row.className = 'mt-prompt-row';row.setAttribute('role','listitem');row.dataset.promptId = item.id;
        const apply = doc.createElement('button');apply.type = 'button';apply.className = 'mt-prompt-select';
        apply.setAttribute('aria-label','选用：'+item.name);
        if (!example) {
          apply.setAttribute('aria-keyshortcuts','Alt+ArrowUp Alt+ArrowDown');
        }
        apply.innerHTML = `<span class="mt-prompt-icon" data-kind="${item.mode==='polish'?'polish':'translate'}">${promptIcon(item.mode==='polish'?'polish':'translate')}</span><span class="mt-prompt-copy"><strong></strong><small></small></span><span class="mt-prompt-check">${promptIcon('check')}</span>`;
        apply.querySelector('strong').textContent = item.name;
        apply.querySelector('small').textContent = promptModeLabel(item.mode)+' · '+(item.data.target||'简体中文');
        apply.onclick = () => attempt(() => actions.select(item.id));
        const edit = iconButton(example?'view':'edit',(example?'查看：':'编辑：')+item.name,()=>attempt(()=>open(item,edit)));
        edit.classList.add('mt-prompt-edit');edit.setAttribute('aria-haspopup','dialog');
        row.append(apply,edit);rows.set(item.id,row);
        (example ? exampleRows : customRows).append(row);
      }
      list.replaceChildren(customRows);examples.replaceChildren(exampleRows);
      previousEntries = items;
    }
    selection();
  }

  function setNotice(text) {notice.textContent = text;notice.hidden = !text;}
  function paintModeValue(index) {
    modeIndex=index;
    modeValue.innerHTML=promptModeOption(promptModes[index]);
    modeOptions.forEach((option,i)=>option.setAttribute('aria-selected',String(i===index)));
  }
  function highlightMode(index) {
    activeMode=index;
    modeOptions.forEach((option,i)=>option.toggleAttribute('data-active',i===index));
    modeTrigger.setAttribute('aria-activedescendant',modeOptions[index].id);
  }
  function closeMode() {
    modeList.hidden=true;modeTrigger.setAttribute('aria-expanded','false');
    modeTrigger.removeAttribute('aria-activedescendant');
  }
  function openMode() {
    if (modeTrigger.disabled) return;
    modeList.hidden=false;modeTrigger.setAttribute('aria-expanded','true');highlightMode(modeIndex);
    modeTrigger.focus({preventScroll:true});
    modeList.scrollIntoView?.({block:'nearest',inline:'nearest'});
  }
  function chooseMode(index) {
    paintModeValue(index);closeMode();confirmDelete=false;setNotice('');
    modeTrigger.focus({preventScroll:true});
  }
  modeTrigger.onclick = () => {if (modeList.hidden) openMode();else closeMode();};
  resources.listen(modeTrigger,'keydown',event=>{
    if (event.isComposing || event.keyCode===229) return;
    if (['ArrowUp','ArrowDown','Home','End'].includes(event.key)) {
      event.preventDefault();
      if (modeList.hidden) {openMode();return;}
      const index=event.key==='Home'?0:event.key==='End'?modeOptions.length-1:activeMode+(event.key==='ArrowDown'?1:-1);
      highlightMode(Math.max(0,Math.min(modeOptions.length-1,index)));
    } else if (!modeList.hidden && ['Enter',' '].includes(event.key)) {
      event.preventDefault();chooseMode(activeMode);
    } else if (event.key==='Tab') closeMode();
  });
  resources.listen(modeList,'click',event=>{
    const option=event.target.closest('[data-mode-option]');
    if (!modeList.hidden && option) chooseMode(modeOptions.indexOf(option));
  });
  resources.listen(modeList,'pointerdown',event=>{
    if (event.pointerType==='mouse') event.preventDefault();
  });
  resources.listen(modeList,'pointermove',event=>{
    const index=modeOptions.indexOf(event.target.closest('[data-mode-option]'));
    if (event.pointerType==='mouse' && index>=0 && index!==activeMode) highlightMode(index);
  });
  function dismissModeOutside(event) {
    if (!modeList.hidden && !mode.contains(event.target)) closeMode();
  }
  resources.listen(doc,'pointerdown',dismissModeOutside,true);
  resources.listen(doc,'focusin',dismissModeOutside,true);
  function open(item, button) {
    actions.guard();
    edited = item;opener = button;confirmDelete = false;setNotice('');
    const readonly = Boolean(item && isExample(item));
    heading.textContent = readonly ? '查看示例' : item ? '编辑条目' : '新建条目';
    el('editor-hint').hidden = !readonly;
    name.value = item?.name ?? '';target.value = item?.data.target ?? '简体中文';
    closeMode();paintModeValue(item?.mode==='polish'?1:0);rules.value = item?.data.rules ?? '';
    for (const field of [name,target,rules]) field.readOnly = readonly;
    modeTrigger.disabled = readonly;remove.hidden = !item || readonly;exportButton.hidden = !item;
    save.hidden = readonly;
    covered = [...panel.children].filter(node => node !== layer && !node.inert && !node.hasAttribute('inert'));
    for (const node of covered) node.setAttribute('inert','');
    layer.hidden = false;
    dialog.open = true;
    dialog.querySelector('.mt-editor-body').scrollTop = 0;
    heading.focus({preventScroll:true});
  }
  function close(restore = true) {
    if (!dialog.open) return;
    closeMode();
    dialog.open = false;
    layer.hidden = true;
    for (const node of covered) node.removeAttribute('inert');
    covered = [];
    if (restore && !panel.hidden && !panel.inert) {
      (opener?.isConnected?opener:rows.get(edited?.id)?.querySelector('.mt-prompt-edit')||newButton).focus({preventScroll:true});
    }
    edited = opener = undefined;
  }
  newButton.onclick = () => attempt(() => open(undefined,newButton));
  el('template-import').onclick = () => attempt(() => {actions.guard();fileInput.click();});
  fileInput.onchange = async () => {
    try {
      actions.guard();const file = fileInput.files?.[0];if (!file) return;
      if (file.size>1024*1024) throw Error('文件超过 1 MB，未导入。');
      const value = JSON.parse(await file.text());actions.guard();
      actions.import(value);
    } catch (error) {say('导入失败：'+error.message);}
    finally {fileInput.value = '';}
  };
  closeButton.onclick = () => close();
  form.onsubmit = event => {
    event.preventDefault();
    if (!dialog.open || (edited && isExample(edited))) return;
    try {
      actions.save(edited?.id,{name:name.value.trim(),mode:promptModes[modeIndex],data:{target:target.value.trim(),rules:rules.value}});
      close();
    } catch (error) {setNotice(error.message);}
  };
  exportButton.onclick = () => attempt(() => {actions.guard();if (edited) actions.export(edited);});
  remove.onclick = () => {
    if (!edited || isExample(edited)) return;
    if (!confirmDelete) {confirmDelete = true;setNotice('再点一次删除图标，删除此条目。');return;}
    try {actions.remove(edited.id);close();} catch (error) {setNotice(error.message);}
  };
  resources.listen(dialog,'input',()=>{confirmDelete=false;setNotice('');});
  function dismissEditor() {
    if (!dialog.open) return false;
    if (modeList.hidden) close();
    else {closeMode();modeTrigger.focus({preventScroll:true});}
    return true;
  }
  resources.listen(dialog,'keydown',event=>{
    if (event.key!=='Tab' || event.defaultPrevented) return;
    const controls = [...dialog.querySelectorAll('button:not(:disabled),input:not(:disabled),textarea:not(:disabled)')]
      .filter(control=>!control.closest('[hidden]'));
    const edge = event.shiftKey ? controls[0] : controls.at(-1);
    if (doc.activeElement !== edge && doc.activeElement !== heading) return;
    event.preventDefault();
    (event.shiftKey ? controls.at(-1) : controls[0])?.focus();
  });
  resources.listen(doc,'keydown',event=>{
    if (!dialog.open || panel.hidden || panel.inert || event.key!=='Escape' || event.isComposing || event.keyCode===229) return;
    if (!panel.contains(event.target) && event.target!==doc) return;
    event.preventDefault();event.stopImmediatePropagation();if (!event.repeat) dismissEditor();
  },true);
  function stopDrag(restore = true) {
    const current = drag;drag = null;
    if (!current) return;
    resources.clear(current.timer);
    if (current.frame!==undefined) host.cancelAnimationFrame(current.frame);
    if (!current.ghost) return;
    if (restore && current.row.nextElementSibling!==current.originalNext) list.insertBefore(current.row,current.originalNext);
    current.row.removeAttribute('data-dragging');current.marker?.removeAttribute('data-drop');current.ghost.remove();
    list.removeAttribute('data-drop-end');
  }
  function paintDrag(current, scroll = true) {
    const {top,bottom} = scroller.getBoundingClientRect();
    const boxes = [...list.children].filter(row=>row!==current.row).map(row=>[row,row.getBoundingClientRect()]);
    const before = boxes.find(([,rect])=>current.y<rect.top+rect.height/2)?.[0] ?? null;
    current.ghost.style.transform = `translate(${current.x-current.startX}px,${current.y-current.startY}px) rotate(-1deg)`;
    if (current.row.nextElementSibling!==before) list.insertBefore(current.row,before);
    if (current.marker!==before) {
      current.marker?.removeAttribute('data-drop');before?.setAttribute('data-drop','');current.marker=before;
    }
    list.toggleAttribute('data-drop-end',!before);
    if (!scroll) return;
    const delta = current.y<top+56 ? -Math.min(15,(top+56-current.y)/3)
      : current.y>bottom-56 ? Math.min(15,(current.y-bottom+56)/3) : 0;
    if (delta) {
      const previous = scroller.scrollTop;scroller.scrollTop+=delta;
      if (previous!==scroller.scrollTop) scheduleDrag(current);
    }
  }
  function scheduleDrag(current) {
    if (current.frame!==undefined) return;
    current.frame = host.requestAnimationFrame(()=>{
      current.frame=undefined;
      if (drag===current) paintDrag(current);
    });
  }
  function activateDrag(current) {
    if (drag!==current) return;
    try {actions.guard();} catch (error) {stopDrag();say(error.message);return;}
    const rect = current.row.getBoundingClientRect(), ghost = current.row.cloneNode(true);
    ghost.classList.add('mt-prompt-ghost');ghost.setAttribute('aria-hidden','true');ghost.inert = true;
    Object.assign(ghost.style,{left:rect.left+'px',top:rect.top+'px',width:rect.width+'px'});
    current.ghost = ghost;current.row.setAttribute('data-dragging','');panel.append(ghost);
    const selection = host.getSelection();
    if (selection && panel.contains(selection.anchorNode)) selection.removeAllRanges();
  }
  function beginDrag(event, contact, touch) {
    if (event.target.closest('.mt-prompt-edit')) return;
    const row = event.target.closest('[data-prompt-id]');
    if (!row || row.parentNode!==list) return;
    stopDrag();
    const {clientX:x,clientY:y} = contact;
    drag = {row,originalNext:row.nextElementSibling,x,y,startX:x,startY:y,touch,
      id:touch?contact.identifier:contact.pointerId};
    const current = drag;
    if (touch) current.timer = resources.timeout(()=>activateDrag(current),350);
  }
  function moveDrag(contact, event) {
    const current = drag;
    current.x=contact.clientX;current.y=contact.clientY;
    if (!current.ghost) {
      const distance = Math.hypot(current.x-current.startX,current.y-current.startY);
      if (current.touch && distance>8) stopDrag();
      if (!current.touch && distance>4) activateDrag(current);
    }
    if (drag===current && current.ghost) {event.preventDefault();scheduleDrag(current);}
  }
  function finishDrag(event) {
    const current = drag;
    if (!current.ghost) {stopDrag();return;}
    if (current.touch) event.preventDefault();
    suppressClick = true;resources.clear(clickTimer);
    clickTimer = resources.timeout(()=>{suppressClick=false;},400);
    paintDrag(current,false);
    const position = [...list.children].indexOf(current.row), focus = doc.activeElement;
    stopDrag();
    if (attempt(()=>actions.move(current.row.dataset.promptId,position)) && current.row.contains(focus)) {
      rows.get(current.row.dataset.promptId)?.querySelector('.mt-prompt-select').focus({preventScroll:true});
    }
  }
  resources.listen(list,'pointerdown',event=>{
    suppressClick=false;resources.clear(clickTimer);
    if (event.pointerType!=='touch' && event.button===0) beginDrag(event,event,false);
  });
  resources.listen(doc,'pointermove',event=>{
    if (drag && !drag.touch && drag.id===event.pointerId) moveDrag(event,event);
  },{passive:false});
  resources.listen(doc,'pointerup',event=>{if (drag && !drag.touch && drag.id===event.pointerId) finishDrag(event);});
  resources.listen(doc,'pointercancel',event=>{if (drag && !drag.touch && drag.id===event.pointerId) stopDrag();});
  resources.listen(list,'touchstart',event=>{
    suppressClick=false;resources.clear(clickTimer);
    if (event.touches.length===1) beginDrag(event,event.touches[0],true);else stopDrag();
  },{passive:true});
  resources.listen(doc,'touchmove',event=>{
    if (!drag?.touch) return;
    const touch = event.touches[0];
    if (event.touches.length!==1 || touch.identifier!==drag.id) stopDrag();else moveDrag(touch,event);
  },{passive:false});
  resources.listen(doc,'touchend',event=>{
    if (drag?.touch && [...event.changedTouches].some(touch=>touch.identifier===drag.id)) finishDrag(event);
  },{passive:false});
  resources.listen(doc,'touchcancel',()=>stopDrag());
  resources.listen(host,'blur',()=>stopDrag());
  resources.listen(list,'contextmenu',event=>{if (drag?.touch) event.preventDefault();});
  resources.listen(list,'selectstart',event=>{if (drag?.ghost) event.preventDefault();});
  resources.listen(list,'click',event=>{
    if (!suppressClick || !event.detail) return;
    suppressClick=false;resources.clear(clickTimer);event.preventDefault();event.stopImmediatePropagation();
  },true);
  resources.listen(list,'keydown',event=>{
    if (drag && event.key==='Escape') {event.preventDefault();event.stopPropagation();stopDrag();return;}
    const control = event.target.closest('.mt-prompt-select');
    if (!control || !event.altKey || !['ArrowUp','ArrowDown'].includes(event.key)) return;
    event.preventDefault();
    const row = control.closest('[data-prompt-id]'), id = row.dataset.promptId;
    const position = [...list.children].indexOf(row)+(event.key==='ArrowUp'?-1:1);
    attempt(()=>actions.move(id,position));rows.get(id)?.querySelector('.mt-prompt-select').focus({preventScroll:true});
  });
  const rulesPane = el('rules-pane');
  const observer = new host.MutationObserver(() => {
    if (panel.hidden || panel.inert || rulesPane.hidden) close(false);
    if (panel.hidden || panel.inert || rulesPane.hidden) stopDrag();
  });
  observer.observe(panel,{attributes:true,attributeFilter:['hidden','inert']});
  observer.observe(rulesPane,{attributes:true,attributeFilter:['hidden']});
  resources.add(()=>{observer.disconnect();close(false);stopDrag();form.onsubmit=null;});
  return {render,close,dismiss:dismissEditor};
}
