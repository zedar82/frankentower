import { defaultSave } from './game/run';
import { RULESET, type Save } from './game/types';
import { parseSave } from './save-validation';
import { SaveWriter } from './save-writer';
export { InvalidSaveError } from './save-validation';
type API = typeof import('@series-inc/rundot-game-sdk/api').default;
let api: API | undefined;
let offline: typeof import('./offline-storage') | undefined;
let writer: SaveWriter | undefined;
let initialization: Promise<void> | undefined;
let status = 'Connecting';
let paused = false;
const listeners = new Set<() => void>();
export const platformStatus = () => status;
export const hostPaused = () => paused;
export const savePending = () => writer?.hasPending ?? false;
export const subscribePlatform = (callback: () => void) => {
  listeners.add(callback);
  return () => {
    listeners.delete(callback);
  };
};
function update(value: string) {
  status = value;
  listeners.forEach((fn) => fn());
}
const KEY = 'frankentower-save-v1';
async function initialize() {
  if (!initialization)
    initialization = (async () => {
      if (import.meta.env.MODE === 'offline') offline = await import('./offline-storage');
      else {
        api = (await import('@series-inc/rundot-game-sdk/api')).default;
        const safeArea = () => {
          const area = api!.system.getSafeArea();
          for (const [side, value] of Object.entries(area))
            document.documentElement.style.setProperty(`--safe-${side}`, `${value}px`);
        };
        safeArea();
        api.lifecycles.onSafeAreaChanged(safeArea);
        const pause = () => {
          paused = true;
          void retrySave();
          listeners.forEach((fn) => fn());
        };
        const resume = () => {
          paused = false;
          void retrySave();
          listeners.forEach((fn) => fn());
        };
        api.lifecycles.onPause(pause);
        api.lifecycles.onSleep(pause);
        api.lifecycles.onResume(resume);
        api.lifecycles.onAwake(resume);
      }
      writer = new SaveWriter({
        write: async (text) => {
          if (offline) offline.write(KEY, text);
          else await api!.appStorage.setItem(KEY, text);
        },
        status: (pending, failed) =>
          update(
            failed
              ? 'Unsaved progress · retrying'
              : pending
                ? 'Saving…'
                : offline
                  ? 'Local save'
                  : 'Cloud save',
          ),
        failed: () => telemetry('save_failed', { ruleset: RULESET }),
      });
      window.addEventListener('online', () => {
        void retrySave();
      });
      document.addEventListener('visibilitychange', () => {
        void retrySave();
      });
      window.addEventListener('pagehide', () => {
        void retrySave();
      });
      window.addEventListener('beforeunload', (event) => {
        if (!savePending()) return;
        void retrySave();
        event.preventDefault();
        event.returnValue = '';
      });
    })().catch((error) => {
      initialization = undefined;
      throw error;
    });
  await initialization;
}
export async function loadSave(): Promise<Save> {
  await initialize();
  const save = parseSave(offline ? offline.read(KEY) : await api!.appStorage.getItem(KEY));
  update(offline ? 'Local save' : 'Cloud save');
  return save;
}
export async function resetSave(): Promise<Save> {
  await initialize();
  const save = defaultSave();
  await persist(save);
  if (savePending())
    throw new Error(
      'The reset could not be saved. The reset is pending and will retry while this page stays open. Please retry the connection.',
    );
  return save;
}
export function persist(save: Save): Promise<void> {
  if (!writer) return Promise.reject(new Error('Patient storage is not connected.'));
  return writer.enqueue(JSON.stringify(save));
}
export const retrySave = () => writer?.flush() ?? Promise.resolve();
export function telemetry(event: string, data: Record<string, string | number | boolean>) {
  try {
    void api?.analytics.recordCustomEvent(event, data).catch(() => {});
  } catch {
    /* Telemetry never interrupts a run. */
  }
}
