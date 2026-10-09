import { defaultSave } from './game/run';
import { RULESET, type Save } from './game/types';
import { ITEM_MAP } from './game/content';
type API = typeof import('@series-inc/rundot-game-sdk/api').default;
let api: API | undefined;
let offline: typeof import('./offline-storage') | undefined;
let queue = Promise.resolve();
let writeRevision = 0;
let status = 'Connecting';
let paused = false;
const listeners = new Set<() => void>();
export const platformStatus = () => status;
export const hostPaused = () => paused;
export const subscribePlatform = (callback: () => void) => { listeners.add(callback); return () => { listeners.delete(callback); }; };
function update(value: string) { status = value; listeners.forEach(fn => fn()); }
const KEY = 'frankentower-save-v1';
function parseSave(text: string | null): Save {
  if (!text) return defaultSave();
  const save = JSON.parse(text) as Save;
  if (save.version !== RULESET) throw new Error('This save uses an incompatible ruleset.');
  if (!Array.isArray(save.legacy) || !Array.isArray(save.records) || !Array.isArray(save.achievements) || !save.settings || typeof save.best !== 'number') throw new Error('Save data could not be read.');
  for (const build of [save.run?.build, ...save.legacy.map(x => x.build), ...save.records.map(x => x.build)].filter(Boolean)) {
    if (!Array.isArray(build!.parts) || build!.parts.some(p => p.item && !ITEM_MAP[p.item.defId])) throw new Error('A saved build contains unknown content.');
  }
  if (save.run?.phase === 'combat') save.run.phase = 'build';
  return save;
}
export async function loadSave(): Promise<Save> {
  if (import.meta.env.MODE === 'offline') {
    offline = await import('./offline-storage'); update('Local save'); return parseSave(offline.read(KEY));
  }
  api = (await import('@series-inc/rundot-game-sdk/api')).default;
  const safeArea = () => {
    const area = api!.system.getSafeArea();
    for (const [side, value] of Object.entries(area)) document.documentElement.style.setProperty(`--safe-${side}`, `${value}px`);
  };
  safeArea(); api.lifecycles.onSafeAreaChanged(safeArea);
  api.lifecycles.onPause(() => { paused = true; listeners.forEach(fn => fn()); });
  api.lifecycles.onSleep(() => { paused = true; listeners.forEach(fn => fn()); });
  api.lifecycles.onResume(() => { paused = false; listeners.forEach(fn => fn()); });
  api.lifecycles.onAwake(() => { paused = false; listeners.forEach(fn => fn()); });
  const save = parseSave(await api.appStorage.getItem(KEY));
  update('Cloud save'); return save;
}
export function persist(save: Save) {
  const text = JSON.stringify(save);
  const revision = ++writeRevision;
  update('Saving…');
  queue = queue.catch(() => {}).then(async () => {
    try {
      if (offline) offline.write(KEY, text);
      else if (api) await api.appStorage.setItem(KEY, text);
      if (revision === writeRevision) update(offline ? 'Local save' : 'Cloud save');
    } catch { if (revision === writeRevision) update('Save pending · retry on next action'); }
  });
  return queue;
}
export function telemetry(event: string, data: Record<string, string | number | boolean>) {
  try { void api?.analytics.recordCustomEvent(event, data).catch(() => {}); } catch { /* Telemetry never interrupts a run. */ }
}
