import './styles/main.css';
import { AppController } from './ui/app-controller';

console.log(`Igopon v${__APP_VERSION__} started in ${import.meta.env.MODE} mode`);

const root = document.querySelector<HTMLDivElement>('#app');

if (!root) {
  throw new Error('#app element is missing');
}

new AppController(root);
