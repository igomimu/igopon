import './styles/main.css';
import { AppController } from './ui/app-controller';
const root = document.querySelector('#app');
if (!root) {
    throw new Error('#app element is missing');
}
new AppController(root);
