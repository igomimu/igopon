export interface CaptureState {
  black: number;
  white: number;
}

export interface LastResultSummary {
  reason: string;
  timestamp: number;
  finalScore: number;
}

export interface GameSessionState {
  active: boolean;
  paused: boolean;
  score: number;
  level: number;
  chain: number;
  captures: CaptureState;
  piecesPlaced: number;
  danger: boolean;
  lastResult: LastResultSummary | null;
}

export const HIGH_SCORE_KEY = 'igopon.highScore';

function createDefaultCaptures(): CaptureState {
  return { black: 0, white: 0 };
}

export function createInitialState(): GameSessionState {
  return {
    active: false,
    paused: false,
    score: 0,
    level: 1,
    chain: 0,
    captures: createDefaultCaptures(),
    piecesPlaced: 0,
    danger: false,
    lastResult: null
  };
}

type SessionListener = (state: GameSessionState) => void;

export class SessionState {
  #state: GameSessionState = createInitialState();
  #listeners = new Set<SessionListener>();

  subscribe(listener: SessionListener): () => void {
    this.#listeners.add(listener);
    listener(this.#state);
    return () => this.#listeners.delete(listener);
  }

  get snapshot(): GameSessionState {
    return this.#state;
  }

  startNewGame(): void {
    this.#state = {
      active: true,
      paused: false,
      score: 0,
      level: 1,
      chain: 0,
      captures: createDefaultCaptures(),
      piecesPlaced: 0,
      danger: false,
      lastResult: null
    };
    this.#emit();
  }

  togglePause(): void {
    if (!this.#state.active) {
      return;
    }
    this.#state = { ...this.#state, paused: !this.#state.paused };
    this.#emit();
  }

  adjustScore(delta: number): void {
    if (!Number.isFinite(delta) || delta === 0) {
      return;
    }
    const nextScore = Math.max(0, this.#state.score + Math.trunc(delta));
    const piecesPlaced = delta > 0 ? this.#state.piecesPlaced + 1 : this.#state.piecesPlaced;
    const chain = delta > 0 ? Math.min(this.#state.chain + 1, 99) : Math.max(this.#state.chain - 1, 0);
    const levelUp = nextScore > 0 && nextScore % 5000 === 0;
    this.#state = {
      ...this.#state,
      score: nextScore,
      piecesPlaced,
      chain,
      danger: this.#state.danger,
      level: levelUp ? Math.min(this.#state.level + 1, 99) : this.#state.level
    };
    this.#emit();
  }

  recordCapture(color: keyof CaptureState, amount = 1): void {
    if (!this.#state.active) {
      return;
    }
    const clamped = Math.max(0, amount);
    this.#state = {
      ...this.#state,
      danger: this.#state.danger,
      captures: {
        ...this.#state.captures,
        [color]: this.#state.captures[color] + clamped
      }
    };
    this.#emit();
  }

  endGame(reason: string): void {
    if (!this.#state.active) {
      return;
    }
    this.#state = {
      ...this.#state,
      active: false,
      paused: false,
      danger: false,
      lastResult: {
        reason,
        timestamp: Date.now(),
        finalScore: this.#state.score
      }
    };
    this.#emit();
  }

  #emit(): void {
    this.#listeners.forEach(listener => listener(this.#state));
  }

  replace(state: GameSessionState): void {
    this.#state = { ...state };
    this.#emit();
  }
}

export function loadHighScore(): number {
  try {
    const raw = localStorage.getItem(HIGH_SCORE_KEY);
    return raw ? Number(raw) || 0 : 0;
  } catch {
    return 0;
  }
}

export function saveHighScore(value: number): void {
  try {
    localStorage.setItem(HIGH_SCORE_KEY, String(Math.max(0, value)));
  } catch {
    // ignore storage errors for now
  }
}
