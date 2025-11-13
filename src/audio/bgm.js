var __classPrivateFieldSet = (this && this.__classPrivateFieldSet) || function (receiver, state, value, kind, f) {
    if (kind === "m") throw new TypeError("Private method is not writable");
    if (kind === "a" && !f) throw new TypeError("Private accessor was defined without a setter");
    if (typeof state === "function" ? receiver !== state || !f : !state.has(receiver)) throw new TypeError("Cannot write private member to an object whose class did not declare it");
    return (kind === "a" ? f.call(receiver, value) : f ? f.value = value : state.set(receiver, value)), value;
};
var __classPrivateFieldGet = (this && this.__classPrivateFieldGet) || function (receiver, state, kind, f) {
    if (kind === "a" && !f) throw new TypeError("Private accessor was defined without a getter");
    if (typeof state === "function" ? receiver !== state || !f : !state.has(receiver)) throw new TypeError("Cannot read private member from an object whose class did not declare it");
    return kind === "m" ? f : kind === "a" ? f.call(receiver) : f ? f.value : state.get(receiver);
};
var _BgmController_instances, _BgmController_audio, _BgmController_preference, _BgmController_role, _BgmController_unlocked, _BgmController_applyPreset, _BgmController_ensurePlayback;
const ACTIVE_VOLUME = 0.6;
const QUIET_VOLUME = 0.25;
const PRESETS = {
    lobby: {
        src: '/audio/igopon-lobby.mp3',
        label: 'ロビーBGM'
    },
    game: {
        src: '/audio/igopon-game.mp3',
        label: 'ゲームBGM'
    },
    danger: {
        src: '/audio/igopon-game2.mp3',
        label: 'ゲームBGM（危険）'
    }
};
export class BgmController {
    constructor(element) {
        _BgmController_instances.add(this);
        _BgmController_audio.set(this, void 0);
        _BgmController_preference.set(this, true);
        _BgmController_role.set(this, 'lobby');
        _BgmController_unlocked.set(this, false);
        __classPrivateFieldSet(this, _BgmController_audio, element, "f");
        __classPrivateFieldGet(this, _BgmController_audio, "f").loop = true;
        __classPrivateFieldGet(this, _BgmController_audio, "f").dataset.role = __classPrivateFieldGet(this, _BgmController_role, "f");
        __classPrivateFieldGet(this, _BgmController_audio, "f").volume = QUIET_VOLUME;
        __classPrivateFieldGet(this, _BgmController_instances, "m", _BgmController_applyPreset).call(this, __classPrivateFieldGet(this, _BgmController_role, "f"), { autoplay: false });
    }
    get role() {
        return __classPrivateFieldGet(this, _BgmController_role, "f");
    }
    get preference() {
        return __classPrivateFieldGet(this, _BgmController_preference, "f");
    }
    togglePreference() {
        this.setPreference(!__classPrivateFieldGet(this, _BgmController_preference, "f"));
        return __classPrivateFieldGet(this, _BgmController_preference, "f");
    }
    setPreference(value) {
        __classPrivateFieldSet(this, _BgmController_preference, value, "f");
        if (!__classPrivateFieldGet(this, _BgmController_preference, "f")) {
            __classPrivateFieldGet(this, _BgmController_audio, "f").pause();
        }
        else {
            void __classPrivateFieldGet(this, _BgmController_instances, "m", _BgmController_ensurePlayback).call(this);
        }
    }
    setRole(role, options = {}) {
        if (!PRESETS[role]) {
            return;
        }
        __classPrivateFieldSet(this, _BgmController_role, role, "f");
        __classPrivateFieldGet(this, _BgmController_audio, "f").dataset.role = role;
        __classPrivateFieldGet(this, _BgmController_instances, "m", _BgmController_applyPreset).call(this, role, options);
    }
    setPaused(paused) {
        if (!__classPrivateFieldGet(this, _BgmController_preference, "f")) {
            return;
        }
        __classPrivateFieldGet(this, _BgmController_audio, "f").volume = paused ? QUIET_VOLUME : ACTIVE_VOLUME;
        if (!paused) {
            void __classPrivateFieldGet(this, _BgmController_instances, "m", _BgmController_ensurePlayback).call(this);
        }
    }
    getStatusMessage(context) {
        const label = PRESETS[__classPrivateFieldGet(this, _BgmController_role, "f")].label;
        const suffix = label ? ` (${label})` : '';
        if (!__classPrivateFieldGet(this, _BgmController_preference, "f")) {
            return `BGMはオフになっています。${suffix}`.trim();
        }
        if (__classPrivateFieldGet(this, _BgmController_audio, "f").paused && !__classPrivateFieldGet(this, _BgmController_unlocked, "f")) {
            return `操作後にBGMを有効化できます。${suffix}`.trim();
        }
        if (context.hidden || context.paused) {
            return `BGM再生中 (静音モード)${suffix}`;
        }
        return `BGM再生中${suffix}`;
    }
    async unlockViaGesture() {
        if (!__classPrivateFieldGet(this, _BgmController_preference, "f")) {
            return;
        }
        await __classPrivateFieldGet(this, _BgmController_instances, "m", _BgmController_ensurePlayback).call(this);
    }
}
_BgmController_audio = new WeakMap(), _BgmController_preference = new WeakMap(), _BgmController_role = new WeakMap(), _BgmController_unlocked = new WeakMap(), _BgmController_instances = new WeakSet(), _BgmController_applyPreset = function _BgmController_applyPreset(role, options = {}) {
    const preset = PRESETS[role];
    if (!preset) {
        return;
    }
    const autoplay = options.autoplay ?? true;
    if (__classPrivateFieldGet(this, _BgmController_audio, "f").getAttribute('src') !== preset.src) {
        __classPrivateFieldGet(this, _BgmController_audio, "f").pause();
        __classPrivateFieldGet(this, _BgmController_audio, "f").currentTime = 0;
        __classPrivateFieldGet(this, _BgmController_audio, "f").src = preset.src;
        __classPrivateFieldGet(this, _BgmController_audio, "f").load();
    }
    if (autoplay && __classPrivateFieldGet(this, _BgmController_preference, "f")) {
        void __classPrivateFieldGet(this, _BgmController_instances, "m", _BgmController_ensurePlayback).call(this);
    }
}, _BgmController_ensurePlayback = async function _BgmController_ensurePlayback() {
    if (!__classPrivateFieldGet(this, _BgmController_preference, "f")) {
        return;
    }
    try {
        await __classPrivateFieldGet(this, _BgmController_audio, "f").play();
        __classPrivateFieldSet(this, _BgmController_unlocked, true, "f");
    }
    catch {
        __classPrivateFieldSet(this, _BgmController_unlocked, false, "f");
    }
};
