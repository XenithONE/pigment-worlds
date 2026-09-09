import { BufferGeometry, Float32BufferAttribute, Color, Vector3 } from 'three';

const TAU = Math.PI * 2;
const palettes = [
  ['#183e46', '#689584', '#364a95', '#a9b7e2'],
  ['#254e38', '#8eae70', '#bd6087', '#ffe0cf'],
  ['#203f3d', '#778868', '#b74a24', '#f7bc5c'],
  ['#4a5c53', '#a5ad87', '#aa9267', '#fff1d3'],
];

/** Closed deposited paint, including its underside and rounded terminal load.
 * Each quality level keeps the same stems and flowers: only sampling changes.
 * This geometry replaces the middle-distance crossed photograph cards. */
export function createPigmentHerbGeometry(world = 0, variant = 0, detail = 1) {
  const positions = [], colors = [], indices = [], uv = [];
  const palette = palettes[world], low = new Color(), high = new Color(), tint = new Color();
  const rows = [14, 8, 5][detail], sides = [10, 8, 6][detail];
  function deposit(start, control, end, width, depth, colorA, colorB, phase, stem = false) {
    const a = new Vector3(...start), b = new Vector3(...control), c = new Vector3(...end);
    const offset = positions.length / 3, stride = sides + 1;
    low.set(colorA); high.set(colorB);
    for (let row = 0; row <= rows; row++) {
      const t = .5 - .5 * Math.cos(row / rows * Math.PI);
      const center = a.clone().multiplyScalar((1-t)**2).addScaledVector(b, 2*t*(1-t)).addScaledVector(c,t*t);
      const tangent = b.clone().sub(a).multiplyScalar(1-t).addScaledVector(c.clone().sub(b),t).normalize();
      const across = new Vector3(0,1,0).cross(tangent);
      if (across.lengthSq() < .01) across.set(1,0,0).addScaledVector(tangent,-tangent.x);
      across.normalize();
      const normal = tangent.clone().cross(across).normalize();
      const envelope = stem ? .92-.52*t : Math.max(.015, Math.sin(Math.PI*t)**.43);
      for (let side = 0; side <= sides; side++) {
        const angle = side/sides*TAU, u = Math.cos(angle), v = Math.sin(angle);
        const irregular = 1 + .12*Math.sin(t*6.3+phase+u) + .05*Math.sin(t*16+phase*2);
        const x = u*width*envelope*irregular;
        const crease = Math.cos(u*8.4+.4*Math.sin(t*5+phase))*depth*.30*Math.sin(Math.PI*t);
        const lip = Math.exp(-(((u-.70)/.28)**2))*depth*.65*Math.sin(Math.PI*t);
        const z = Math.sign(v)*Math.abs(v)**.72*depth*envelope+crease+lip;
        const p = center.clone().addScaledVector(across,x).addScaledVector(normal,z);
        positions.push(p.x,p.y,p.z); uv.push(side/sides,t);
        tint.copy(low).lerp(high,Math.max(0,Math.min(1,.18+t*.63+.12*Math.sin(u*3+phase))));
        colors.push(tint.r,tint.g,tint.b);
        if(row<rows&&side<sides){const i=offset+row*stride+side;indices.push(i,i+1,i+stride,i+1,i+stride+1,i+stride);}
      }
    }
    for(const top of [false,true]) {
      const index=positions.length/3, point=top?c:a, ring=offset+(top?rows*stride:0);
      positions.push(point.x,point.y,point.z);uv.push(.5,top?1:0);colors.push(low.r,low.g,low.b);
      for(let side=0;side<sides;side++)indices.push(...(top?[index,ring+side,ring+side+1]:[index,ring+side+1,ring+side]));
    }
  }
  for(let branch=0;branch<3;branch++) {
    const angle=branch*2.39+variant*.7, height=.65+.16*Math.sin(branch*1.9+variant)+branch*.06;
    const x=Math.cos(angle)*.16,z=Math.sin(angle)*.16;
    deposit([0,0,0],[x*.25,height*.62,z*.6],[x,height,z],.013,.012,...palette.slice(0,2),angle,true);
    for(let leaf=0;leaf<4;leaf++) {
      const t=.22+leaf*.15, turn=angle+leaf*2.25, length=.20+.07*Math.sin(leaf*1.3+variant);
      const base=[x*t*t,height*t,z*t*t], end=[base[0]+Math.cos(turn)*length,base[1]+length*.28,base[2]+Math.sin(turn)*length];
      deposit(base,[(base[0]+end[0])*.5,base[1]+length*.55,(base[2]+end[2])*.5],end,.053+leaf*.003,.018,...palette.slice(0,2),turn);
    }
    const petals=world===0?5:6;
    for(let petal=0;petal<petals;petal++) {
      const turn=angle+petal/petals*TAU, reach=.10+.026*Math.sin(petal*2.1+variant);
      const tip=[x+Math.cos(turn)*reach,height+.024-.07*(petal%2),z+Math.sin(turn)*reach];
      deposit([x,height-.014,z],[x+Math.cos(turn)*reach*.58,height+.115,z+Math.sin(turn)*reach*.58],tip,.056,.020,...palette.slice(2),turn+variant);
    }
    deposit([x,height-.013,z],[x+.006,height+.030,z],[x+.004,height+.049,z+.005],.037,.037,'#885629','#e8ad4c',angle);
  }
  const geometry=new BufferGeometry();
  geometry.setAttribute('position',new Float32BufferAttribute(positions,3));
  geometry.setAttribute('uv',new Float32BufferAttribute(uv,2));
  geometry.setAttribute('color',new Float32BufferAttribute(colors,3));
  geometry.setIndex(indices);geometry.computeVertexNormals();
  // Weld the normal direction at each wrap without joining separate paint loads.
  const n=geometry.attributes.normal, span=(rows+1)*(sides+1)+2;
  const v=new Vector3(),w=new Vector3();
  for(let base=0;base<positions.length/3;base+=span)for(let row=0;row<=rows;row++){
    const i=base+row*(sides+1),j=i+sides;v.fromBufferAttribute(n,i).add(w.fromBufferAttribute(n,j)).normalize();n.setXYZ(i,...v.toArray());n.setXYZ(j,...v.toArray());
  }
  geometry.computeBoundingBox();geometry.computeBoundingSphere();
  geometry.name=`closed-pigment-herb-${world}-${variant}-${detail}`;
  return geometry;
}
