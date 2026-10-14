import test from 'node:test';
import assert from 'node:assert/strict';
import { validateContent } from '../src/game/content-validation';

test('authored item, anatomy, set and procedure definitions satisfy content invariants', () => {
  assert.doesNotThrow(validateContent);
});
