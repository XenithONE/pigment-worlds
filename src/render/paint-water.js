import * as THREE from 'three';
import { Reflector } from 'three/addons/objects/Reflector.js';

// Water is opaque coloured oil, with broad folds, fine dragged bristles and a
// slowly travelling current. It uses the same light and sky as the landscape.
export function createPaintWaterMaterial(color, worldId) {
  const clock = { value: 0 };
  const reflectionMap = { value: null }, reflectionMatrix = { value: new THREE.Matrix4() }, reflectionAmount = { value: 0 };
  let mirror;
  const material = new THREE.MeshPhysicalMaterial({
    color, roughness: .28, metalness: .08,
    clearcoat: .95, clearcoatRoughness: .17,
    envMapIntensity: .9, side: THREE.DoubleSide,
  });
  material.name = 'Viscous pigment current';
  material.userData.pigmentSurface = 'liquid';
  const lightPigment = new THREE.Color(worldId === 0 ? '#b2c5bc' : worldId === 1 ? '#c5d6bc' : worldId === 2 ? '#e1bd65' : '#c8c4a7');
  const deepPigment = new THREE.Color(worldId === 0 ? '#072f51' : worldId === 1 ? '#28594f' : worldId === 2 ? '#6a6235' : '#345b65');
  const field = `
    uniform float liquidTime;
    float liquidHeight(vec2 p) {
      vec2 q=p*.44;
      q.x+=sin(q.y*.7)*1.3+sin(q.y*.29+.8)*1.1;
      q.y+=sin(q.x*.51)*.64;
      float flow=q.y*4.1+sin(q.x*1.7+q.y*.43)*1.2-liquidTime*.085;
      float fold=pow(.5+.5*sin(flow),3.);
      float crest=pow(.5+.5*sin(flow*2.07+q.x*.62),7.);
      return fold*.095+crest*.038+sin(q.x+q.y*.68)*.027;
    }
  `;
  material.onBeforeCompile = shader => {
    shader.uniforms.liquidTime = clock;
    shader.uniforms.liquidLight = { value: lightPigment };
    shader.uniforms.liquidDeep = { value: deepPigment };
    shader.uniforms.liquidReflection = reflectionMap;
    shader.uniforms.liquidReflectionMatrix = reflectionMatrix;
    shader.uniforms.liquidReflectionAmount = reflectionAmount;
    shader.vertexShader = shader.vertexShader.replace('#include <common>', `#include <common>\nvarying vec3 vLiquidWorld;varying vec4 vLiquidReflection;uniform mat4 liquidReflectionMatrix;\n${field}`)
      .replace('#include <begin_vertex>', `#include <begin_vertex>
        vec3 liquidWorld=(modelMatrix*vec4(position,1.)).xyz;
        transformed.z+=liquidHeight(liquidWorld.xz);
        vLiquidWorld=(modelMatrix*vec4(transformed,1.)).xyz;
        vLiquidReflection=liquidReflectionMatrix*vec4(position,1.);`);
    shader.fragmentShader = shader.fragmentShader.replace('#include <common>', `#include <common>\nvarying vec3 vLiquidWorld;varying vec4 vLiquidReflection;uniform sampler2D liquidReflection;uniform float liquidReflectionAmount;uniform vec3 liquidLight,liquidDeep;\n${field}`)
      .replace('#include <color_fragment>', `#include <color_fragment>
        vec2 flowPoint=vLiquidWorld.xz;
        float wash=sin(flowPoint.y*.38+sin(flowPoint.x*.27)*2.1)+sin(flowPoint.x*.13-flowPoint.y*.21)*.6;
        float vein=pow(.5+.5*sin(flowPoint.y*1.46+sin(flowPoint.x*.35+flowPoint.y*.16)*3.1),10.);
        diffuseColor.rgb=mix(diffuseColor.rgb,liquidDeep,smoothstep(-.4,1.3,wash)*.7);
        diffuseColor.rgb=mix(diffuseColor.rgb,liquidLight,vein*.26);`)
      .replace('#include <roughnessmap_fragment>', `#include <roughnessmap_fragment>
        roughnessFactor=clamp(roughnessFactor+sin(vLiquidWorld.x*.55+vLiquidWorld.z*.32)*.08,.16,.44);`)
      .replace('#include <normal_fragment_maps>', `#include <normal_fragment_maps>
        vec2 lp=vLiquidWorld.xz;
        float eps=.035;
        float hx=(liquidHeight(lp+vec2(eps,0.))-liquidHeight(lp-vec2(eps,0.)))/(2.*eps);
        float hz=(liquidHeight(lp+vec2(0.,eps))-liquidHeight(lp-vec2(0.,eps)))/(2.*eps);
        float bristlePhase=lp.y*95.+sin(lp.x*.8+lp.y*.36)*11.;
        float visibleBristle=1.-smoothstep(.7,3.,fwidth(bristlePhase));
        hz+=cos(bristlePhase)*.11*visibleBristle;
        normal=normalize(mat3(viewMatrix)*normalize(vec3(-hx*2.3,1.,-hz*2.3)));`)
      .replace('#include <clearcoat_normal_fragment_maps>', '#include <clearcoat_normal_fragment_maps>\nclearcoatNormal=normal;')
      .replace('#include <opaque_fragment>', `
        if(liquidReflectionAmount>.5){
          vec2 reflectionUV=vLiquidReflection.xy/vLiquidReflection.w;
          reflectionUV+=vec2(hx,hz)*.012;
          vec3 reflectedPigment=texture2D(liquidReflection,reflectionUV).rgb*.5;
          reflectedPigment+=texture2D(liquidReflection,reflectionUV+vec2(.0025,0.)).rgb*.25;
          reflectedPigment+=texture2D(liquidReflection,reflectionUV-vec2(.0025,0.)).rgb*.25;
          float fresnel=pow(1.-clamp(dot(normal,normalize(vViewPosition)),0.,1.),2.);
          outgoingLight=mix(outgoingLight,reflectedPigment,mix(.18,.61,fresnel));
        }
        #include <opaque_fragment>`);
  };
  material.customProgramCacheKey = () => `viscous-pigment-current-v2-${worldId}`;
  return {
    material,
    attachReflection(surface, scene) {
      if (worldId !== 1 && worldId !== 3) return;
      const { width, height } = surface.geometry.parameters;
      mirror = new Reflector(new THREE.PlaneGeometry(width, height), { textureWidth: 768, textureHeight: 768, multisample: 2, clipBias: .005 });
      mirror.name = 'Painted water reflection capture';
      mirror.position.copy(surface.position); mirror.quaternion.copy(surface.quaternion);
      mirror.renderOrder = -5;
      mirror.material.colorWrite = false; mirror.material.depthWrite = false;
      const renderReflection = mirror.onBeforeRender;
      mirror.onBeforeRender = function (...args) {
        const wasVisible = surface.visible;
        surface.visible = false;
        try { renderReflection.apply(this, args); } finally { surface.visible = wasVisible; }
      };
      reflectionMap.value = mirror.getRenderTarget().texture;
      reflectionMatrix.value = mirror.material.uniforms.textureMatrix.value;
      reflectionAmount.value = 1;
      scene.add(mirror);
    },
    setReflectionEnabled(value) { if(mirror) { mirror.visible = value; reflectionAmount.value = value ? 1 : 0; } },
    update(time) { clock.value = time; },
    dispose() { if(mirror) { mirror.geometry.dispose(); mirror.dispose(); mirror.removeFromParent(); } },
  };
}
