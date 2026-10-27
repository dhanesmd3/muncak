import { render } from 'preact';
import { reportError } from './api/client';
import { App } from './app/App';
import './styles/tokens.css';
import './styles/app.css';

// Error reports carry only the message and app version (docs/05-teknis.md §12).
window.addEventListener('error', (e) => reportError(String(e.message || 'error')));
window.addEventListener('unhandledrejection', (e) =>
  reportError(String((e.reason as Error)?.message ?? e.reason ?? 'unhandled rejection')),
);

render(<App />, document.getElementById('app')!);
