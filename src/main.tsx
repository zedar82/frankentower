import { createRoot } from 'react-dom/client';
import { App } from './App';
import { loadSave } from './platform';
import { puppetReady } from './art/puppet';
import './styles.css';

const root = createRoot(document.getElementById('root')!);
root.render(<div className="boot-screen"><span className="eyebrow">FRANKENTOWER</span><h1>Preparing your appointment.</h1><p>Connecting to patient records…</p></div>);
Promise.all([loadSave(),puppetReady]).then(([save]) => root.render(<App initialSave={save}/>)).catch(error => root.render(<div className="boot-screen"><span className="eyebrow">PATIENT RECORDS UNAVAILABLE</span><h1>We could not open your records.</h1><p>{error instanceof Error ? error.message : 'Please check your connection.'}</p><button onClick={()=>location.reload()}>Reconnect</button></div>));
