import './styles/main.css';
import { AppController } from './ui/app-controller';
import { registerSW } from 'virtual:pwa-register';

// Auto-update the Service Worker when a new version is found
const appVersion = __APP_VERSION__;

// Force unregister Service Worker if in development or if version mismatch is detected
// This helps clear "zombie" service workers from previous production builds running on localhost
if (import.meta.env.DEV) {
  if ('serviceWorker' in navigator) {
    navigator.serviceWorker.getRegistrations().then(registrations => {
      for (const registration of registrations) {
        // console.log('Unregistering Service Worker in DEV mode:', registration);
        registration.unregister();
      }
    });
  }
} else {
  // Auto-update the Service Worker when a new version is found
  registerSW({
    immediate: true,
    onNeedRefresh() {
      console.log('New content available, reloading...');
      // Force reload to apply updates
      window.location.reload();
    },
    onOfflineReady() {
      console.log('App ready to work offline');
    },
  });
}

console.log(`Igopon v${appVersion} started in ${import.meta.env.MODE} mode`);

const root = document.querySelector<HTMLDivElement>('#app');

if (!root) {
  throw new Error('#app element is missing');
}

new AppController(root);
