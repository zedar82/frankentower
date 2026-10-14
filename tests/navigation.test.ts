import test from 'node:test';
import assert from 'node:assert/strict';
import { initialRunScreen } from '../src/ui/useRunNavigation';

test('saved run phases restore the intended primary screen', () => {
  assert.equal(initialRunScreen('start'), null);
  assert.equal(initialRunScreen('combat'), null);
  assert.equal(initialRunScreen('build'), 'shop');
  assert.equal(initialRunScreen('result'), 'log');
  assert.equal(initialRunScreen('checkpoint'), 'log');
  assert.equal(initialRunScreen('dead'), 'log');
  assert.equal(initialRunScreen('retired'), 'log');
  assert.equal(initialRunScreen('complete'), 'log');
  // Clinic navigation is intentionally transient; a saved build opens supplies.
  assert.equal(initialRunScreen('build'), 'shop');
});
