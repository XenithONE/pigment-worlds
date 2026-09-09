import * as THREE from 'three';
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/addons/postprocessing/RenderPass.js';
import { ShaderPass } from 'three/addons/postprocessing/ShaderPass.js';
import { GTAOPass } from 'three/addons/postprocessing/GTAOPass.js';
import { UnrealBloomPass } from 'three/addons/postprocessing/UnrealBloomPass.js';
import { OutputPass } from 'three/addons/postprocessing/OutputPass.js';

// Use the depth of the actual colour render. A second normal-material draw
// would lose the impasto shader's vertex motion and double the geometry cost.
class PaintedScenePass extends RenderPass {
  render(renderer, write, read, dt, mask) {
    super.render(renderer, write, read, dt, mask);
    this.depth = read.depthTexture;
  }
}

class PaintedOcclusionPass extends GTAOPass {
  constructor(scenePass, camera) {
    super(scenePass.scene, camera, 1, 1);
    this.scenePass = scenePass;
    this.externalDepthConfigured = false;
    this.blendIntensity = .85;
    this.updateGtaoMaterial({ radius: .72, thickness: .6, distanceFallOff: 1.2, scale: 1, samples: 16 });
    this.updatePdMaterial({ radius: 5, depthPhi: 2, normalPhi: 6, samples: 12 });
  }
  render(renderer, write, read, dt, mask) {
    if (!this.externalDepthConfigured) {
      this.setGBuffer(this.scenePass.depth);
      this.externalDepthConfigured = true;
    }
    this.depthTexture = this.scenePass.depth;
    for (const material of [this.gtaoMaterial, this.pdMaterial, this.depthRenderMaterial]) {
      material.uniforms.tDepth.value = this.scenePass.depth;
    }
    super.render(renderer, write, read, dt, mask);
  }
}

const brushShader = {
  uniforms: {
    tDiffuse: { value: null }, tDepth: { value: null },
    resolution: { value: new THREE.Vector2(1, 1) },
    cameraNear: { value: .1 }, cameraFar: { value: 500 },
    strength: { value: .26 },
  },
  vertexShader: `varying vec2 vUv;
    void main(){vUv=uv;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.);}`,
  fragmentShader: `
    uniform sampler2D tDiffuse, tDepth;
    uniform vec2 resolution;
    uniform float cameraNear,cameraFar,strength;
    varying vec2 vUv;
    #include <packing>
    float depthAt(vec2 uv){return -perspectiveDepthToViewZ(texture2D(tDepth,uv).x,cameraNear,cameraFar);}
    float paintLuma(vec3 c){return dot(c,vec3(.2126,.7152,.0722));}
    void gather(vec2 offset,float centerZ,vec3 center,inout vec3 sum,inout float weights){
      vec2 uv=vUv+offset/resolution;
      vec3 sampleColor=texture2D(tDiffuse,uv).rgb;
      float dz=abs(depthAt(uv)-centerZ)/max(.15,centerZ*.028);
      float dc=abs(paintLuma(sampleColor)-paintLuma(center));
      float w=exp(-dz*dz-dc*dc*10.);
      sum+=sampleColor*w;weights+=w;
    }
    void main(){
      vec2 px=1./resolution;
      vec3 center=texture2D(tDiffuse,vUv).rgb;
      float z=depthAt(vUv);
      vec3 l=texture2D(tDiffuse,vUv-vec2(px.x,0.)).rgb;
      vec3 r=texture2D(tDiffuse,vUv+vec2(px.x,0.)).rgb;
      vec3 u=texture2D(tDiffuse,vUv+vec2(0.,px.y)).rgb;
      vec3 d=texture2D(tDiffuse,vUv-vec2(0.,px.y)).rgb;
      vec2 g=vec2(paintLuma(r-l),paintLuma(u-d));
      vec2 direction=length(g)>.006?normalize(vec2(-g.y,g.x)):vec2(.93,.36);
      // Small flow-aligned strokes unify distant forms. Close wet highlights
      // retain their original detail, and depth rejects silhouette bleeding.
      float radius=mix(.55,1.85,smoothstep(4.,55.,z));
      vec3 sum=center*2.;float weights=2.;
      gather(direction*radius,z,center,sum,weights);
      gather(-direction*radius,z,center,sum,weights);
      gather(direction*radius*2.,z,center,sum,weights);
      gather(-direction*radius*2.,z,center,sum,weights);
      vec3 c=mix(center,sum/weights,strength*smoothstep(2.,12.,z));
      // Restrained local contrast. Brush relief comes from the surfaces, not
      // from a moving screen-space texture or an embossed image of the scene.
      vec3 localMean=(l+r+u+d)*.25;
      c+=clamp(center-localMean,vec3(-.08),vec3(.08))*.18;
      gl_FragColor=vec4(max(c,vec3(0.)),1.);
    }`,
};

export function createPaintPipeline(renderer, camera) {
  const target = new THREE.WebGLRenderTarget(1, 1, {
    type: THREE.HalfFloatType,
    samples: 4,
    depthTexture: new THREE.DepthTexture(1, 1, THREE.UnsignedIntType),
  });
  const composer = new EffectComposer(renderer, target);
  const renderPass = new PaintedScenePass(new THREE.Scene(), camera);
  const ao = new PaintedOcclusionPass(renderPass, camera);
  const bloom = new UnrealBloomPass(new THREE.Vector2(1, 1), .16, .45, 1.35);
  const paintPass = new ShaderPass(brushShader);
  paintPass.material.depthTest = false;
  paintPass.material.depthWrite = false;
  const renderBrush = paintPass.render.bind(paintPass);
  paintPass.render = (...args) => {
    paintPass.uniforms.tDepth.value = renderPass.depth;
    paintPass.uniforms.cameraNear.value = camera.near;
    paintPass.uniforms.cameraFar.value = camera.far;
    renderBrush(...args);
  };
  composer.addPass(renderPass);
  // Resolve brush colour before AO swaps the buffers. It samples scene depth
  // from B while writing A, never a texture attached to its own framebuffer.
  composer.addPass(paintPass);
  composer.addPass(ao);
  composer.addPass(bloom);
  composer.addPass(new OutputPass());
  return { composer, renderPass, ao, bloom, paintPass };
}

export function configurePaintShadows(renderer, scene, quality) {
  const size = quality === 'high' ? 4096 : 2048;
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFShadowMap;
  renderer.shadowMap.autoUpdate = false;
  let sun = scene.getObjectByName('paint-sun');
  if (!sun) sun = scene.children.find(o => o.isDirectionalLight);
  if (sun) {
    sun.userData.shadowOrigin ||= sun.position.clone();
    sun.position.copy(sun.userData.shadowOrigin).multiplyScalar(2.5);
    sun.castShadow = true;
    sun.shadow.mapSize.set(size, size);
    const camera = sun.shadow.camera;
    camera.left = -68; camera.right = 68; camera.top = 64; camera.bottom = -64;
    camera.near = .1; camera.far = 260;
    camera.updateProjectionMatrix();
    sun.shadow.bias = -.00012;
    sun.shadow.normalBias = .035;
    sun.shadow.radius = 2;
    // A static sun map contains immobile landscape and coarse vegetation.
    // Tiny leaf motion does not justify redrawing millions of shadow vertices.
    sun.shadow.map?.dispose();
    sun.shadow.map = null;
    sun.shadow.needsUpdate = true;
  }
  renderer.shadowMap.needsUpdate = true;
  if (import.meta.env.DEV && new URLSearchParams(location.search).has('no-shadow')) renderer.shadowMap.enabled = false;
}
