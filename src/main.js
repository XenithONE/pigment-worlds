import './style.css';
import * as THREE from 'three';
import { createPaintPipeline, configurePaintShadows } from './render/paint-pipeline.js';
import { createWorld } from './render/worlds.js';
import { applyOilMaterials, loadOilPaintTexture } from './render/oil-material.js';
import { applySculptedRelief } from './render/surface-relief.js';
import { loadPaintedFloraAtlas } from './render/painted-flora.js';
import { loadPaintedVistas, addPaintedVistas } from './render/painted-vistas.js';
import { loadCanyonVista, addCanyonVista } from './render/canyon-vista.js';
import { WORLD_INFO, SAVE_KEY, createJourney, moveOnGround } from './simulation/journey.js';
import { slideAroundPaint } from './simulation/collision.js';
import { constrainTerrainStep } from './simulation/terrain-walk.js';
import { Soundscape } from './audio.js';

const $=s=>document.querySelector(s);
const canvas=$('#world');
const reducedQuery=matchMedia('(prefers-reduced-motion: reduce)');
let reducedMotion=reducedQuery.matches;
$('#motion').checked=!reducedMotion;
const touchDevice=()=>matchMedia('(pointer: coarse)').matches||innerWidth<701;
let saved={};try{saved=JSON.parse(localStorage.getItem(SAVE_KEY)||'{}');}catch{}
const journey=createJourney(saved);
const sound=new Soundscape();
const runtime={worldId:0,started:false,transitioning:false,ready:false,active:null,x:0,z:15,yaw:0,pitch:0,quality:touchDevice()?'auto':'high'};
$('#quality').value=runtime.quality;
const keys=new Set();
const frameTimes=[];
const stick={x:0,y:0};
let renderer,camera,composer,renderPass,paintPass,bloom,ao,world,skyTextures=[],portalTextures=[],environmentMaps=[],lastFrame=0,elapsed=0,drag=null,toastTimer,frameAverage=16,frameSamples=0,dynamicScale=1,contextLost=false;
const allMemories=new Map();

function fail(message){$('#error-detail').textContent=message;$('#error').hidden=false;}
function notify(message){clearTimeout(toastTimer);$('#toast').textContent=message;$('#toast').classList.add('visible');toastTimer=setTimeout(()=>$('#toast').classList.remove('visible'),4200);}
function persist(){try{localStorage.setItem(SAVE_KEY,JSON.stringify(journey.state));}catch{notify('このブラウザでは記録を保存できません。旅はそのまま続けられます。');}}
function memoryId(w,i){return `${w}-${['a','b','c'][i]}`;}
function updateProgress(){
  $('#quest-count').textContent=`${journey.state.collected.length} / 12  ·  この世界 ${journey.count(runtime.worldId)} / 3`;
  $('#quest-title').textContent=journey.state.collected.length===12?'12色の旅が、ひとつの絵に。':'色のかけらを探す';
  if(world?.memoryMeshes)for(const [id,mesh] of world.memoryMeshes)mesh.visible=!journey.has(id);
  document.querySelectorAll('.world-card').forEach((card,w)=>{card.classList.toggle('current',runtime.worldId===w);card.querySelectorAll('.card-colors i').forEach((item,i)=>item.classList.toggle('found',journey.has(memoryId(w,i))));});
}
function populateWorlds(){
  $('#world-list').innerHTML=WORLD_INFO.map((info,i)=>`<button class="world-card${i===runtime.worldId?' current':''}" data-world="${i}" aria-label="${info.name}へ旅する"><img src="${import.meta.env.BASE_URL}art/${info.sky.replace('-sky','-portal')}.webp" alt="" /><span class="card-number">0${i+1}</span><span class="card-copy"><strong>${info.name}</strong><small>${info.artist}<br />${info.mood}</small></span><span class="card-colors" aria-hidden="true"><i></i><i></i><i></i></span></button>`).join('');
  document.querySelectorAll('[data-world]').forEach(button=>button.addEventListener('click',()=>{if(!runtime.ready)return;closeDialogs();travel(Number(button.dataset.world));}));
  updateProgress();
}
function populateJournal(){
  const count=journey.state.collected.length;
  $('#journal-summary').textContent=count===12?'12の色が集まりました。あなたの歩いた道が、ひとつの絵になりました。':`${journey.state.visited.length}つの世界を訪れ、${count}の色を見つけました。`;
  $('#journal-content').innerHTML=WORLD_INFO.map((info,w)=>`<section class="journal-world"><h3>0${w+1}　${info.name}</h3><div class="journal-swatches">${info.colors.map((color,i)=>`<span class="${journey.has(memoryId(w,i))?'found':''}">${journey.has(memoryId(w,i))?color:'まだ見つけていない色'}</span>`).join('')}</div>${journey.count(w)===3?`<p class="credit-note">${info.note}</p>`:''}</section>`).join('');
}
function dialogOpen(){return !!document.querySelector('dialog[open]');}
function clearInput(){keys.clear();stick.x=stick.y=0;$('#joystick span').style.transform='';drag=null;}
function openDialog(id){clearInput();if(id==='#journal-dialog')populateJournal();$(id).showModal();}
function closeDialogs(){document.querySelectorAll('dialog[open]').forEach(d=>d.close());clearInput();}
document.querySelectorAll('dialog').forEach(d=>{
  d.querySelector('.close').addEventListener('click',()=>d.close());
  d.addEventListener('click',e=>{if(e.target===d){const r=d.getBoundingClientRect();if(e.clientX<r.left||e.clientX>r.right||e.clientY<r.top||e.clientY>r.bottom)d.close();}});
  d.addEventListener('close',clearInput);
});
$('#worlds-button').addEventListener('click',()=>openDialog('#worlds-dialog'));
$('#help-button').addEventListener('click',()=>openDialog('#help-dialog'));
$('#journal-button').addEventListener('click',()=>openDialog('#journal-dialog'));
$('#audio-button').addEventListener('click',async()=>{try{const enabled=await sound.toggle();$('#audio-button').textContent=enabled?'音 ON':'音 OFF';$('#audio-button').setAttribute('aria-pressed',String(enabled));}catch(e){notify(e.message||'音声を再生できませんでした。');}});
$('#quality').addEventListener('change',e=>{runtime.quality=e.target.value;dynamicScale=1;frameTimes.length=0;frameSamples=0;if(renderer&&world)configurePaintShadows(renderer,world.scene,runtime.quality);world?.setDetailLevel?.(runtime.quality==='auto'&&touchDevice()?'low':runtime.quality);resize();});
$('#motion').addEventListener('change',e=>{reducedMotion=!e.target.checked;world?.setReducedMotion?.(reducedMotion);});
reducedQuery.addEventListener('change',e=>{reducedMotion=e.matches;$('#motion').checked=!reducedMotion;world?.setReducedMotion?.(reducedMotion);});
$('#reset-position').addEventListener('click',()=>{if(world){resetPosition();closeDialogs();notify('この世界の入口へ戻りました。');}});
$('#start-button').addEventListener('click',startJourney);
$('#interact').addEventListener('click',interact);
$('#photo-button').addEventListener('click',takePhoto);

function startJourney(){
  if(!runtime.ready||runtime.transitioning)return;
  runtime.started=true;document.body.classList.add('playing');$('#intro').inert=true;$('#intro').setAttribute('aria-hidden','true');$('#quest').hidden=false;$('#reticle').hidden=false;$('#photo-button').hidden=false;
  $('#touch-controls').hidden=!touchDevice();$('#controls-hint').textContent='WASDで歩く · ドラッグで見回す · SPACEで調べる';
  journey.visit(runtime.worldId);persist();updateProgress();
  notify('光る色のかけらを探して、額縁の向こうへ。');
  canvas.tabIndex=0;canvas.focus({preventScroll:true});
}
function resetPosition(){
  runtime.x=world.spawn.x;runtime.z=world.spawn.z;runtime.yaw=(world.spawn.yaw||0)-(touchDevice()?.2:0);runtime.pitch=world.spawn.pitch??-.015;
  camera.fov=touchDevice()?67:runtime.worldId===2?65:59;camera.updateProjectionMatrix();
  camera.position.set(runtime.x,world.groundHeight(runtime.x,runtime.z)+1.8,runtime.z);camera.rotation.set(runtime.pitch,runtime.yaw,0,'YXZ');
  clearInput();
}
function setWorld(id){
  runtime.worldId=id;
  const previous=world;
  world=createWorld(id,{skyTextures,portalTextures,reducedMotion});
  const vista=addPaintedVistas(world.scene,{id});
  const canyonVista=id===2?addCanyonVista(world.scene):null;
  if(id===0||id===1) world.scene.traverse(object=>{
    const materials=Array.isArray(object.material)?object.material:[object.material];
    if(object.name.startsWith('mountain-range-')||(id===0&&(object.name.startsWith('castle-')||object.name.startsWith('village-windows')||materials.some(m=>m?.name?.startsWith('village-painted-'))))) object.visible=false;
  });
  const disposeWorld=world.dispose;
  world.dispose=()=>{vista.dispose();canyonVista?.dispose();disposeWorld();};
  const richPigment=true;
  world.relief=applySculptedRelief(world.scene,{richPigment});
  world.memoryMeshes.forEach(group=>group.traverse(object=>{object.castShadow=false;}));
  world.oil=applyOilMaterials(world.scene,{richPigment});
  world.scene.environment=environmentMaps[id].texture;
  world.scene.environmentIntensity=id===0?.22:.18;
  // A low, warm key skims the raised paint; restrained sky fill leaves cool
  // coloured cavities between the swipes instead of bleaching every surface.
  const paintKey=world.scene.getObjectByName('paint-sun');
  const keyPositions=[[-24,26,-14],[-28,24,-14],[-28,38,26],[-38,20,-28]];
  paintKey.position.set(...keyPositions[id]);paintKey.intensity=[3.6,3.5,3.7,3.5][id];
  world.scene.children.filter(object=>object.isHemisphereLight).forEach(light=>{light.intensity=[.60,.52,.72,.52][id];});
  configurePaintShadows(renderer,world.scene,runtime.quality);
  world.setDetailLevel?.(runtime.quality==='auto'&&touchDevice()?'low':runtime.quality);
  world.scene.traverse(object=>object.userData.paintLiquid?.setReflectionEnabled(runtime.quality!=='low'&&(!touchDevice()||runtime.quality==='high')));
  previous?.oil?.dispose();
  previous?.relief?.dispose();
  const previousLiquids=[];previous?.scene.traverse(object=>{if(object.userData.paintLiquid)previousLiquids.push(object.userData.paintLiquid);});
  previousLiquids.forEach(liquid=>liquid.dispose());
  previous?.scene.traverse(object=>object.shadow?.dispose());
  previous?.dispose();
  world.memories.forEach((memory,i)=>{memory.id=memoryId(id,i);allMemories.set(memory.id,memory);});
  renderPass.scene=world.scene;ao.scene=world.scene;frameTimes.length=0;frameSamples=0;
  sound.setWorld(id);resetPosition();
  $('#scene-number').textContent=`0${id+1} / 04`;
  $('#scene-name').textContent=WORLD_INFO[id].name;
  updateProgress();runtime.active=null;$('#interact').hidden=true;
}
async function travel(id){
  if(runtime.transitioning||!runtime.ready)return;
  if(id===runtime.worldId){if(!runtime.started)startJourney();else notify('この世界を歩いています。');return;}
  runtime.transitioning=true;clearInput();
  const transition=$('#transition');transition.querySelector('span').textContent=WORLD_INFO[id].name;transition.querySelector('small').textContent=WORLD_INFO[id].artist;transition.classList.add('visible');
  await new Promise(r=>setTimeout(r,reducedMotion?80:720));
  try{setWorld(id);if(runtime.started){journey.visit(id);persist();}else{runtime.transitioning=false;startJourney();runtime.transitioning=true;}
    await renderer.compileAsync(world.scene,camera);
    await new Promise(r=>setTimeout(r,200));
  }catch(e){console.error(e);fail('世界の描画に失敗しました。ページを再読み込みしてください。');}
  transition.classList.remove('visible');runtime.transitioning=false;updateProgress();
  if(runtime.started)canvas.focus({preventScroll:true});
}
function nearestAction(){
  if(!runtime.started||runtime.transitioning||dialogOpen())return null;
  let target=null,min=3.0;
  for(const m of world.memories){if(journey.has(m.id))continue;const d=Math.hypot(m.x-runtime.x,m.z-runtime.z);if(d<min){min=d;target={type:'memory',memory:m};}}
  const d=Math.hypot(world.portal.x-runtime.x,world.portal.z-runtime.z);
  if(!target&&d<4.8)target={type:'portal',next:world.portal.next};
  return target;
}
function interact(){
  if(!runtime.started||runtime.transitioning||dialogOpen())return;
  const action=nearestAction();if(!action)return;
  if(action.type==='portal'){travel(action.next);return;}
  const {memory}=action;
  if(journey.collect(memory.id)){
    persist();updateProgress();sound.chime();
    const index=['a','b','c'].indexOf(memory.id.split('-')[1]);
    if(journey.state.collected.length===12){notify('12の色が集まりました。旅の記録に、あなたの色が残りました。');setTimeout(()=>{if(!dialogOpen())openDialog('#journal-dialog');},2000);}
    else if(journey.count(runtime.worldId)===3)notify(`${WORLD_INFO[runtime.worldId].name}の3色が揃いました。次は額縁の向こうへ。`);
    else notify(`「${WORLD_INFO[runtime.worldId].colors[index]}」を見つけました。`);
  }
  runtime.active=null;
}
function takePhoto(){
  if(!runtime.ready||runtime.transitioning)return;
  composer.render();
  canvas.toBlob(blob=>{if(!blob){notify('写真を保存できませんでした。');return;}const url=URL.createObjectURL(blob),a=document.createElement('a');a.href=url;a.download=`PIGMENT-${WORLD_INFO[runtime.worldId].sky}-${Date.now()}.png`;a.click();setTimeout(()=>URL.revokeObjectURL(url),10000);notify('この景色を、写真に残しました。');},'image/png');
}
window.addEventListener('keydown',e=>{
  if(e.target instanceof HTMLElement&&e.target.closest('button,a,input,select,textarea,[contenteditable="true"]'))return;
  if(dialogOpen())return;
  if(e.code==='KeyM'){e.preventDefault();openDialog('#worlds-dialog');return;}
  if(!runtime.started)return;
  if(['Space','ArrowUp','ArrowDown','ArrowLeft','ArrowRight'].includes(e.code))e.preventDefault();
  if((e.code==='Space'||e.code==='Enter')&&!e.repeat){interact();return;}
  if(e.code==='Escape'){clearInput();openDialog('#help-dialog');return;}
  keys.add(e.code);
});
window.addEventListener('keyup',e=>keys.delete(e.code));
window.addEventListener('blur',clearInput);
document.addEventListener('visibilitychange',()=>{clearInput();lastFrame=0;if(document.hidden)sound.pause();else sound.resume();});
canvas.addEventListener('pointerdown',e=>{if(dialogOpen()||runtime.transitioning)return;drag={id:e.pointerId,x:e.clientX,y:e.clientY};canvas.setPointerCapture(e.pointerId);});
canvas.addEventListener('pointermove',e=>{if(!drag||drag.id!==e.pointerId)return;runtime.yaw-=(e.clientX-drag.x)*.0031;runtime.pitch=THREE.MathUtils.clamp(runtime.pitch-(e.clientY-drag.y)*.0026,-1.05,1.05);drag.x=e.clientX;drag.y=e.clientY;});
function stopDrag(e){if(drag?.id===e.pointerId)drag=null;}
canvas.addEventListener('pointerup',stopDrag);canvas.addEventListener('pointercancel',stopDrag);canvas.addEventListener('lostpointercapture',stopDrag);
canvas.addEventListener('contextmenu',e=>e.preventDefault());
const joystick=$('#joystick');let stickId=null;
function updateStick(e){const r=joystick.getBoundingClientRect(),dx=e.clientX-r.left-r.width/2,dy=e.clientY-r.top-r.height/2,length=Math.max(1,Math.hypot(dx,dy)/38);stick.x=dx/length/38;stick.y=-dy/length/38;joystick.querySelector('span').style.transform=`translate(${stick.x*30}px,${-stick.y*30}px)`;}
joystick.addEventListener('pointerdown',e=>{stickId=e.pointerId;joystick.setPointerCapture(e.pointerId);updateStick(e);});
joystick.addEventListener('pointermove',e=>{if(e.pointerId===stickId)updateStick(e);});
for(const type of ['pointerup','pointercancel','lostpointercapture'])joystick.addEventListener(type,e=>{if(e.pointerId===stickId){stickId=null;stick.x=stick.y=0;joystick.querySelector('span').style.transform='';}});

function resize(){
  if(!renderer)return;
  const high=runtime.quality==='high',low=runtime.quality==='low';
  const cap=high?2:low?.85:touchDevice()?1.15:1.5;
  const ratio=Math.min(high&&!touchDevice()?Math.max(devicePixelRatio,1.25):devicePixelRatio,cap)*dynamicScale;
  renderer.setPixelRatio(ratio);renderer.setSize(innerWidth,innerHeight,false);
  camera.aspect=innerWidth/innerHeight;camera.fov=touchDevice()?67:runtime.worldId===2?65:59;camera.updateProjectionMatrix();
  composer.setPixelRatio(ratio);composer.setSize(innerWidth,innerHeight);
  paintPass.uniforms.resolution.value.set(innerWidth*ratio,innerHeight*ratio);
  bloom.enabled=!low;
  ao.enabled=!low;
  world?.scene.traverse(object=>object.userData.paintLiquid?.setReflectionEnabled(!low&&(!touchDevice()||high)));
  for(const target of [composer.renderTarget1,composer.renderTarget2]) { const samples=low?0:high?4:2;if(target.samples!==samples){target.samples=samples;target.dispose();} }
  world?.setDetailLevel?.(runtime.quality==='auto'&&touchDevice()?'low':runtime.quality);
  $('#touch-controls').hidden=!runtime.started||!touchDevice();
  if(!runtime.started)$('#controls-hint').textContent=touchDevice()?'画面をなぞって見回す':'ドラッグで見回す · WASDで歩く';
}
function animate(now){
  requestAnimationFrame(animate);
  if(document.hidden||!runtime.ready||contextLost){lastFrame=0;return;}
  const rawFrame=lastFrame?(now-lastFrame):1000/60;lastFrame=now;
  const rawDt=Math.min(rawFrame/1000,.1);
  if(!runtime.transitioning){frameTimes.push(rawFrame);if(frameTimes.length>240)frameTimes.shift();}
  const dt=Math.min(rawDt,.05);elapsed+=dt;
  if(!runtime.transitioning&&!dialogOpen()){
    if(runtime.started){
      const f=Number(keys.has('KeyW')||keys.has('ArrowUp'))-Number(keys.has('KeyS')||keys.has('ArrowDown'))+stick.y;
      const s=Number(keys.has('KeyD'))-Number(keys.has('KeyA'))+stick.x;
      runtime.yaw+=(Number(keys.has('KeyQ')||keys.has('ArrowLeft'))-Number(keys.has('KeyE')||keys.has('ArrowRight')))*dt*1.1;
      const desired=moveOnGround(runtime,runtime.yaw,f,s,dt,keys.has('ShiftLeft')||keys.has('ShiftRight')?7.3:4.2);
      const aroundRocks=slideAroundPaint(runtime,desired,world.obstacles);
      const pos=(runtime.worldId===0||runtime.worldId===2)?constrainTerrainStep(runtime,aroundRocks,world.groundHeight,{
        isPositionAllowed:(x,z,from)=>world.obstacles.every(obstacle=>{
          const radius=obstacle.radius+.26;
          const after=Math.hypot(x-obstacle.x,z-obstacle.z),before=Math.hypot(from.x-obstacle.x,from.z-obstacle.z);
          return after>=radius||(before<radius&&after>=before-1e-8);
        }),
      }):aroundRocks;
      runtime.x=pos.x;runtime.z=pos.z;
      const bob=!reducedMotion&&(f||s)?Math.sin(elapsed*8)*.026:0;
      const y=world.groundHeight(runtime.x,runtime.z)+1.8+bob;
      camera.position.set(runtime.x,THREE.MathUtils.lerp(camera.position.y,y,Math.min(1,dt*12)),runtime.z);
    }
    camera.rotation.set(runtime.pitch,runtime.yaw,0,'YXZ');
  }
  world.update(reducedMotion?0:elapsed, reducedMotion?0:dt,camera);
  world.oil?.update(reducedMotion?0:elapsed);
  const active=nearestAction();
  if(JSON.stringify(active)!==JSON.stringify(runtime.active)){
    runtime.active=active;$('#interact').hidden=!active;
    if(active){const prefix=touchDevice()?'':'SPACE　';$('#interact').textContent=prefix+(active.type==='portal'?`${WORLD_INFO[active.next].name}へ`:'色のかけらを拾う');}
  }
  renderer.info.reset();composer.render();
  frameAverage=frameAverage*.98+rawFrame*.02;
  if(runtime.quality==='auto'&&!runtime.transitioning&&++frameSamples>=120){
    frameSamples=0;
    // Shader compilation or opening a world may stall a handful of frames.
    // Lower quality only for sustained load, not one startup compilation spike.
    const recent=frameTimes.slice(-120).sort((a,b)=>a-b);
    const sustained=recent[Math.floor(recent.length*.5)]||16;
    if(sustained>35&&dynamicScale>.65){dynamicScale=Math.max(.65,dynamicScale-.1);resize();}
  }
}
async function boot(){
  try{
    renderer=new THREE.WebGLRenderer({canvas,antialias:true,alpha:false,powerPreference:'high-performance',preserveDrawingBuffer:true});
    renderer.outputColorSpace=THREE.SRGBColorSpace;renderer.toneMapping=THREE.ACESFilmicToneMapping;renderer.toneMappingExposure=1.0;
    renderer.info.autoReset=false;
    camera=new THREE.PerspectiveCamera(59,innerWidth/innerHeight,.1,500);camera.rotation.order='YXZ';
    ({composer,renderPass,paintPass,bloom,ao}=createPaintPipeline(renderer,camera));
    resize();
    let loaded=0;
    const loader=new THREE.TextureLoader();
    skyTextures=await Promise.all(WORLD_INFO.map(async info=>{const texture=await loader.loadAsync(`${import.meta.env.BASE_URL}art/${info.sky}.webp`);texture.colorSpace=THREE.SRGBColorSpace;texture.anisotropy=Math.min(4,renderer.capabilities.getMaxAnisotropy());$('#loading-status').textContent=`${++loaded} / 4 の世界に、色が入りました`;return texture;}));
    portalTextures=await Promise.all(WORLD_INFO.map(async info=>{const texture=await loader.loadAsync(`${import.meta.env.BASE_URL}art/${info.sky.replace('-sky','-portal')}.webp`);texture.colorSpace=THREE.SRGBColorSpace;return texture;}));
    const pmrem=new THREE.PMREMGenerator(renderer);environmentMaps=skyTextures.map(texture=>pmrem.fromEquirectangular(texture));pmrem.dispose();
    $('#loading-status').textContent='厚い絵具に、光を入れています';
    await Promise.all([loadOilPaintTexture(),loadPaintedFloraAtlas(),loadPaintedVistas(),loadCanyonVista()]);
    setWorld(0);await renderer.compileAsync(world.scene,camera);runtime.ready=true;
    $('#start-button').disabled=false;$('#start-button span').textContent='旅をはじめる';$('#loading-status').textContent='';
    requestAnimationFrame(animate);
  }catch(e){console.error(e);fail('WebGL 2に対応したブラウザで開いてください。対応している場合は、通信状態やブラウザのグラフィック設定を確認してから、もう一度お試しください。');}
}
window.addEventListener('resize',resize);
canvas.addEventListener('webglcontextlost',e=>{e.preventDefault();contextLost=true;clearInput();fail('描画が一時的に中断されました。集めた色は保存されています。もう一度ひらいて旅を再開してください。');});
canvas.addEventListener('webglcontextrestored',()=>location.reload());
populateWorlds();boot();

// Development-only read-only diagnostics: game progress is changed through actual controls.
if(import.meta.env.DEV)Object.defineProperty(window,'__PIGMENT__',{get:()=>({worldId:runtime.worldId,started:runtime.started,ready:runtime.ready,position:{x:runtime.x,z:runtime.z,yaw:runtime.yaw,pitch:runtime.pitch},collected:[...journey.state.collected],visited:[...journey.state.visited],memories:world?.memories.map(m=>({id:m.id,x:m.x,z:m.z})),portal:world?.portal,obstacles:world?.obstacles,drawCalls:renderer?.info.render.calls,triangles:renderer?.info.render.triangles,frameMs:frameAverage,frameMedian:frameTimes.length?[...frameTimes].sort((a,b)=>a-b)[Math.floor(frameTimes.length*.5)]:null,frameP95:frameTimes.length?[...frameTimes].sort((a,b)=>a-b)[Math.floor(frameTimes.length*.95)]:null,quality:runtime.quality,pixelRatio:renderer?.getPixelRatio(),geometries:renderer?.info.memory.geometries,textures:renderer?.info.memory.textures})});
