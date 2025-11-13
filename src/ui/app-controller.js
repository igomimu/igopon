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
var _AppController_instances, _AppController_shell, _AppController_session, _AppController_bgm, _AppController_highScore, _AppController_statusTimer, _AppController_wireEvents, _AppController_handleKeydown, _AppController_handleVisibilityChange, _AppController_startGame, _AppController_pauseGame, _AppController_resumeGame, _AppController_applyDemoAction, _AppController_maybeTriggerDemoClear, _AppController_finishGame, _AppController_describeAction, _AppController_renderStats, _AppController_renderOverlay, _AppController_updatePrimaryAction, _AppController_updateBgmUI, _AppController_initializeLeaderboards, _AppController_renderLeaderboardPlaceholders, _AppController_formatDate, _AppController_setStatus;
import { BgmController } from '../audio/bgm';
import { SessionState, loadHighScore, saveHighScore } from '../game/state/session';
import { mountAppShell } from './components/app-shell';
const DAILY_PLACEHOLDER_COUNT = 5;
const WEEKLY_PLACEHOLDER_COUNT = 1;
const MONTHLY_PLACEHOLDER_COUNT = 1;
export class AppController {
    constructor(root) {
        _AppController_instances.add(this);
        _AppController_shell.set(this, void 0);
        _AppController_session.set(this, new SessionState());
        _AppController_bgm.set(this, void 0);
        _AppController_highScore.set(this, loadHighScore());
        _AppController_statusTimer.set(this, null);
        _AppController_handleKeydown.set(this, (event) => {
            if (event.code === 'KeyP') {
                event.preventDefault();
                const { active, paused } = __classPrivateFieldGet(this, _AppController_session, "f").snapshot;
                if (!active) {
                    return;
                }
                if (paused) {
                    __classPrivateFieldGet(this, _AppController_instances, "m", _AppController_resumeGame).call(this);
                }
                else {
                    __classPrivateFieldGet(this, _AppController_instances, "m", _AppController_pauseGame).call(this);
                }
                return;
            }
            if (!__classPrivateFieldGet(this, _AppController_session, "f").snapshot.active) {
                return;
            }
            switch (event.code) {
                case 'ArrowLeft':
                    event.preventDefault();
                    __classPrivateFieldGet(this, _AppController_instances, "m", _AppController_applyDemoAction).call(this, 'left');
                    break;
                case 'ArrowRight':
                    event.preventDefault();
                    __classPrivateFieldGet(this, _AppController_instances, "m", _AppController_applyDemoAction).call(this, 'right');
                    break;
                case 'ArrowUp':
                    event.preventDefault();
                    __classPrivateFieldGet(this, _AppController_instances, "m", _AppController_applyDemoAction).call(this, 'rotate');
                    break;
                case 'ArrowDown':
                    event.preventDefault();
                    __classPrivateFieldGet(this, _AppController_instances, "m", _AppController_applyDemoAction).call(this, 'softDrop');
                    break;
                case 'Space':
                    event.preventDefault();
                    __classPrivateFieldGet(this, _AppController_instances, "m", _AppController_applyDemoAction).call(this, 'hardDrop');
                    break;
                default:
                    break;
            }
        });
        _AppController_handleVisibilityChange.set(this, () => {
            if (document.hidden && __classPrivateFieldGet(this, _AppController_session, "f").snapshot.active && !__classPrivateFieldGet(this, _AppController_session, "f").snapshot.paused) {
                __classPrivateFieldGet(this, _AppController_instances, "m", _AppController_pauseGame).call(this, 'タブが非表示になったため一時停止しました。');
            }
            __classPrivateFieldGet(this, _AppController_bgm, "f").setPaused(__classPrivateFieldGet(this, _AppController_session, "f").snapshot.paused || document.hidden);
            __classPrivateFieldGet(this, _AppController_instances, "m", _AppController_updateBgmUI).call(this);
        });
        __classPrivateFieldSet(this, _AppController_shell, mountAppShell(root), "f");
        __classPrivateFieldSet(this, _AppController_bgm, new BgmController(__classPrivateFieldGet(this, _AppController_shell, "f").bgmAudio), "f");
        __classPrivateFieldGet(this, _AppController_session, "f").subscribe(state => {
            __classPrivateFieldGet(this, _AppController_instances, "m", _AppController_renderStats).call(this, state);
            __classPrivateFieldGet(this, _AppController_instances, "m", _AppController_renderOverlay).call(this, state);
            __classPrivateFieldGet(this, _AppController_instances, "m", _AppController_updatePrimaryAction).call(this, state);
            __classPrivateFieldGet(this, _AppController_instances, "m", _AppController_updateBgmUI).call(this);
        });
        __classPrivateFieldGet(this, _AppController_instances, "m", _AppController_wireEvents).call(this);
        __classPrivateFieldGet(this, _AppController_instances, "m", _AppController_initializeLeaderboards).call(this);
        __classPrivateFieldGet(this, _AppController_instances, "m", _AppController_updateBgmUI).call(this);
        __classPrivateFieldGet(this, _AppController_instances, "m", _AppController_setStatus).call(this, '囲碁ポン2 へようこそ。GO! で対局開始。');
    }
}
_AppController_shell = new WeakMap(), _AppController_session = new WeakMap(), _AppController_bgm = new WeakMap(), _AppController_highScore = new WeakMap(), _AppController_statusTimer = new WeakMap(), _AppController_handleKeydown = new WeakMap(), _AppController_handleVisibilityChange = new WeakMap(), _AppController_instances = new WeakSet(), _AppController_wireEvents = function _AppController_wireEvents() {
    const handlePrimaryAction = () => {
        const { active, paused } = __classPrivateFieldGet(this, _AppController_session, "f").snapshot;
        if (!active) {
            __classPrivateFieldGet(this, _AppController_instances, "m", _AppController_startGame).call(this);
        }
        else if (paused) {
            __classPrivateFieldGet(this, _AppController_instances, "m", _AppController_resumeGame).call(this);
        }
        else {
            __classPrivateFieldGet(this, _AppController_instances, "m", _AppController_pauseGame).call(this);
        }
    };
    __classPrivateFieldGet(this, _AppController_shell, "f").headerStartBtn.addEventListener('click', handlePrimaryAction);
    __classPrivateFieldGet(this, _AppController_shell, "f").startBtn.addEventListener('click', handlePrimaryAction);
    __classPrivateFieldGet(this, _AppController_shell, "f").overlay.restartBtn.addEventListener('click', () => __classPrivateFieldGet(this, _AppController_instances, "m", _AppController_startGame).call(this));
    __classPrivateFieldGet(this, _AppController_shell, "f").bgmToggleBtn.addEventListener('click', () => {
        const enabled = __classPrivateFieldGet(this, _AppController_bgm, "f").togglePreference();
        if (enabled) {
            void __classPrivateFieldGet(this, _AppController_bgm, "f").unlockViaGesture();
        }
        __classPrivateFieldGet(this, _AppController_instances, "m", _AppController_updateBgmUI).call(this);
    });
    const mobileActions = [
        [__classPrivateFieldGet(this, _AppController_shell, "f").mobileControls.left, () => __classPrivateFieldGet(this, _AppController_instances, "m", _AppController_applyDemoAction).call(this, 'left')],
        [__classPrivateFieldGet(this, _AppController_shell, "f").mobileControls.right, () => __classPrivateFieldGet(this, _AppController_instances, "m", _AppController_applyDemoAction).call(this, 'right')],
        [__classPrivateFieldGet(this, _AppController_shell, "f").mobileControls.rotate, () => __classPrivateFieldGet(this, _AppController_instances, "m", _AppController_applyDemoAction).call(this, 'rotate')],
        [__classPrivateFieldGet(this, _AppController_shell, "f").mobileControls.hardDrop, () => __classPrivateFieldGet(this, _AppController_instances, "m", _AppController_applyDemoAction).call(this, 'hardDrop')]
    ];
    mobileActions.forEach(([element, handler]) => element.addEventListener('click', handler));
    __classPrivateFieldGet(this, _AppController_shell, "f").playerNameInput.addEventListener('change', () => {
        const name = __classPrivateFieldGet(this, _AppController_shell, "f").playerNameInput.value.trim();
        __classPrivateFieldGet(this, _AppController_instances, "m", _AppController_setStatus).call(this, `${name || 'プレイヤー'} さん、準備OKです。`, 2000);
    });
    document.addEventListener('keydown', __classPrivateFieldGet(this, _AppController_handleKeydown, "f"));
    document.addEventListener('visibilitychange', __classPrivateFieldGet(this, _AppController_handleVisibilityChange, "f"));
}, _AppController_startGame = function _AppController_startGame() {
    __classPrivateFieldGet(this, _AppController_session, "f").startNewGame();
    __classPrivateFieldGet(this, _AppController_bgm, "f").setRole('game');
    __classPrivateFieldGet(this, _AppController_bgm, "f").setPaused(false);
    void __classPrivateFieldGet(this, _AppController_bgm, "f").unlockViaGesture();
    __classPrivateFieldGet(this, _AppController_instances, "m", _AppController_setStatus).call(this, '新しい対局開始。囲んで捕獲しよう。');
}, _AppController_pauseGame = function _AppController_pauseGame(reason = '一時停止中。GO! で再開。') {
    if (!__classPrivateFieldGet(this, _AppController_session, "f").snapshot.active || __classPrivateFieldGet(this, _AppController_session, "f").snapshot.paused) {
        return;
    }
    __classPrivateFieldGet(this, _AppController_session, "f").togglePause();
    __classPrivateFieldGet(this, _AppController_bgm, "f").setPaused(true);
    __classPrivateFieldGet(this, _AppController_instances, "m", _AppController_setStatus).call(this, reason);
}, _AppController_resumeGame = function _AppController_resumeGame() {
    if (!__classPrivateFieldGet(this, _AppController_session, "f").snapshot.active || !__classPrivateFieldGet(this, _AppController_session, "f").snapshot.paused) {
        return;
    }
    __classPrivateFieldGet(this, _AppController_session, "f").togglePause();
    __classPrivateFieldGet(this, _AppController_bgm, "f").setPaused(false);
    __classPrivateFieldGet(this, _AppController_instances, "m", _AppController_setStatus).call(this, '再開します。');
}, _AppController_applyDemoAction = function _AppController_applyDemoAction(action) {
    if (!__classPrivateFieldGet(this, _AppController_session, "f").snapshot.active || __classPrivateFieldGet(this, _AppController_session, "f").snapshot.paused) {
        return;
    }
    const scoreBoost = action === 'hardDrop' ? 320 : action === 'softDrop' ? 60 : 40;
    __classPrivateFieldGet(this, _AppController_session, "f").adjustScore(scoreBoost);
    if (action === 'hardDrop' || action === 'softDrop') {
        __classPrivateFieldGet(this, _AppController_session, "f").recordCapture('black', 1);
    }
    __classPrivateFieldGet(this, _AppController_instances, "m", _AppController_maybeTriggerDemoClear).call(this);
    const actionLabel = __classPrivateFieldGet(this, _AppController_instances, "m", _AppController_describeAction).call(this, action);
    __classPrivateFieldGet(this, _AppController_instances, "m", _AppController_setStatus).call(this, `${actionLabel}（デモ）`, 1500);
}, _AppController_maybeTriggerDemoClear = function _AppController_maybeTriggerDemoClear() {
    const { piecesPlaced, score } = __classPrivateFieldGet(this, _AppController_session, "f").snapshot;
    if (piecesPlaced >= 10 || score >= 4000) {
        __classPrivateFieldGet(this, _AppController_instances, "m", _AppController_finishGame).call(this, 'デモ盤面が埋まりました');
    }
}, _AppController_finishGame = function _AppController_finishGame(reason) {
    __classPrivateFieldGet(this, _AppController_session, "f").endGame(reason);
    const { score } = __classPrivateFieldGet(this, _AppController_session, "f").snapshot;
    if (score > __classPrivateFieldGet(this, _AppController_highScore, "f")) {
        __classPrivateFieldSet(this, _AppController_highScore, score, "f");
        saveHighScore(score);
    }
    __classPrivateFieldGet(this, _AppController_bgm, "f").setRole('lobby');
    __classPrivateFieldGet(this, _AppController_bgm, "f").setPaused(false);
    __classPrivateFieldGet(this, _AppController_instances, "m", _AppController_updateBgmUI).call(this);
    __classPrivateFieldGet(this, _AppController_instances, "m", _AppController_setStatus).call(this, reason, 3000);
}, _AppController_describeAction = function _AppController_describeAction(action) {
    switch (action) {
        case 'left':
            return '左に移動';
        case 'right':
            return '右に移動';
        case 'rotate':
            return '回転';
        case 'hardDrop':
            return 'ハードドロップ';
        case 'softDrop':
            return 'ソフトドロップ';
        default:
            return '操作';
    }
}, _AppController_renderStats = function _AppController_renderStats(state) {
    const format = (value) => value.toLocaleString('ja-JP');
    __classPrivateFieldGet(this, _AppController_shell, "f").stats.score.textContent = format(state.score);
    __classPrivateFieldGet(this, _AppController_shell, "f").stats.headerScoreValue.textContent = format(state.score);
    __classPrivateFieldGet(this, _AppController_shell, "f").stats.level.textContent = String(state.level);
    __classPrivateFieldGet(this, _AppController_shell, "f").stats.chain.textContent = String(state.chain);
    __classPrivateFieldGet(this, _AppController_shell, "f").stats.blackCaptures.textContent = format(state.captures.black);
    __classPrivateFieldGet(this, _AppController_shell, "f").stats.whiteCaptures.textContent = format(state.captures.white);
    __classPrivateFieldGet(this, _AppController_shell, "f").stats.pieces.textContent = format(state.piecesPlaced);
    __classPrivateFieldGet(this, _AppController_shell, "f").stats.headerScore.classList.toggle('inactive', !state.active);
}, _AppController_renderOverlay = function _AppController_renderOverlay(state) {
    if (state.active) {
        __classPrivateFieldGet(this, _AppController_shell, "f").overlay.root.classList.add('hidden');
        return;
    }
    __classPrivateFieldGet(this, _AppController_shell, "f").overlay.root.classList.remove('hidden');
    const summary = state.lastResult;
    const finalScore = summary?.finalScore ?? 0;
    __classPrivateFieldGet(this, _AppController_shell, "f").overlay.title.textContent = summary?.reason ?? 'スタンバイ中';
    __classPrivateFieldGet(this, _AppController_shell, "f").overlay.detail.textContent = summary
        ? new Date(summary.timestamp).toLocaleString('ja-JP')
        : 'GO! を押してゲームを開始してください。';
    __classPrivateFieldGet(this, _AppController_shell, "f").overlay.finalScore.textContent = finalScore.toLocaleString('ja-JP');
    __classPrivateFieldGet(this, _AppController_shell, "f").overlay.bestScore.textContent = __classPrivateFieldGet(this, _AppController_highScore, "f").toLocaleString('ja-JP');
}, _AppController_updatePrimaryAction = function _AppController_updatePrimaryAction(state) {
    const label = !state.active ? 'GO!' : state.paused ? '再開' : '一時停止';
    __classPrivateFieldGet(this, _AppController_shell, "f").headerStartBtn.textContent = label;
    __classPrivateFieldGet(this, _AppController_shell, "f").startBtn.textContent = state.active ? 'リスタート' : 'スタート';
}, _AppController_updateBgmUI = function _AppController_updateBgmUI() {
    const enabled = __classPrivateFieldGet(this, _AppController_bgm, "f").preference;
    __classPrivateFieldGet(this, _AppController_shell, "f").bgmToggleBtn.setAttribute('aria-pressed', enabled ? 'true' : 'false');
    __classPrivateFieldGet(this, _AppController_shell, "f").bgmToggleBtn.textContent = enabled ? 'BGM オン' : 'BGM オフ';
    const status = __classPrivateFieldGet(this, _AppController_bgm, "f").getStatusMessage({
        paused: __classPrivateFieldGet(this, _AppController_session, "f").snapshot.paused,
        hidden: document.hidden
    });
    __classPrivateFieldGet(this, _AppController_shell, "f").bgmStatus.textContent = status;
}, _AppController_initializeLeaderboards = function _AppController_initializeLeaderboards() {
    __classPrivateFieldGet(this, _AppController_shell, "f").leaderboard.dateLabel.textContent = __classPrivateFieldGet(this, _AppController_instances, "m", _AppController_formatDate).call(this, new Date());
    __classPrivateFieldGet(this, _AppController_instances, "m", _AppController_renderLeaderboardPlaceholders).call(this, __classPrivateFieldGet(this, _AppController_shell, "f").leaderboard.dailyList, DAILY_PLACEHOLDER_COUNT, __classPrivateFieldGet(this, _AppController_shell, "f").leaderboard.dailyEmpty);
    __classPrivateFieldGet(this, _AppController_instances, "m", _AppController_renderLeaderboardPlaceholders).call(this, __classPrivateFieldGet(this, _AppController_shell, "f").leaderboard.weeklyList, WEEKLY_PLACEHOLDER_COUNT, __classPrivateFieldGet(this, _AppController_shell, "f").leaderboard.weeklyEmpty);
    __classPrivateFieldGet(this, _AppController_instances, "m", _AppController_renderLeaderboardPlaceholders).call(this, __classPrivateFieldGet(this, _AppController_shell, "f").leaderboard.monthlyList, MONTHLY_PLACEHOLDER_COUNT, __classPrivateFieldGet(this, _AppController_shell, "f").leaderboard.monthlyEmpty);
}, _AppController_renderLeaderboardPlaceholders = function _AppController_renderLeaderboardPlaceholders(target, count, empty) {
    target.innerHTML = '';
    empty?.classList.add('hidden');
    for (let index = 0; index < count; index += 1) {
        const item = document.createElement('li');
        item.classList.add('placeholder');
        const rank = document.createElement('span');
        rank.className = 'rank';
        rank.textContent = String(index + 1);
        const name = document.createElement('span');
        name.className = 'name';
        name.textContent = '—';
        const score = document.createElement('span');
        score.className = 'score';
        score.textContent = '—';
        item.append(rank, name, score);
        target.appendChild(item);
    }
}, _AppController_formatDate = function _AppController_formatDate(date) {
    const year = date.getFullYear();
    const month = date.getMonth() + 1;
    const day = date.getDate();
    return `${year}年${month}月${day}日`;
}, _AppController_setStatus = function _AppController_setStatus(message, duration = 3500) {
    __classPrivateFieldGet(this, _AppController_shell, "f").statusMessage.textContent = message;
    if (__classPrivateFieldGet(this, _AppController_statusTimer, "f") !== null) {
        window.clearTimeout(__classPrivateFieldGet(this, _AppController_statusTimer, "f"));
    }
    if (duration > 0) {
        __classPrivateFieldSet(this, _AppController_statusTimer, window.setTimeout(() => {
            __classPrivateFieldGet(this, _AppController_shell, "f").statusMessage.textContent = '';
            __classPrivateFieldSet(this, _AppController_statusTimer, null, "f");
        }, duration), "f");
    }
};
