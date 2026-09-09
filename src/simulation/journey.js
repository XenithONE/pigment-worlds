export const WORLD_INFO = [
  { name:'星月夜の丘', artist:'Vincent van Gogh', mood:'群青と金色の、眠らない夜。', sky:'starry-sky', colors:['星の金','夜の群青','糸杉の緑'], note:'星は、静かな夜にも流れていた。' },
  { name:'睡蓮の庭', artist:'Claude Monet', mood:'水面にほどける、午後の光。', sky:'garden-sky', colors:['睡蓮の桃','水面の翡翠','木漏れ日の白'], note:'水に映る光は、いつも少し違う色。' },
  { name:'黄金の渓谷', artist:'Gustav Klimt · 空想の油彩', mood:'青い絵具の川を、黄金の樹が見下ろす。', sky:'golden-sky', colors:['樹冠の黄金','流れる群青','琥珀の光'], note:'絵具は川になり、光は樹の枝に残った。' },
  { name:'光の海岸', artist:'J. M. W. Turner', mood:'霧と海のあいだに、光を探す。', sky:'mist-sky', colors:['霧の真珠','夕映えの橙','海の青灰'], note:'水平線が消えても、光はそこにある。' },
];
export const SAVE_KEY = 'pigment-journey-v1';
const validIds = new Set(Array.from({length:4},(_,w)=>['a','b','c'].map(c=>`${w}-${c}`)).flat());
export function sanitizeSave(input) {
  return { version:1, collected:Array.isArray(input?.collected)?[...new Set(input.collected.filter(id=>validIds.has(id)))]:[], visited:Array.isArray(input?.visited)?[...new Set(input.visited.filter(i=>Number.isInteger(i)&&i>=0&&i<4))]:[] };
}
export function createJourney(saved={}) {
  const state=sanitizeSave(saved);
  return { state, visit(id){if(Number.isInteger(id)&&id>=0&&id<4&&!state.visited.includes(id))state.visited.push(id);}, collect(id){if(!validIds.has(id)||state.collected.includes(id))return false;state.collected.push(id);return true;}, has(id){return state.collected.includes(id);}, count(world){return state.collected.filter(id=>id.startsWith(`${world}-`)).length;} };
}
export function moveOnGround(position,yaw,forward,side,dt,speed=4.2,radius=58){
  const scale=Math.max(1,Math.hypot(forward,side));
  const distance=Math.max(0,Math.min(dt,.05))*speed;
  let x=position.x+(Math.cos(yaw)*side-Math.sin(yaw)*forward)/scale*distance;
  let z=position.z+(-Math.cos(yaw)*forward-Math.sin(yaw)*side)/scale*distance;
  const length=Math.hypot(x,z);if(length>radius){x*=radius/length;z*=radius/length;}
  return {x,z};
}
