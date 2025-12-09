const BASE_PATH = (import.meta.env.BASE_URL ?? '/').replace(/\/$/, '');
const withBase = (path: string) => `${BASE_PATH}${path.startsWith('/') ? path : `/${path}`}`;

export class SeController {
    #enabled = true;
    #ctx: AudioContext | null = null;
    #buffers = new Map<string, AudioBuffer>();


    constructor() {
        const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
        if (AudioContextClass) {
            this.#ctx = new AudioContextClass();
            this.#preloadAll();
        } else {
            console.warn('Web Audio API not supported');
        }
    }

    async #preloadAll(): Promise<void> {
        const sounds = [
            'ishioto1.ogg', 'ishioto2.ogg', 'ishioto3.ogg',
            'nuki1.ogg', 'nuki2.ogg'
        ];

        const loadFile = async (filename: string) => {
            try {
                const path = withBase(`/audio/se/${filename}`);
                const response = await fetch(path);
                const arrayBuffer = await response.arrayBuffer();
                if (this.#ctx) {
                    const audioBuffer = await this.#ctx.decodeAudioData(arrayBuffer);
                    this.#buffers.set(filename, audioBuffer);
                }
            } catch (e) {
                console.warn(`Failed to load SE: ${filename}`, e);
            }
        };

        await Promise.all(sounds.map(loadFile));
    }

    get enabled(): boolean {
        return this.#enabled;
    }

    setEnabled(value: boolean): void {
        this.#enabled = value;
    }

    unlock(): void {
        if (this.#ctx && this.#ctx.state === 'suspended') {
            void this.#ctx.resume();
        }
    }

    playStone(): void {
        if (!this.#enabled) return;
        const index = Math.floor(Math.random() * 3) + 1;
        this.#play(`ishioto${index}.ogg`);
    }

    playCapture(count: number): void {
        if (!this.#enabled) return;
        if (count >= 10) {
            this.#play('nuki2.ogg');
        } else {
            this.#play('nuki1.ogg');
        }
    }

    #play(filename: string): void {
        if (!this.#ctx || !this.#buffers.has(filename)) return;

        try {
            const source = this.#ctx.createBufferSource();
            source.buffer = this.#buffers.get(filename)!;

            // Gain node for volume control if needed, 0.6 to match previous
            const gain = this.#ctx.createGain();
            gain.gain.value = 0.6;

            source.connect(gain);
            gain.connect(this.#ctx.destination);

            source.start(0);
        } catch (e) {
            console.warn('Failed to play sound buffer:', e);
        }
    }
}
