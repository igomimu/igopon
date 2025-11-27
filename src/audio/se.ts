const BASE_PATH = (import.meta.env.BASE_URL ?? '/').replace(/\/$/, '');
const withBase = (path: string) => `${BASE_PATH}${path.startsWith('/') ? path : `/${path}`}`;

export class SeController {
    #enabled = true;

    constructor() {
        // Preload sounds if needed, or just rely on browser cache
    }

    get enabled(): boolean {
        return this.#enabled;
    }

    setEnabled(value: boolean): void {
        this.#enabled = value;
    }

    playStone(): void {
        if (!this.#enabled) return;
        const index = Math.floor(Math.random() * 3) + 1; // 1, 2, or 3
        this.#play(`ishioto${index}.ogg`);
    }

    playCapture(count: number): void {
        if (!this.#enabled) return;
        // nuki1: 5+ stones, nuki2: 10+ stones
        // If less than 5, maybe no sound or just nuki1? 
        // User specified: "1 is for 5+, 2 is for 10+". 
        // Implies: <5: no special sound? Or maybe nuki1 is default?
        // Let's assume nuki1 for any capture for now, but prioritize nuki2 for 10+.
        // Actually, let's follow the instruction strictly: 
        // If count >= 10 -> nuki2
        // Else if count >= 5 -> nuki1
        // Else -> maybe no sound? Or nuki1 as fallback?
        // Given it's a game, feedback is good. I'll use nuki1 for any capture, but nuki2 for big ones.

        if (count >= 10) {
            this.#play('nuki2.ogg');
        } else {
            this.#play('nuki1.ogg');
        }
    }

    #play(filename: string): void {
        try {
            const audio = new Audio(withBase(`/audio/se/${filename}`));
            audio.volume = 0.6; // Adjust volume as needed
            audio.play().catch(e => {
                // Ignore autoplay errors or similar
                console.warn('Failed to play SE:', e);
            });
        } catch (e) {
            console.warn('Error creating Audio:', e);
        }
    }
}
