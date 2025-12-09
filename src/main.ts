import './styles/main.css';
import { AppController } from './ui/app-controller';
import { registerSW } from 'virtual:pwa-register';

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

console.log(`Igopon v${__APP_VERSION__} started in ${import.meta.env.MODE} mode`);

const root = document.querySelector<HTMLDivElement>('#app');

if (!root) {
  throw new Error('#app element is missing');
}

new AppController(root);
