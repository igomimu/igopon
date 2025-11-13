var __classPrivateFieldGet = (this && this.__classPrivateFieldGet) || function (receiver, state, kind, f) {
    if (kind === "a" && !f) throw new TypeError("Private accessor was defined without a getter");
    if (typeof state === "function" ? receiver !== state || !f : !state.has(receiver)) throw new TypeError("Cannot read private member from an object whose class did not declare it");
    return kind === "m" ? f : kind === "a" ? f.call(receiver) : f ? f.value : state.get(receiver);
};
var __classPrivateFieldSet = (this && this.__classPrivateFieldSet) || function (receiver, state, value, kind, f) {
    if (kind === "m") throw new TypeError("Private method is not writable");
    if (kind === "a" && !f) throw new TypeError("Private accessor was defined without a setter");
    if (typeof state === "function" ? receiver !== state || !f : !state.has(receiver)) throw new TypeError("Cannot write private member to an object whose class did not declare it");
    return (kind === "a" ? f.call(receiver, value) : f ? f.value = value : state.set(receiver, value)), value;
};
var _SessionState_instances, _SessionState_state, _SessionState_listeners, _SessionState_emit;
export const HIGH_SCORE_KEY = 'igopon2.highScore';
function createDefaultCaptures() {
    return { black: 0, white: 0 };
}
export function createInitialState() {
    return {
        active: false,
        paused: false,
        score: 0,
        level: 1,
        chain: 0,
        captures: createDefaultCaptures(),
        piecesPlaced: 0,
        lastResult: null
    };
}
export class SessionState {
    constructor() {
        _SessionState_instances.add(this);
        _SessionState_state.set(this, createInitialState());
        _SessionState_listeners.set(this, new Set());
    }
    subscribe(listener) {
        __classPrivateFieldGet(this, _SessionState_listeners, "f").add(listener);
        listener(__classPrivateFieldGet(this, _SessionState_state, "f"));
        return () => __classPrivateFieldGet(this, _SessionState_listeners, "f").delete(listener);
    }
    get snapshot() {
        return __classPrivateFieldGet(this, _SessionState_state, "f");
    }
    startNewGame() {
        __classPrivateFieldSet(this, _SessionState_state, {
            active: true,
            paused: false,
            score: 0,
            level: 1,
            chain: 0,
            captures: createDefaultCaptures(),
            piecesPlaced: 0,
            lastResult: null
        }, "f");
        __classPrivateFieldGet(this, _SessionState_instances, "m", _SessionState_emit).call(this);
    }
    togglePause() {
        if (!__classPrivateFieldGet(this, _SessionState_state, "f").active) {
            return;
        }
        __classPrivateFieldSet(this, _SessionState_state, { ...__classPrivateFieldGet(this, _SessionState_state, "f"), paused: !__classPrivateFieldGet(this, _SessionState_state, "f").paused }, "f");
        __classPrivateFieldGet(this, _SessionState_instances, "m", _SessionState_emit).call(this);
    }
    adjustScore(delta) {
        if (!Number.isFinite(delta) || delta === 0) {
            return;
        }
        const nextScore = Math.max(0, __classPrivateFieldGet(this, _SessionState_state, "f").score + Math.trunc(delta));
        const piecesPlaced = delta > 0 ? __classPrivateFieldGet(this, _SessionState_state, "f").piecesPlaced + 1 : __classPrivateFieldGet(this, _SessionState_state, "f").piecesPlaced;
        const chain = delta > 0 ? Math.min(__classPrivateFieldGet(this, _SessionState_state, "f").chain + 1, 99) : Math.max(__classPrivateFieldGet(this, _SessionState_state, "f").chain - 1, 0);
        const levelUp = nextScore > 0 && nextScore % 5000 === 0;
        __classPrivateFieldSet(this, _SessionState_state, {
            ...__classPrivateFieldGet(this, _SessionState_state, "f"),
            score: nextScore,
            piecesPlaced,
            chain,
            level: levelUp ? Math.min(__classPrivateFieldGet(this, _SessionState_state, "f").level + 1, 99) : __classPrivateFieldGet(this, _SessionState_state, "f").level
        }, "f");
        __classPrivateFieldGet(this, _SessionState_instances, "m", _SessionState_emit).call(this);
    }
    recordCapture(color, amount = 1) {
        if (!__classPrivateFieldGet(this, _SessionState_state, "f").active) {
            return;
        }
        const clamped = Math.max(0, amount);
        __classPrivateFieldSet(this, _SessionState_state, {
            ...__classPrivateFieldGet(this, _SessionState_state, "f"),
            captures: {
                ...__classPrivateFieldGet(this, _SessionState_state, "f").captures,
                [color]: __classPrivateFieldGet(this, _SessionState_state, "f").captures[color] + clamped
            }
        }, "f");
        __classPrivateFieldGet(this, _SessionState_instances, "m", _SessionState_emit).call(this);
    }
    endGame(reason) {
        if (!__classPrivateFieldGet(this, _SessionState_state, "f").active) {
            return;
        }
        __classPrivateFieldSet(this, _SessionState_state, {
            ...__classPrivateFieldGet(this, _SessionState_state, "f"),
            active: false,
            paused: false,
            lastResult: {
                reason,
                timestamp: Date.now(),
                finalScore: __classPrivateFieldGet(this, _SessionState_state, "f").score
            }
        }, "f");
        __classPrivateFieldGet(this, _SessionState_instances, "m", _SessionState_emit).call(this);
    }
}
_SessionState_state = new WeakMap(), _SessionState_listeners = new WeakMap(), _SessionState_instances = new WeakSet(), _SessionState_emit = function _SessionState_emit() {
    __classPrivateFieldGet(this, _SessionState_listeners, "f").forEach(listener => listener(__classPrivateFieldGet(this, _SessionState_state, "f")));
};
export function loadHighScore() {
    try {
        const raw = localStorage.getItem(HIGH_SCORE_KEY);
        return raw ? Number(raw) || 0 : 0;
    }
    catch {
        return 0;
    }
}
export function saveHighScore(value) {
    try {
        localStorage.setItem(HIGH_SCORE_KEY, String(Math.max(0, value)));
    }
    catch {
        // ignore storage errors for now
    }
}
