import { Component, useState, type ErrorInfo, type ReactNode } from 'react';
import { createRoot } from 'react-dom/client';
import { App } from './App';
import { InvalidSaveError, loadSave, resetSave, telemetry } from './platform';
import { RULESET } from './game/types';
import './styles.css';

const root = createRoot(document.getElementById('root')!);
function Recovery({ error, runtime = false }: { error: unknown; runtime?: boolean }) {
  const [confirmReset, setConfirmReset] = useState(false);
  const [busy, setBusy] = useState(false);
  const [resetError, setResetError] = useState('');
  const invalid = error instanceof InvalidSaveError;
  return (
    <div className="boot-screen" role="alert">
      <span className="eyebrow">PATIENT RECORDS {runtime ? 'PAUSED' : 'UNAVAILABLE'}</span>
      <h1>{runtime ? 'Your appointment was interrupted.' : 'We could not open your records.'}</h1>
      <p>
        {runtime
          ? 'Reload your saved records to continue. A fight interrupted by an error does not count as a defeat. Progress still waiting to save may need to be repeated.'
          : error instanceof Error
            ? error.message
            : 'Please check your connection.'}
      </p>
      <button disabled={busy} onClick={() => location.reload()}>
        Reconnect
      </button>
      {invalid && !confirmReset && (
        <button onClick={() => setConfirmReset(true)}>Reset damaged records…</button>
      )}
      {invalid && confirmReset && (
        <>
          <p>
            This deletes this game's current run, guardians, records, achievements, and settings.
            This cannot be undone.
          </p>
          <button
            disabled={busy}
            onClick={async () => {
              setBusy(true);
              setResetError('');
              try {
                showGame(await resetSave());
              } catch (error) {
                setResetError(error instanceof Error ? error.message : 'Reset failed.');
                setBusy(false);
              }
            }}
          >
            Confirm reset
          </button>
          <button disabled={busy} onClick={() => setConfirmReset(false)}>
            Keep records
          </button>
        </>
      )}
      {resetError && <p>{resetError}</p>}
    </div>
  );
}
class RuntimeBoundary extends Component<
  { children: ReactNode },
  { failed: boolean; error: unknown }
> {
  state = { failed: false, error: undefined as unknown };
  static getDerivedStateFromError(error: unknown) {
    return { failed: true, error };
  }
  componentDidCatch(error: unknown, info: ErrorInfo) {
    telemetry('runtime_failed', {
      ruleset: RULESET,
      source: 'react',
      message: error instanceof Error ? error.message.slice(0, 256) : 'Unknown rendering error',
      component: (info.componentStack ?? '').slice(0, 256),
    });
  }
  render() {
    return this.state.failed ? <Recovery error={this.state.error} runtime /> : this.props.children;
  }
}
function showGame(save: Awaited<ReturnType<typeof loadSave>>) {
  if (failed) return;
  root.render(
    <RuntimeBoundary>
      <App initialSave={save} />
    </RuntimeBoundary>,
  );
}
let failed = false;
function runtimeFailure(error: unknown, source: string) {
  if (failed) return;
  failed = true;
  telemetry('runtime_failed', {
    ruleset: RULESET,
    source,
    message: error instanceof Error ? error.message.slice(0, 256) : 'Unknown runtime error',
  });
  root.render(<Recovery error={error} runtime />);
}
window.addEventListener('error', (event) => {
  if (event.error || event.message)
    runtimeFailure(event.error ?? new Error(event.message), 'window');
});
window.addEventListener('unhandledrejection', (event) => {
  runtimeFailure(event.reason, 'promise');
});
root.render(
  <div className="boot-screen">
    <span className="eyebrow">FRANKENTOWER</span>
    <h1>Preparing your appointment.</h1>
    <p>Connecting to patient records…</p>
  </div>,
);
loadSave()
  .then(showGame)
  .catch((error) => {
    if (failed) return;
    telemetry('load_failed', { ruleset: RULESET, invalid: error instanceof InvalidSaveError });
    root.render(<Recovery error={error} />);
  });
