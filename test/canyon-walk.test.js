import test from 'node:test';
import assert from 'node:assert/strict';
import { canyonHeight, canyonEdge } from '../src/render/sculpted-canyon.js';
import { constrainTerrainStep } from '../src/simulation/terrain-walk.js';
import { slideAroundPaint } from '../src/simulation/collision.js';

test('the canyon shelf connects its three colours and portal around the tree',()=>{
  const obstacles=[{x:-8.5,z:-3,radius:1.5}];
  for(const target of [{x:-5,z:4},{x:12,z:-3},{x:-7,z:-18},{x:7,z:-8}]){
    let p={x:-3.5,z:15};
    for(let i=0;i<800&&Math.hypot(target.x-p.x,target.z-p.z)>.02;i++){
      const d=Math.hypot(target.x-p.x,target.z-p.z),k=Math.min(.21,d)/d;
      const desired=slideAroundPaint(p,{x:p.x+(target.x-p.x)*k,z:p.z+(target.z-p.z)*k},obstacles);
      const next=constrainTerrainStep(p,desired,canyonHeight);
      assert.ok(Math.abs(canyonHeight(next.x,next.z)-canyonHeight(p.x,p.z))<.22);
      p=next;
    }
    assert.ok(Math.hypot(target.x-p.x,target.z-p.z)<.02,`blocked route to ${JSON.stringify(target)} at ${JSON.stringify(p)}`);
  }
});

test('sustained sprinting cannot walk off the new canyon rim',()=>{
  for(const z of [17,9,0,-14,-22]){
    let p={x:canyonEdge(z)+2.5,z};const before=canyonHeight(p.x,p.z);
    for(let i=0;i<120;i++)p=constrainTerrainStep(p,{x:p.x-.365,z:p.z},canyonHeight);
    assert.ok(canyonHeight(p.x,p.z)>before-.7);
    assert.ok(p.x>canyonEdge(p.z)+.4);
  }
});
