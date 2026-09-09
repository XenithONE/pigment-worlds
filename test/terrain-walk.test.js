import test from 'node:test';
import assert from 'node:assert/strict';
import { constrainTerrainStep } from '../src/simulation/terrain-walk.js';
import { valleyHeight, valleyEdge } from '../src/render/paint-valley.js';
import { slideAroundPaint } from '../src/simulation/collision.js';

const near = (actual, expected, tolerance = 1e-7) => assert.ok(Math.abs(actual - expected) <= tolerance, `${actual} differs from ${expected}`);
const pathX = z => { const t = Math.max(0, Math.min(1, (15 - z) / 24)); return Math.sin(t * Math.PI) * -1.4 + 7 * t; };
const ground = (x, z) => valleyHeight(x, z, pathX);

test('flat and gently sloping terrain preserve a normal walking or sprint step', () => {
  for (const height of [() => 0, (x, z) => x * .30 + z * .15]) {
    for (const desired of [{ x: .12, z: -.16 }, { x: .219, z: -.292 }, { x: 2, z: 1 }]) {
      const result = constrainTerrainStep({ x: 0, z: 0 }, desired, height);
      near(result.x, desired.x); near(result.z, desired.z);
    }
  }
});

test('a sprint cannot cross a sheer drop or a narrow deep gap', () => {
  const ledge = x => x < 0 ? 8 : 0;
  const result = constrainTerrainStep({ x: -.5, z: 0 }, { x: 1.5, z: 0 }, ledge);
  assert.ok(result.x < -.19, 'the footprint should stay on the high shelf');
  near(ledge(result.x), 8);
  const gap = x => x > -.035 && x < .035 ? -7 : 0;
  const crossing = constrainTerrainStep({ x: -.8, z: 0 }, { x: .8, z: 0 }, gap);
  assert.ok(crossing.x < 0, 'substeps and midpoint samples must detect the gap');
});

test('continuous steep slopes block climbs and drops while allowing contour sliding', () => {
  const hill = x => x <= 0 ? 0 : Math.min(8, x * 4);
  const climb = constrainTerrainStep({ x: -.5, z: 0 }, { x: 1, z: 0 }, hill);
  assert.ok(climb.x < .02);
  const drop = x => x < 0 ? 8 : Math.max(0, 8 - x * 4);
  const slide = constrainTerrainStep({ x: -.5, z: 0 }, { x: 1, z: 1.2 }, drop);
  assert.ok(slide.x < .02);
  assert.ok(slide.z > 1.05, 'blocked downhill motion should retain motion beside the edge');
  assert.ok(drop(slide.x) > 7.95);
});

test('repeated pushing does not gradually creep over a cliff', () => {
  const height = x => x < 0 ? 8 : 0;
  let position = { x: -.5, z: 0 };
  for (let i = 0; i < 120; i++) position = constrainTerrainStep(position, { x: position.x + .365, z: position.z }, height);
  assert.ok(position.x < -.19);
  near(height(position.x), 8);
});

test('non-finite terrain fails closed and a stationary step stays stationary', () => {
  const origin = { x: -.5, z: 0 };
  assert.deepEqual(constrainTerrainStep(origin, origin, () => 0), origin);
  const result = constrainTerrainStep(origin, { x: 1, z: 0 }, x => x >= 0 ? NaN : 0);
  assert.ok(result.x < 0); assert.ok(Number.isFinite(result.x) && Number.isFinite(result.z));
});

test('terrain sliding respects an object beside a cliff that the original sweep missed', () => {
  const from = { x: -1, z: 0 }, desired = { x: 1, z: 1 }, obstacle = { x: -.21, z: .9, radius: .12 }, playerRadius = .26;
  const afterObjects = slideAroundPaint(from, desired, [obstacle], playerRadius);
  const result = constrainTerrainStep(from, afterObjects, x => x < 0 ? 8 : 0, {
    isPositionAllowed: (x, z) => Math.hypot(x - obstacle.x, z - obstacle.z) >= obstacle.radius + playerRadius,
  });
  assert.ok(result.x < -.19);
  assert.ok(Math.hypot(result.x - obstacle.x, result.z - obstacle.z) >= obstacle.radius + playerRadius);
});

test('a position guard can allow leaving a conservative proxy without permitting deeper entry', () => {
  const from = { x: -.1, z: 0 };
  const isPositionAllowed = (x, z, origin) => {
    const distance = Math.hypot(x, z), before = Math.hypot(origin.x, origin.z);
    return distance >= .5 || (before < .5 && distance >= before - 1e-8);
  };
  const escaped = constrainTerrainStep(from, { x: -.8, z: 0 }, () => 0, { isPositionAllowed });
  near(escaped.x, -.8);
  const inward = constrainTerrainStep(from, { x: .2, z: 0 }, () => 0, { isPositionAllowed });
  assert.ok(inward.x <= from.x + 1e-7);
});

test('the actual starry valley cliff remains above the river under sustained sprint input', () => {
  const z = 14, edge = valleyEdge(z, pathX);
  let position = { x: edge + 2.5, z };
  const height = ground(position.x, position.z);
  for (let i = 0; i < 90; i++) position = constrainTerrainStep(position, { x: position.x - .365, z: position.z }, ground);
  assert.ok(position.x > valleyEdge(position.z, pathX) + .6);
  assert.ok(ground(position.x, position.z) > height - .7);
});

test('all three starry memories and its portal remain reachable along the shelf', () => {
  const routes = [
    [{ x: -4, z: 4 }],
    [{ x: 0, z: -9 }, { x: -8, z: -9 }],
    [{ x: 7, z: -21 }, { x: 10, z: -21 }],
    [{ x: 7, z: -8 }],
  ];
  for (const route of routes) {
    let position = { x: 0, z: 15 };
    for (const target of route) {
      for (let step = 0; step < 1000 && Math.hypot(target.x - position.x, target.z - position.z) > .01; step++) {
        const dx = target.x - position.x, dz = target.z - position.z, distance = Math.hypot(dx, dz), amount = Math.min(.21, distance);
        const desired = { x: position.x + dx / distance * amount, z: position.z + dz / distance * amount };
        const next = constrainTerrainStep(position, desired, ground);
        assert.ok(Math.abs(ground(next.x, next.z) - ground(position.x, position.z)) < .22, 'the route must not contain an abrupt vertical drop');
        position = next;
      }
      assert.ok(Math.hypot(target.x - position.x, target.z - position.z) < .02, `shelf route blocked before ${JSON.stringify(target)} at ${JSON.stringify(position)}`);
    }
  }
});
