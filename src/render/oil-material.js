import {MeshPhysicalMaterial,MeshStandardMaterial} from 'three';

// A spatial impasto surface, attached to the actual geometry. The ridges stay
// fixed to objects as the viewer walks; only illumination changes with the view.
const pigmentFunctions = /* glsl */`
varying vec3 vOilWorld;
float oilHash(vec2 p){return fract(sin(dot(p,vec2(127.1,311.7)))*43758.5453);}
float oilNoise(vec2 p){vec2 i=floor(p),f=fract(p);f=f*f*(3.-2.*f);return mix(mix(oilHash(i),oilHash(i+vec2(1,0)),f.x),mix(oilHash(i+vec2(0,1)),oilHash(i+vec2(1,1)),f.x),f.y);}
vec2 oilStroke(vec2 p){
  p*=3.2;float under=oilNoise(p*.7);p+=vec2(under*.65,oilNoise(p.yx*.65)*.5);
  vec2 cell=floor(p*vec2(.7,1.7));float seed=oilHash(cell);vec2 q=fract(p*vec2(.7,1.7))-.5;
  float tilt=(seed-.5)*.7; q=mat2(cos(tilt),-sin(tilt),sin(tilt),cos(tilt))*q;
  float body=pow(max(0.,1.-dot(q*vec2(1.75,2.),q*vec2(1.75,2.))),.68);
  float bristles=.5+.5*sin(q.x*82.+sin(q.y*9.+seed*5.)*2.);
  float rib=pow(bristles,3.5)*body;
  float mound=body*(.4+seed*.35)+rib*.1;
  return vec2(mound,under*.55+seed*.25+body*.2);
}
vec2 oilSurface(vec3 p,vec3 n){
  vec3 w=pow(abs(n),vec3(7.));w/=max(.001,w.x+w.y+w.z);
  return oilStroke(p.yz)*w.x+oilStroke(p.xz)*w.y+oilStroke(p.xy)*w.z;
}
`;

export function applyOilMaterials(scene){
  const seen=new Set(),clones=new Map(),coatings=new Map(),time={value:0};
  scene.traverse(object=>{
    if(!object.isMesh)return;
    const coat=original=>{
      if(!original?.isMeshStandardMaterial)return original;
      if(!coatings.has(original)){
        const physical=new MeshPhysicalMaterial();MeshStandardMaterial.prototype.copy.call(physical,original);
        physical.defines={STANDARD:'',PHYSICAL:''};physical.clearcoat=.28;physical.clearcoatRoughness=.38;physical.ior=1.46;
        coatings.set(original,physical);
      }
      return coatings.get(original);
    };
    object.material=Array.isArray(object.material)?object.material.map(coat):coat(object.material);
    if(/^(grass|flowers|tree-pigment|gold-canopy|willow-trails)/.test(object.name)&&!Array.isArray(object.material)){
      const original=object.material;
      if(!clones.has(original)){const clone=original.clone();clone.userData.pigmentFoliage=true;clones.set(original,clone);}
      object.material=clones.get(original);
    }
    for(const material of Array.isArray(object.material)?object.material:[object.material]){
      if(!material?.isMeshStandardMaterial||seen.has(material))continue;
      seen.add(material);
      material.roughness=Math.min(material.roughness,.65);
      material.onBeforeCompile=shader=>{
        shader.uniforms.uOilTime=time;
        shader.vertexShader=shader.vertexShader.replace('#include <common>','#include <common>\nvarying vec3 vOilWorld;uniform float uOilTime;');
        if(material.userData.pigmentFoliage)shader.vertexShader=shader.vertexShader.replace('#include <begin_vertex>',`#include <begin_vertex>
          float oilPhase=0.;
          #ifdef USE_INSTANCING
            oilPhase=instanceMatrix[3].x*.6+instanceMatrix[3].z*.33;
          #endif
          transformed.x+=sin(uOilTime*.42+oilPhase)*pow(max(0.,position.y+.5),2.)*.09;
          transformed.z+=cos(uOilTime*.34+oilPhase)*pow(max(0.,position.y+.5),2.)*.03;`);
        shader.vertexShader=shader.vertexShader.replace('#include <project_vertex>',`#include <project_vertex>
          vec4 oilWorld=vec4(transformed,1.);
          #ifdef USE_BATCHING
            oilWorld=batchingMatrix*oilWorld;
          #endif
          #ifdef USE_INSTANCING
            oilWorld=instanceMatrix*oilWorld;
          #endif
          vOilWorld=(modelMatrix*oilWorld).xyz;`);
        shader.fragmentShader=shader.fragmentShader.replace('#include <common>',`#include <common>\n${pigmentFunctions}`);
        shader.fragmentShader=shader.fragmentShader.replace('#include <color_fragment>',`#include <color_fragment>
          vec3 oilN=normalize(cross(dFdx(vOilWorld),dFdy(vOilWorld)));
          vec2 oil=oilSurface(vOilWorld,oilN);
          float oilTone=oil.y-.45;
          diffuseColor.rgb*=.92+oilTone*.32;
          diffuseColor.rgb+=vec3(.012,.009,.003)*smoothstep(.35,.85,oil.x);`);
        shader.fragmentShader=shader.fragmentShader.replace('#include <normal_fragment_maps>',`#include <normal_fragment_maps>
          vec3 oilS=dFdx(-vViewPosition),oilT=dFdy(-vViewPosition);
          vec3 oilR1=cross(oilT,normal),oilR2=cross(normal,oilS);
          float oilDet=dot(oilS,oilR1);
          vec3 oilGrad=sign(oilDet)*(dFdx(oil.x)*oilR1+dFdy(oil.x)*oilR2);
          normal=normalize(abs(oilDet)*normal-.034*oilGrad);`);
        shader.fragmentShader=shader.fragmentShader.replace('#include <roughnessmap_fragment>',`#include <roughnessmap_fragment>
          roughnessFactor=clamp(roughnessFactor-oil.x*.18,.25,.78);`);
        shader.fragmentShader=shader.fragmentShader.replace('#include <clearcoat_normal_fragment_maps>',`#include <clearcoat_normal_fragment_maps>
          #ifdef USE_CLEARCOAT
            clearcoatNormal=normal;
          #endif`);
      };
      material.customProgramCacheKey=()=> 'pigment-spatial-impasto-v2-'+Boolean(material.userData.pigmentFoliage);material.needsUpdate=true;
    }
  });
  return {update(t){time.value=t;},dispose(){clones.forEach(m=>m.dispose());coatings.forEach(m=>m.dispose());}};
}
