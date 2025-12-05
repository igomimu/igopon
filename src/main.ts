import './styles/main.css';
import { AppController } from './ui/app-controller';
// import * as Sentry from '@sentry/browser';

// Sentry.init({
//   dsn: import.meta.env.VITE_SENTRY_DSN,
//   integrations: [
//     Sentry.browserTracingIntegration(),
//     Sentry.replayIntegration(),
//   ],
//   tracesSampleRate: 1.0,
//   replaysSessionSampleRate: 0.1,
//   replaysOnErrorSampleRate: 1.0,
// });
console.log(`Igopon v${__APP_VERSION__} started in ${import.meta.env.MODE} mode`);

const root = document.querySelector<HTMLDivElement>('#app');

if (!root) {
  throw new Error('#app element is missing');
}

new AppController(root);
