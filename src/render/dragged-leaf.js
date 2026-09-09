import {BufferGeometry,Float32BufferAttribute,Vector3} from 'three';

const TAU=Math.PI*2;
const smooth=(a,b,x)=>{const t=Math.max(0,Math.min(1,(x-a)/(b-a)));return t*t*(3-2*t);};
const gaussian=x=>Math.exp(-x*x);
const levels=[
  [0,.065,.14,.23,.31,.40,.48,.56,.64,.72,.79,.85,.91,.96,1],
  [0,.25,.50,.78,1],
  [0,.32,1],
];

/** A single loaded brush mark with a thin substrate and a folded wet edge.
 * The same analytic silhouette is sampled by all LODs; no instances or random
 * state are owned here. The returned closed geometry belongs to its caller. */
export function makeDraggedLeafGeometry(detail=0){
  detail=Math.max(0,Math.min(2,detail|0));
  const ts=levels[detail],sides=[12,8,6][detail],positions=[],uv=[],indices=[];
  for(const t of ts){
    const envelope=Math.sin(t*Math.PI);
    // A brush spreads quickly, then leaves a shorter, blunt pulled end.
    // Unequal shoulders replace the previous symmetric inflated ellipse.
    const profile=(.025+.975*smooth(0,.21,t))*(1-.84*smooth(.63,1,t));
    for(let side=0;side<sides;side++){
      const angle=side/sides*TAU,cs=Math.cos(angle),sn=Math.sin(angle);
      const across=Math.abs(cs)<1e-10?0:cs,face=Math.abs(sn)<1e-10?0:sn;
      const flattenedAcross=Math.sign(across)*Math.abs(across)**.62;
      const left=1+.11*Math.sin(t*5+.2)+.12*gaussian((t-.38)/.16)-.10*gaussian((t-.69)/.12);
      const right=.91+.12*Math.sin(t*5.5+1.4)-.16*gaussian((t-.54)/.12)+.06*gaussian((t-.82)/.11);
      const width=.21*profile*(across<0?left:right);
      const x=.15*envelope+.14*t*t+flattenedAcross*width;
      // These few broad knife loads use the same periodic across coordinate
      // as the material. The underside is shallow instead of equally inflated.
      const drag=across+Math.sin(t*4.3)*.065+Math.sin(t*9.1)*.012;
      const faceA=smooth(-.77,-.48,drag)-smooth(.06,.27,drag);
      const faceB=smooth(.14,.34,drag)-smooth(.70,.91,drag);
      const lip=gaussian((drag-.63)/.14);
      const laidPaint=(faceA*.014+faceB*.007+lip*.048)*envelope;
      const skin=Math.max(.0015,(.011+.013*lip*envelope)*profile);
      const z=.34*t*t+.045*envelope+Math.sign(face)*Math.abs(face)**.23*skin+laidPaint*(.72+.28*face);
      const y=t-.5-.25*t**4-.022*lip*t*t*envelope;
      positions.push(x,y,z);
      // Folding the periodic coordinate removes an unnecessary UV seam;
      // cos(TAU*u) retains the same coordinate values on both skins.
      const around=side/sides;uv.push(around<=.5?around:1-around,t);
    }
  }
  for(let row=0;row<ts.length-1;row++)for(let side=0;side<sides;side++){
    const next=(side+1)%sides,a=row*sides+side,b=row*sides+next,c=a+sides,d=b+sides;
    indices.push(a,c,b,b,c,d);
  }
  for(const top of [false,true]){
    const ring=(top?ts.length-1:0)*sides,center=positions.length/3,point=new Vector3();
    for(let side=0;side<sides;side++){const index=(ring+side)*3;point.add(new Vector3(positions[index],positions[index+1],positions[index+2]));}
    point.multiplyScalar(1/sides);positions.push(point.x,point.y,point.z);uv.push(.25,top?1:0);
    for(let side=0;side<sides;side++){const next=(side+1)%sides;indices.push(...(top?[center,ring+next,ring+side]:[center,ring+side,ring+next]));}
  }
  const geometry=new BufferGeometry();geometry.name=`dragged-pigment-leaf-${detail}`;
  geometry.setAttribute('position',new Float32BufferAttribute(positions,3));geometry.setAttribute('uv',new Float32BufferAttribute(uv,2));geometry.setIndex(indices);geometry.computeVertexNormals();geometry.computeBoundingBox();geometry.computeBoundingSphere();
  return geometry;
}
