import {createNativeFloatingPresentation} from './native-floating-presentation.js';
import {POLISHER_PRODUCT} from './product-identity.js';
// One native presentation shared by Standalone and the opt-in Hub shortcut.
export function createPolisherNativeLauncher({host,icon,styles='',mode='standalone',open,onError=()=>{}}){
 const doc=host.document,key='miemie_polisher_dock_v1';
 const tuning=Object.freeze({size:64,dragThreshold:7});
 const style=doc.createElement('style');style.textContent=styles;
 const orb=doc.createElement('button');orb.type='button';if(mode==='standalone')orb.dataset.miemiePolisherStandalone='';orb.dataset.miemiePolisherNative='';orb.dataset.miemiePolisherMode=mode;
 orb.title=POLISHER_PRODUCT.launcherName;orb.setAttribute('aria-label','打开'+POLISHER_PRODUCT.name);
 const image=doc.createElement('img');image.src=icon;image.alt=POLISHER_PRODUCT.launcherName;image.draggable=false;orb.append(image);
 image.onerror=()=>{image.remove();orb.textContent='🪶';};
 (doc.head||doc.documentElement).append(style);(doc.body||doc.documentElement).append(orb);
 let dock={side:'right',ratio:.6},drag=null,suppress=false,disposed=false,queue=Promise.resolve(),pending=null,activePanel=null;
 let followFrame=0;
 const presentation=createNativeFloatingPresentation({host,orb,bounds});
 const raf=host.requestAnimationFrame?.bind(host)||((fn)=>host.setTimeout(fn,16)),caf=host.cancelAnimationFrame?.bind(host)||host.clearTimeout.bind(host);
 function follow(){if(followFrame)return;followFrame=raf(()=>{followFrame=0;presentation.follow();});}
 function settlePosition(){if(followFrame)caf(followFrame);followFrame=0;presentation.follow();}
 try{const value=JSON.parse(host.localStorage.getItem(key));if(['left','right'].includes(value?.side)&&Number.isFinite(value.ratio))dock={side:value.side,ratio:Math.max(0,Math.min(1,value.ratio))};}catch(_){}
 function bounds(){
  const v=host.visualViewport,w=v?.width||host.innerWidth,h=v?.height||host.innerHeight,css=host.getComputedStyle(orb);
  const safe=side=>Math.max(10,parseFloat(css.getPropertyValue('--mp-safe-'+side))||0);
  const left=(v?.offsetLeft||0)+safe('left'),top=(v?.offsetTop||0)+safe('top'),size=Math.max(1,Math.min(tuning.size,w-safe('left')-safe('right'),h-safe('top')-safe('bottom')));
  return {left,top,size,right:(v?.offsetLeft||0)+w-safe('right')-size,bottom:(v?.offsetTop||0)+h-safe('bottom')-size};
 }
 function place(){const b=bounds();Object.assign(orb.style,{position:'fixed',transform:'none',width:b.size+'px',height:b.size+'px',left:(dock.side==='left'?b.left:b.right)+'px',top:(b.top+dock.ratio*Math.max(0,b.bottom-b.top))+'px'});}
 function cancel(){presentation.cancel();}
 function resize(){drag=null;suppress=true;cancel();place();presentation.follow();}

 function down(e){if(e.isPrimary===false||(e.button!==undefined&&e.button!==0))return;const r=orb.getBoundingClientRect();drag={id:e.pointerId,x:e.clientX,y:e.clientY,left:r.left,top:r.top,bounds:bounds(),moved:false};suppress=false;try{orb.setPointerCapture(e.pointerId);}catch(_){}}
 function move(e){if(!drag||drag.id!==e.pointerId)return;const dx=e.clientX-drag.x,dy=e.clientY-drag.y;if(Math.hypot(dx,dy)>tuning.dragThreshold)drag.moved=true;if(!drag.moved)return;e.preventDefault();const b=drag.bounds;drag.leftNow=Math.max(b.left,Math.min(b.right,drag.left+dx));drag.topNow=Math.max(b.top,Math.min(b.bottom,drag.top+dy));orb.style.transform=`translate(${drag.leftNow-drag.left}px,${drag.topNow-drag.top}px)`;follow();}
 function end(e){if(!drag||e.pointerId!==drag.id)return;const old=drag;drag=null;suppress=old.moved;try{orb.releasePointerCapture(e.pointerId);}catch(_){}if(old.moved){const b=bounds();dock={side:old.leftNow<(b.left+b.right)/2?'left':'right',ratio:Math.max(0,Math.min(1,(old.topNow-b.top)/Math.max(1,b.bottom-b.top)))};try{host.localStorage.setItem(key,JSON.stringify(dock));}catch(_){}place();settlePosition();}}
 function abort(e){if(!drag||drag.id!==e.pointerId)return;drag=null;suppress=true;place();settlePosition();}
 function click(e){if(suppress&&e.detail!==0){suppress=false;e.preventDefault();return;}suppress=false;if(!disposed)void Promise.resolve().then(open).catch(onError);}
 const listeners={pointerdown:down,pointermove:move,pointerup:end,pointercancel:abort,lostpointercapture:abort,click};
 for(const[name,fn]of Object.entries(listeners))orb.addEventListener(name,fn);
 for(const name of ['resize','orientationchange'])host.addEventListener(name,resize);
 host.visualViewport?.addEventListener('resize',resize);host.visualViewport?.addEventListener('scroll',resize);place();
 function transition(panel,opening){
  if(disposed||!panel)return Promise.resolve(false);
  if(pending?.opening===opening)return pending.task;
  const task=queue.then(async()=>{
   if(disposed)return false;
   if(opening&&!panel.hidden){panel.focus?.({preventScroll:true});return true;}
   if(!opening&&panel.hidden)return true;
   activePanel=panel;panel.hidden=false;panel.inert=true;panel.dataset.surfaceState=opening?'opening':'closing';
   await presentation.run(panel,opening);
   if(disposed)return false;
   panel.hidden=!opening;panel.inert=!opening;panel.dataset.surfaceState=opening?'open':'closed';
   if(opening)panel.focus?.({preventScroll:true});else{activePanel=null;presentation.release();orb.focus({preventScroll:true});}
   return true;
  });queue=task.catch(onError);pending={opening,task};void task.finally(()=>{if(pending?.task===task)pending=null;}).catch(()=>{});return task;
 }
 return {presentation,getOrigin:()=>disposed?null:orb,setActive:active=>{if(active)orb.dataset.surfaceActive='true';else delete orb.dataset.surfaceActive;},highlight:()=>orb.focus({preventScroll:true}),show:panel=>transition(panel,true),close:panel=>transition(panel,false),
  dispose(){if(disposed)return;disposed=true;presentation.dispose();if(followFrame)caf(followFrame);followFrame=0;if(activePanel){activePanel.hidden=true;activePanel.inert=true;}for(const[name,fn]of Object.entries(listeners))orb.removeEventListener(name,fn);for(const name of ['resize','orientationchange'])host.removeEventListener(name,resize);host.visualViewport?.removeEventListener('resize',resize);host.visualViewport?.removeEventListener('scroll',resize);orb.remove();style.remove();},
 };
}
