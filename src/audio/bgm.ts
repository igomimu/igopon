import { t } from '../i18n';

export type BgmRole = 'lobby' | 'game' | 'danger';

interface BgmPreset {
  src: string;
  labelKey: 'bgm.lobby' | 'bgm.game' | 'bgm.danger';
}

const ACTIVE_VOLUME = 0.6;
const QUIET_VOLUME = 0.25;
const BASE_PATH = (import.meta.env.BASE_URL ?? '/').replace(/\/$/, '');
const withBase = (path: string) => `${BASE_PATH}${path.startsWith('/') ? path : `/${path}`}`;
const PRESETS: Record<BgmRole, BgmPreset> = {
  lobby: {
    src: withBase('/audio/igopon-lobby.mp3'),
    labelKey: 'bgm.lobby'
  },
  game: {
    src: withBase('/audio/igopon-game.mp3'),
    labelKey: 'bgm.game'
  },
  danger: {
    src: withBase('/audio/igopon-game2.mp3'),
    labelKey: 'bgm.danger'
  }
};

export interface BgmStatusContext {
  paused: boolean;
  hidden: boolean;
}

export class BgmController {
  #audio: HTMLAudioElement;
  #preference = true;
  #role: BgmRole = 'lobby';
  #unlocked = false;

  constructor(element: HTMLAudioElement) {
    this.#audio = element;
    this.#audio.loop = true;
    this.#audio.dataset.role = this.#role;
    this.#audio.volume = QUIET_VOLUME;
    this.#applyPreset(this.#role, { autoplay: false });
  }

  get role(): BgmRole {
    return this.#role;
  }

  get preference(): boolean {
    return this.#preference;
  }

  togglePreference(): boolean {
    this.setPreference(!this.#preference);
    return this.#preference;
  }

  setPreference(value: boolean): void {
    this.#preference = value;
    if (!this.#preference) {
      this.#audio.pause();
    } else {
      void this.#ensurePlayback();
    }
  }

  setRole(role: BgmRole, options: { autoplay?: boolean } = {}): void {
    if (!PRESETS[role]) {
      return;
    }
    this.#role = role;
    this.#audio.dataset.role = role;
    this.#applyPreset(role, options);
  }

  setPaused(paused: boolean): void {
    if (!this.#preference) {
      return;
    }
    this.#audio.volume = paused ? QUIET_VOLUME : ACTIVE_VOLUME;
    if (!paused) {
      void this.#ensurePlayback();
    }
  }

  getStatusMessage(context: BgmStatusContext): string {
    const label = t(PRESETS[this.#role].labelKey);
    const suffix = label ? ` (${label})` : '';
    if (!this.#preference) {
      return `${t('bgm.off')}${suffix}`.trim();
    }
    if (this.#audio.paused && !this.#unlocked) {
      return `${t('bgm.pendingUnlock')}${suffix}`.trim();
    }
    if (context.hidden || context.paused) {
      return `${t('bgm.playingMute')}${suffix}`;
    }
    return `${t('bgm.playing')}${suffix}`;
  }

  async unlockViaGesture(): Promise<void> {
    if (!this.#preference) {
      return;
    }
    await this.#ensurePlayback();
  }

  #applyPreset(role: BgmRole, options: { autoplay?: boolean } = {}): void {
    const preset = PRESETS[role];
    if (!preset) {
      return;
    }
    const autoplay = options.autoplay ?? true;
    if (this.#audio.getAttribute('src') !== preset.src) {
      this.#audio.pause();
      this.#audio.currentTime = 0;
      this.#audio.src = preset.src;
      this.#audio.load();
    }
    if (autoplay && this.#preference) {
      void this.#ensurePlayback();
    }
  }

  async #ensurePlayback(): Promise<void> {
    if (!this.#preference) {
      return;
    }
    try {
      await this.#audio.play();
      this.#unlocked = true;
    } catch {
      this.#unlocked = false;
    }
  }
}
