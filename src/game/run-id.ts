import type { Run } from './types';

export function nextUid(run: Run) {
  return `r${run.seed}-${++run.serial}`;
}
