import { BufferGeometry, Float32BufferAttribute, Vector3, Color } from 'three';

const TAU=Math.PI*2,clamp=(x,a,b)=>Math.max(a,Math.min(b,x));
const ease=x=>{x=clamp(x,0,1);return x*x*(3-2*x);};
const blue=new Color('#123e53'),teal=new Color('#266779'),deep=new Color('#102936'),ochre=new Color('#be8836'),cream=new Color('#edd7a0');

/** A closed load of paint. The whole upper skin, underside and rounded edge
 * share indices. Large folds belong to the skin instead of separate chips. */
function closedLoad({columns,rows,sample,shade,thickness}){
  const centers=[],normals=[],across=[],along=[],widths=[],position=[],uv=[],color=[],index=[],tint=new Color();
  const stride=columns+1;
  for(let row=0;row<=rows;row++)for(let column=0;column<=columns;column++){
    const u=column/columns,s=row/rows,p=sample(u,s);
    const tangentU=sample(Math.min(1,u+.0003),s).sub(sample(Math.max(0,u-.0003),s)).normalize();
    const tangentS=sample(u,Math.min(1,s+.0003)).sub(sample(u,Math.max(0,s-.0003))).normalize();
    centers.push(p);across.push(tangentU);along.push(tangentS);normals.push(tangentS.clone().cross(tangentU).normalize());widths.push(thickness(u,s)*.5);
  }
  const faceCount=centers.length;
  for(let face=0;face<2;face++){
    const sign=face===0?1:-1;
    for(let i=0;i<faceCount;i++){
      const u=i%stride/columns,s=Math.floor(i/stride)/rows,p=centers[i].clone().addScaledVector(normals[i],sign*widths[i]);
      position.push(p.x,p.y,p.z);uv.push(u,s);shade(tint,u,s,centers[i]);tint.multiplyScalar(face===0?1:.72);color.push(tint.r,tint.g,tint.b);
    }
    for(let row=0;row<rows;row++)for(let column=0;column<columns;column++){
      const a=face*faceCount+row*stride+column,b=a+stride;
      index.push(...(face===0?[a,b,a+1,a+1,b,b+1]:[a,a+1,b,a+1,b+1,b]));
    }
  }
  const perimeter=[];
  for(let column=columns;column>=0;column--)perimeter.push(column);
  for(let row=1;row<=rows;row++)perimeter.push(row*stride);
  for(let column=1;column<=columns;column++)perimeter.push(rows*stride+column);
  for(let row=rows-1;row>=1;row--)perimeter.push(row*stride+columns);
  const rings=[perimeter],edgeSegments=4;
  for(let ring=1;ring<edgeSegments;ring++){
    const angle=ring/edgeSegments*Math.PI,ids=[];
    for(const i of perimeter){
      const column=i%stride,row=Math.floor(i/stride),outside=new Vector3();
      if(column===0)outside.sub(across[i]);if(column===columns)outside.add(across[i]);
      if(row===0)outside.sub(along[i]);if(row===rows)outside.add(along[i]);
      outside.addScaledVector(normals[i],-outside.dot(normals[i])).normalize();
      const p=centers[i].clone().addScaledVector(normals[i],Math.cos(angle)*widths[i]).addScaledVector(outside,Math.sin(angle)*widths[i]);
      ids.push(position.length/3);position.push(p.x,p.y,p.z);uv.push(column/columns,row/rows);
      shade(tint,column/columns,row/rows,centers[i]);tint.multiplyScalar(.88+.12*Math.cos(angle));color.push(tint.r,tint.g,tint.b);
    }rings.push(ids);
  }
  rings.push(perimeter.map(i=>i+faceCount));
  for(let ring=0;ring<rings.length-1;ring++)for(let i=0;i<perimeter.length;i++){
    const next=(i+1)%perimeter.length,a=rings[ring][i],b=rings[ring][next],c=rings[ring+1][i],d=rings[ring+1][next];index.push(a,c,b,b,c,d);
  }
  const geometry=new BufferGeometry();geometry.setAttribute('position',new Float32BufferAttribute(position,3));geometry.setAttribute('uv',new Float32BufferAttribute(uv,2));geometry.setAttribute('color',new Float32BufferAttribute(color,3));geometry.setIndex(index);geometry.computeVertexNormals();geometry.computeBoundingBox();geometry.computeBoundingSphere();return geometry;
}

/** The river makes a real undercut lip, a hanging thick front and a pooled
 * lower foot. Its three parts form one continuous closed volume. */
export function makeCanyonCascade({z,upper,lower,bounds,seed=1}){
  const phase=seed*.719,drop=upper-lower;
  const sample=(u,s)=>{
    // Spill tongues advance by different amounts. Even from above this is a
    // scalloped overhanging river edge rather than a straight raised bar.
    const lobe=.5+.5*Math.sin(u*TAU*1.73+phase);
    const bend=.36+1.62*lobe**2+.33*Math.sin(u*TAU*4.3-phase)**2;
    const radius=.24+.38*(.5+.5*Math.sin(u*TAU*2.6+phase*.63));
    const crest=.05+.17*(.5+.5*Math.sin(u*TAU*3.4-phase))**3;
    let zz,y,ny,nz;
    if(s<.29){const t=s/.29;zz=z-2.75+t*(2.81+bend);y=upper+.025+crest*ease(t)+.065*Math.sin(t*Math.PI);ny=1;nz=0;}
    else if(s<.46){const angle=(s-.29)/.17*Math.PI*.5;zz=z+.06+bend+radius*Math.sin(angle);y=upper+.025+crest-radius*(1-Math.cos(angle));ny=Math.cos(angle);nz=Math.sin(angle);}
    else if(s<.76){const t=(s-.46)/.30;zz=z+.06+bend+radius+.22*ease(t)+.16*Math.sin(t*Math.PI);y=upper+.025+crest-radius-t*Math.max(.2,drop+crest-radius-.28);ny=0;nz=1;}
    else if(s<.89){const angle=(s-.76)/.13*Math.PI*.5;zz=z+.28+bend+radius+.31*(1-Math.cos(angle));y=lower+.305-.28*Math.sin(angle);ny=Math.sin(angle);nz=Math.cos(angle);}
    else {const t=(s-.89)/.11;zz=z+.59+bend+radius+t*(1.65+.38*Math.sin(u*8+phase));y=lower+.025+.04*Math.sin(t*Math.PI);ny=1;nz=0;}
    const [left,right]=bounds(zz),q=(u-.5)*(.963+.017*Math.sin(s*Math.PI));
    const x=(left+right)*.5+q*(right-left),flow=u+.015*Math.sin(s*4.8+u*8+phase);
    const groove=.032*Math.sin(flow*TAU*23.7)**4+.014*Math.sin(flow*TAU*42.4+phase)**6;
    const loads=(.035+.065*Math.sin(u*13+phase)**2)*(.5+.5*Math.sin(flow*TAU*6.2+phase))**5;
    y+=(groove+loads)*ny;zz+=(groove+loads)*nz;
    return new Vector3(x,y,zz);
  };
  return closedLoad({columns:96,rows:56,sample,thickness:(u,s)=>.15+.14*Math.sin(s*Math.PI)**2+.11*ease((s-.84)/.16),shade:(c,u,s)=>{
    const flow=u+.015*Math.sin(s*4.8+u*8+phase),band=.5+.5*Math.sin(flow*TAU*4.7+phase*.31+.32*Math.sin(flow*17));
    c.copy(blue).lerp(teal,.33+.26*Math.sin(flow*TAU*7+.4)**2);
    if(band>.93)c.lerp(ochre,ease((band-.93)/.06));if(band>.988)c.lerp(cream,ease((band-.988)/.012)*.64);
    if(band<.26)c.lerp(deep,ease((.26-band)/.26)*.65);
    c.multiplyScalar(.90+.20*Math.sin(flow*TAU*23.7)**2+.08*Math.sin(s*3.4+phase)**2);
  }}).translate(0,.04,0);
}

/** Broad paint strata on a bank. Two optional strata overlap in space like
 * deposits on a shelf; a dark colour does not become a separate stone prop. */
export function makeCanyonBankLoad({z,width,bank='near',edge,height,riverLevel,seed=1,fraction=1,colorA,colorB}){
  const near=bank==='near',direction=near?-1:1,phase=seed*.417,base=new Color(colorA),highlight=new Color(colorB);
  const sample=(u,s)=>{
    const q=(u-.5)*2,spread=.70+.30*Math.sin(s*Math.PI)-.23*ease((s-.74)/.26);
    const drag=.27*Math.sin(phase)*ease(s)+.16*Math.sin(s*4.8+phase)*Math.sin(s*Math.PI);
    const zz=z+(near?1:-1)*(q*width*.5*spread+drag);
    const rim=edge(zz),floor=riverLevel(zz)+.15,back=rim-direction*(near?1.18:2.2);
    const rimHeight=height(back,zz),top=floor+(rimHeight-floor)*fraction;
    // Short uneven terminal fingers share the thick shoulder. Their lengths
    // depend on the loaded brush width, never on the height of the cliff.
    const finger=.69*Math.exp(-Math.pow((q+.44)/.27,2))+.98*Math.exp(-Math.pow((q-.16)/.21,2))+.42*Math.exp(-Math.pow((q-.68)/.18,2));
    const length=clamp(width*.62,1.1,2.7),drop=length*(.46+.79*finger);
    const radius=.23+.16*(.5+.5*Math.sin(q*3.7+phase));
    const shoulder=.19+.20*Math.exp(-Math.pow((q+.27)/.54,2));
    let x,y,ny,nx;
    const wallOffset=(1-fraction)*2.5;
    if(s<.28){const t=s/.28;x=rim+direction*(wallOffset-(near?1.18:2.2)*(1-t)-.13*t);y=top-.17+shoulder*ease(t)+.13*Math.sin(t*Math.PI);ny=1;nx=0;}
    else if(s<.48){const angle=(s-.28)/.20*Math.PI*.5;x=rim+direction*(wallOffset-.13+radius*Math.sin(angle));y=top-.17+shoulder-radius*(1-Math.cos(angle));ny=Math.cos(angle);nx=direction*Math.sin(angle);}
    else {const t=(s-.48)/.52,belly=.29*Math.sin(t*Math.PI);x=rim+direction*(wallOffset+radius-.13+1.05*ease(t/.73)+belly-.20*ease((t-.8)/.2));y=top-.17+shoulder-radius-t*drop+.13*Math.sin(t*Math.PI);ny=0;nx=direction;}
    const wave=u+.033*Math.sin(s*3.3+phase),fold=.13*(.5+.5*Math.sin(wave*TAU*2.3+phase))**5;
    const ridge=.028*Math.sin(wave*TAU*12.7+phase)**4+.009*Math.sin(wave*TAU*22.3)**6;
    const edgeRoll=.11*Math.exp(-Math.pow((q-.61)/.22,2))*Math.sin(s*Math.PI);
    x+=(fold+ridge+edgeRoll)*nx;y+=(fold+ridge+edgeRoll)*ny;
    return new Vector3(x,y,zz);
  };
  return closedLoad({columns:near?42:30,rows:near?30:24,sample,thickness:(u,s)=>.16+.17*Math.sin(s*Math.PI)**2+.14*ease((s-.76)/.24),shade:(c,u,s)=>{
    const band=.5+.5*Math.sin(u*TAU*2.3+phase+.25*Math.sin(s*3.3));
    c.copy(base).lerp(highlight,.14+.42*band**4+.08*Math.sin(u*TAU*12.7+phase)**2);
    c.multiplyScalar(.88+.12*Math.sin(u*TAU*7.3+s*.7+phase)**2+.12*(1-s));
  }});
}
