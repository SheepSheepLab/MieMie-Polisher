// One external-orb presentation for Standalone and Hub Shortcut. Navigation,
// hidden/inert state and business lifetime belong to the caller, never this module.
export function createNativeFloatingPresentation({host,orb,bounds}) {
 const doc=host.document,animations=new Set(),cleanups=new Set();
 let generation=0,activePanel=null,disposed=false;
 const reduced=()=>!!host.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
 function cancel(){++generation;for(const a of animations)a.cancel();animations.clear();for(const cleanup of [...cleanups])cleanup();}
 // Native floating geometry is deliberately independent of Hub's centered Surface.
 function fit(panel){
  if(!panel)return;const b=bounds(),orbRect=orb.getBoundingClientRect();
  const width=Math.max(1,Math.min(600,b.right+b.size-b.left)),height=Math.max(1,Math.min(780,b.bottom+b.size-b.top));
  const sideLeft=orbRect.left+orbRect.width/2>(b.left+b.right+b.size)/2?orbRect.left-width-12:orbRect.left+orbRect.width+12;
  const left=Math.max(b.left,Math.min(b.right+b.size-width,sideLeft));
  const top=Math.max(b.top,Math.min(b.bottom+b.size-height,orbRect.top+orbRect.height/2-height*.5));
  // Reset legacy anchors and percentage max-height. setProperty requires CSS
  // hyphenated names: maxHeight is ignored, leaving the legacy percentage
  // constraint active after Safari resizes the viewport.
  for(const[key,value]of Object.entries({position:'fixed',left:left+'px',top:top+'px',right:'auto',bottom:'auto',transform:'none',width:width+'px',height:height+'px','max-height':height+'px'}))panel.style.setProperty(key,value,key==='transform'?'':'important');
 }
 function prepareHeader(panel,target){
  const r=panel.getBoundingClientRect(),size=Math.min(148,r.width-24,r.height-24);
  if(size<=0)return null;
  const theme=host.getComputedStyle(orb),overlay=doc.createElement('div'),veil=doc.createElement('div'),face=doc.createElement('img');
  overlay.dataset.polisherSurfaceSplash='';overlay.setAttribute('aria-hidden','true');overlay.inert=true;
  Object.assign(overlay.style,{position:'absolute',inset:'0',zIndex:'2147483647',pointerEvents:'none',borderRadius:'inherit'});
  veil.dataset.polisherSurfaceVeil='';const blur=theme.getPropertyValue('--mp-blur-hero').trim()||'14px';
  Object.assign(veil.style,{position:'absolute',inset:'0',borderRadius:'inherit',background:theme.getPropertyValue('--mp-hero-backdrop').trim()||'#201332b8',backdropFilter:'blur('+blur+')',webkitBackdropFilter:'blur('+blur+')'});
  face.src=target.currentSrc||target.src;face.alt='';face.dataset.polisherHeaderHero='';
  Object.assign(face.style,{position:'absolute',left:(r.width-size)/2+panel.scrollLeft+'px',top:(r.height-size)/2+panel.scrollTop+'px',width:size+'px',height:size+'px',maxWidth:'none',borderRadius:'50%',transformOrigin:'center',objectFit:'contain'});
  overlay.append(veil,face);panel.append(overlay);const visibility=target.style.visibility;target.style.visibility='hidden';let cleaned=false;
  const cleanup=()=>{if(cleaned)return;cleaned=true;overlay.remove();target.style.visibility=visibility;cleanups.delete(cleanup);};cleanups.add(cleanup);
  return {cleanup,async land(){
   if(cleaned)return;const from=face.getBoundingClientRect(),to=target.getBoundingClientRect();if(!from.width||!to.width){cleanup();return;}
   const raw=theme.getPropertyValue('--mp-motion-hero').trim(),options={duration:parseFloat(raw)*(raw.endsWith('ms')?1:1000)||0,easing:theme.getPropertyValue('--mp-ease-hero').trim()||'ease'};
   const destination=`translate(${to.left+to.width/2-from.left-from.width/2}px,${to.top+to.height/2-from.top-from.height/2}px) scale(${to.width/from.width},${to.height/from.height})`;
   try{await Promise.all([
    animateNative(face,[{transform:'none',clipPath:'circle(49%)'},{transform:'none',clipPath:'circle(49%)',offset:.16},{transform:destination,clipPath:'circle(71%)'}],options),
    animateNative(veil,[{opacity:1},{opacity:1,offset:.16},{opacity:0}],{...options,easing:'ease-in-out'}),
   ]);}finally{cleanup();}
  }};
 }
 async function animateNative(element,frames,options){const a=element.animate(frames,{...options,fill:'both'});animations.add(a);try{await a.finished;}catch(_){}finally{a.cancel();animations.delete(a);}}

 async function run(panel,opening){
  if(disposed||!orb.isConnected)return false;
   const epoch=generation;activePanel=panel;fit(panel);
   const header=opening?panel.querySelector('[data-tool-icon]'):null,hero=header&&panel.animate&&!reduced()?prepareHeader(panel,header):null;
   const r=panel.getBoundingClientRect(),o=orb.getBoundingClientRect();
   if(panel.animate&&!reduced()&&r.width&&r.height&&o.width){
    const css=host.getComputedStyle(orb),raw=css.getPropertyValue(opening?'--mp-motion-open':'--mp-motion-close').trim();
    const duration=parseFloat(raw)*(raw.endsWith('ms')?1:1000)||0;
    const small={transform:`translate(${o.left-r.left}px,${o.top-r.top}px) scale(${o.width/r.width},${o.height/r.height})`,opacity:0,clipPath:'inset(0 round 50%)'},large={transform:'none',opacity:1,clipPath:'inset(0 round '+host.getComputedStyle(panel).borderRadius+')'};

    const saved=panel.style.transformOrigin;panel.style.transformOrigin='0 0';
    // The native orb stays visible above the moving panel throughout both flights.
    // It is a persistent anchor, not artwork replaced by the Surface.
    orb.dataset.surfaceActive='true';
    let cleaned=false;const cleanup=()=>{if(cleaned)return;cleaned=true;delete orb.dataset.surfaceActive;panel.style.transformOrigin=saved;cleanups.delete(cleanup);};cleanups.add(cleanup);
    try{
     const run=async(el,frames)=>{const a=el.animate(frames,{duration,easing:css.getPropertyValue('--mp-ease-surface').trim()||'ease',fill:'both'});animations.add(a);try{await a.finished;}catch(_){}finally{a.cancel();animations.delete(a);}};
     await run(panel,opening?[small,large]:[large,small]);
    }catch(error){hero?.cleanup();throw error;}finally{cleanup();}
   }
   try{if(hero&&epoch===generation)await hero.land();}finally{hero?.cleanup();}
  return !disposed;
 }
 function release(){cancel();activePanel=null;}
 return Object.freeze({
  place:panel=>{if(!disposed)fit(panel);}, run, cancel, release,
  follow:()=>{if(activePanel&&!activePanel.hidden)fit(activePanel);},
  dispose(){if(disposed)return;disposed=true;release();},
 });
}
