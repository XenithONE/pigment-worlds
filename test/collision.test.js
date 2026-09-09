import test from 'node:test';
import assert from 'node:assert/strict';
import { slideAroundPaint } from '../src/simulation/collision.js';

test('a long step cannot tunnel through a painted rock', () => {
  const obstacle = { x: 0, z: 0, radius: 1 };
  const result = slideAroundPaint({ x: -3, z: 0 }, { x: 3, z: 0 }, [obstacle]);
  assert.ok(result.x <= -1.26);
  assert.ok(Math.abs(result.z) < 1e-8);
});

test('walking glides around the contour and can leave an overlapping spawn', () => {
  const obstacles = [{ x: 0, z: 0, radius: 1 }];
  const result = slideAroundPaint({ x: -2, z: -.7 }, { x: .6, z: -.8 }, obstacles);
  assert.ok(Math.hypot(result.x, result.z) >= 1.25);
  assert.ok(result.z < -.8);
  assert.deepEqual(slideAroundPaint({ x: -.8, z: 0 }, { x: -2, z: 0 }, obstacles), { x: -2, z: 0 });
});
