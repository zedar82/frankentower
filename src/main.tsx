import { Component, useState, type ErrorInfo, type ReactNode } from 'react';
import { createRoot } from 'react-dom/client';
import { App } from './App';
import { InvalidSaveError, loadSave, resetSave, telemetry } from './platform';
import { RULESET } from './game/types';
import './styles.css';
import './ui-materials.css';
import './ui-hud.css';
import './ui-shop.css';
import './ui-clinic.css';
import { PagedText } from './ui/Paging';
import { AssetLoadError, retryFailedAssets } from './art/asset-loader';

const root = createRoot(document.getElementById('root')!);
function Recovery({ error, runtime = false }: { error: unknown; runtime?: boolean }) {
  const [confirmReset, setConfirmReset] = useState(false);
  const [busy, setBusy] = useState(false);
  const [resetError, setResetError] = useState('');
  const [assetRetryError, setAssetRetryError] = useState('');
  const invalid = error instanceof InvalidSaveError;
  const assetFailure = error instanceof AssetLoadError;
  return (
    <div className="boot-screen" role="alert">
      <span className="eyebrow">PATIENT RECORDS {runtime ? 'PAUSED' : 'UNAVAILABLE'}</span>
      <h1>
        {confirmReset
          ? 'Permanently delete all patient records?'
          : runtime
            ? 'Your appointment was interrupted.'
            : 'We could not open your records.'}
      </h1>
      <PagedText
        text={
          (confirmReset
            ? 'This deletes this game’s current run, guardians, records, achievements, and settings. This cannot be undone.\n\n'
            : '') +
          (runtime
            ? 'Reload your saved records to continue. A fight interrupted by an error does not count as a defeat. Progress still waiting to save may need to be repeated.'
            : error instanceof Error
              ? error.message
              : 'Please check your connection.') +
          (resetError ? '\n\n' + resetError : '') +
          (assetRetryError ? '\n\n' + assetRetryError : '')
        }
        label="Recovery"
      />
      <button disabled={busy} onClick={() => location.reload()}>
        Reconnect
      </button>
      {assetFailure && (
        <button
          disabled={busy}
          onClick={async () => {
            setBusy(true);
            setAssetRetryError('');
            try {
              await retryFailedAssets();
              location.reload();
            } catch (retryError) {
              setAssetRetryError(retryError instanceof Error ? retryError.message : 'Asset retry failed.');
              setBusy(false);
            }
          }}
        >
          Retry art assets
        </button>
      )}
      {invalid && !confirmReset && (
        <button onClick={() => setConfirmReset(true)}>Reset damaged records…</button>
      )}
      {invalid && confirmReset && (
        <>
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
            Confirm permanent reset
          </button>
          <button disabled={busy} onClick={() => setConfirmReset(false)}>
            Keep records
          </button>
        </>
      )}
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
