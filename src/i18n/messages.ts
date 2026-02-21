export type MessageKey = keyof typeof ja;

const ja = {
  // App title & meta
  'app.title': 'いごぽん',
  'app.description': 'いごぽん - 次世代の囲碁落ち物パズル',
  'app.ogDescription': '囲碁のルールと落ち物パズルが融合！石を囲んで捕獲する新感覚ゲーム。',

  // Header
  'header.scoreLabel': '現在のスコア',
  'header.menuLabel': '一時停止 / メニュー',
  'header.installLabel': 'アプリをインストール',
  'header.installText': 'インストール',

  // Stats
  'stats.chain': 'チェイン:',
  'stats.blackCaptures': '黒の捕獲数:',
  'stats.whiteCaptures': '白の捕獲数:',
  'stats.piecesPlaced': '配置したピース:',

  // Next piece
  'next.title': '次のグループ',
  'next.previewLabel': '次のピースプレビュー',
  'next.previewMobileLabel': '次のピースプレビュー（モバイル）',

  // Board
  'board.label': 'プレイフィールド',

  // Buttons
  'button.start': 'スタート',
  'button.restart': 'リスタート',
  'button.feedback': 'フィードバック',
  'button.go': 'GO!',
  'button.close': '閉じる',
  'button.next': '次へ',
  'button.skip': 'スキップ',
  'button.begin': '始める',
  'button.send': '送信',
  'button.sendAsIs': 'そのまま送る',
  'button.addComment': 'ひと言コメント',

  // Overlay
  'overlay.standby': 'スタンバイ中',
  'overlay.thisScore': '今回のハイスコア',
  'overlay.bestScore': '自己最高スコア',
  'overlay.instruction': 'GO! を押してゲームを開始してください。',

  // Tutorial
  'tutorial.title': '遊び方',
  'tutorial.label': 'チュートリアル',
  'tutorial.step1': '左右キーで移動',
  'tutorial.step2': '上キーで回転',
  'tutorial.step3': '囲んで捕獲！',

  // Feedback
  'feedback.title': 'フィードバック',
  'feedback.difficultyQuestion': '難易度はどうでしたか？',
  'feedback.easy': '簡単',
  'feedback.normal': '普通',
  'feedback.hard': '難しい',
  'feedback.funQuestion': '面白かったですか？',
  'feedback.notFun': 'いまいち',
  'feedback.awesome': '最高!',
  'feedback.placeholder': 'ご意見・ご感想をお聞かせください...',

  // Mobile controls
  'mobile.left': '左移動',
  'mobile.right': '右移動',
  'mobile.rotate': '回転',
  'mobile.hardDrop': 'ハードドロップ',

  // Menu
  'menu.title': 'メニュー',
  'menu.label': 'ゲームメニュー',
  'menu.resume': 'ゲームに戻る',
  'menu.restart': '最初からやり直す',
  'menu.bgmOn': 'BGM オン',
  'menu.bgmOff': 'BGM オフ',

  // Player
  'player.placeholder': 'プレイヤー名',
  'player.default': 'プレイヤー',
  'player.anonymous': '名無し',

  // Help
  'help.title': '遊び方',
  'help.description': '石を落として連結させ、囲んだ石を捕獲すると得点が入ります。',
  'help.moveLeftRight': '左右に移動',
  'help.rotate': '回転',
  'help.hardDrop': 'ハードドロップ',
  'help.pauseResume': '一時停止 / 再開',
  'help.levelUp': '時間が経つとレベルが上がり、落下速度が速くなります。',
  'help.policy': '規約・ポリシー',

  // Leaderboard
  'leaderboard.title': 'ランキング',
  'leaderboard.daily': '本日のベストスコア',
  'leaderboard.weekly': '今週のベストスコア',
  'leaderboard.monthly': '今月のベストスコア',
  'leaderboard.empty': 'まだスコアがありません。',

  // Privacy Policy
  'privacy.title': 'プライバシーポリシー',
  'privacy.section1Title': '1. 利用情報の収集について',
  'privacy.section1Body': '当サイトでは、サービスの改善を目的として、Google Analyticsを使用しています。これに伴い、Cookieを使用して、サイトの閲覧履歴などの情報を収集する場合がありますが、個人を特定する情報は含まれません。',
  'privacy.section2Title': '2. データの利用目的',
  'privacy.section2Body': '収集した情報は、当ゲームの機能改善、ユーザー体験の向上、およびアクセス解析のために利用します。',
  'privacy.section3Title': '3. お問い合わせ',
  'privacy.section3Body': '不具合の報告やご意見は、公式X(旧Twitter)までご連絡ください。',

  // Credits
  'credits.title': 'クレジット',
  'credits.body': 'BGM・効果音: オリジナル制作\nアイコン: AI生成（Gemini）\n開発: 三村智保 (@igomimu)',

  // Status messages (app-controller)
  'status.welcome': 'いごぽん へようこそ。GO! で対局開始。',
  'status.playerReady': '{name} さん、準備OKです。',
  'status.appInstalled': 'アプリがインストールされました！ホーム画面をご確認ください。',
  'status.scoreSubmitted': 'スコアを送信しました。',
  'status.scoreSubmitFailed': 'スコア送信に失敗しました。',
  'status.selectRating': '評価を選択してください。',
  'status.feedbackThanks': 'フィードバックありがとうございます！',
  'status.submitFailed': '送信に失敗しました。',
  'status.tutorialComplete': 'チュートリアル完了！ GO! でゲーム開始。',
  'status.tabHidden': 'タブが非表示になったため一時停止しました。',
  'status.menuOpen': 'メニューを開いています',

  // Game engine messages
  'engine.newGame': '新しい対局開始。囲んで捕獲しよう。',
  'engine.paused': '一時停止中。PキーかGOボタンで再開。',
  'engine.resumed': '再開します。',
  'engine.gameOver': 'ゲーム終了。',
  'engine.gameEndMoves': '{count} 手で終局となりました',
  'engine.captured': '{count} 個捕獲。チェインx{chain}！',
  'engine.noCapture': '石を配置。捕獲なし。',
  'engine.eyeFramePlaced': '色付き眼フレームを設置しました。',
  'engine.eyeFrameCollapsed': '眼フレームが崩壊しました。',
  'engine.levelUp': 'レベル{level} (経過 {minutes}分) ',

  // Overlay details
  'overlay.chain': 'チェイン',
  'overlay.captureB': '捕獲 B:',
  'overlay.captureW': 'W:',

  // BGM
  'bgm.lobby': 'ロビーBGM',
  'bgm.game': 'ゲームBGM',
  'bgm.danger': 'ゲームBGM（危険）',
  'bgm.off': 'BGMはオフになっています。',
  'bgm.pendingUnlock': '操作後にBGMを有効化できます。',
  'bgm.playingMute': 'BGM再生中 (静音モード)',
  'bgm.playing': 'BGM再生中',

  // Date format
  'date.format': '{year}年{month}月{day}日',
} as const;

const en: Record<keyof typeof ja, string> = {
  // App title & meta
  'app.title': '囲Trap',
  'app.description': '囲Trap - Next-Gen Go Puzzle',
  'app.ogDescription': 'Go meets falling blocks! Surround and capture stones in this unique puzzle game.',

  // Header
  'header.scoreLabel': 'Current Score',
  'header.menuLabel': 'Pause / Menu',
  'header.installLabel': 'Install App',
  'header.installText': 'Install',

  // Stats
  'stats.chain': 'Chain:',
  'stats.blackCaptures': 'Black Captures:',
  'stats.whiteCaptures': 'White Captures:',
  'stats.piecesPlaced': 'Pieces Placed:',

  // Next piece
  'next.title': 'Next Group',
  'next.previewLabel': 'Next Piece Preview',
  'next.previewMobileLabel': 'Next Piece Preview (Mobile)',

  // Board
  'board.label': 'Play Field',

  // Buttons
  'button.start': 'START',
  'button.restart': 'RESTART',
  'button.feedback': 'Feedback',
  'button.go': 'GO!',
  'button.close': 'Close',
  'button.next': 'Next',
  'button.skip': 'Skip',
  'button.begin': 'Begin',
  'button.send': 'Send',
  'button.sendAsIs': 'Quick Send',
  'button.addComment': 'Add Comment',

  // Overlay
  'overlay.standby': 'Standby',
  'overlay.thisScore': 'This Score',
  'overlay.bestScore': 'Personal Best',
  'overlay.instruction': 'Press GO! to start the game.',

  // Tutorial
  'tutorial.title': 'How to Play',
  'tutorial.label': 'Tutorial',
  'tutorial.step1': 'Move with Left/Right Keys',
  'tutorial.step2': 'Rotate with Up Key',
  'tutorial.step3': 'Surround to Capture!',

  // Feedback
  'feedback.title': 'Feedback',
  'feedback.difficultyQuestion': 'How was the difficulty?',
  'feedback.easy': 'Easy',
  'feedback.normal': 'Normal',
  'feedback.hard': 'Hard',
  'feedback.funQuestion': 'Was it fun?',
  'feedback.notFun': 'Meh',
  'feedback.awesome': 'Awesome!',
  'feedback.placeholder': 'Share your thoughts and feedback...',

  // Mobile controls
  'mobile.left': 'Move Left',
  'mobile.right': 'Move Right',
  'mobile.rotate': 'Rotate',
  'mobile.hardDrop': 'Hard Drop',

  // Menu
  'menu.title': 'Menu',
  'menu.label': 'Game Menu',
  'menu.resume': 'Resume Game',
  'menu.restart': 'Start Over',
  'menu.bgmOn': 'BGM On',
  'menu.bgmOff': 'BGM Off',

  // Player
  'player.placeholder': 'Player Name',
  'player.default': 'Player',
  'player.anonymous': 'Anonymous',

  // Help
  'help.title': 'How to Play',
  'help.description': 'Drop stones to connect them and earn points by capturing surrounded stones.',
  'help.moveLeftRight': 'Move left/right',
  'help.rotate': 'Rotate',
  'help.hardDrop': 'Hard drop',
  'help.pauseResume': 'Pause / Resume',
  'help.levelUp': 'As time passes, the level increases and the drop speed gets faster.',
  'help.policy': 'Terms & Policy',

  // Leaderboard
  'leaderboard.title': 'Leaderboard',
  'leaderboard.daily': "Today's Best",
  'leaderboard.weekly': "This Week's Best",
  'leaderboard.monthly': "This Month's Best",
  'leaderboard.empty': 'No scores yet.',

  // Privacy Policy
  'privacy.title': 'Privacy Policy',
  'privacy.section1Title': '1. Information Collection',
  'privacy.section1Body': 'We use Google Analytics to improve our service. Cookies may be used to collect browsing data, but no personally identifiable information is gathered.',
  'privacy.section2Title': '2. Purpose of Data Use',
  'privacy.section2Body': 'Collected data is used for improving game features, enhancing user experience, and access analytics.',
  'privacy.section3Title': '3. Contact',
  'privacy.section3Body': 'For bug reports or feedback, please contact us on X (formerly Twitter).',

  // Credits
  'credits.title': 'Credits',
  'credits.body': 'BGM & Sound Effects: Original compositions\nIcon: AI-generated (Gemini)\nDeveloped by: Tomoyasu Mimura (@igomimu)',

  // Status messages (app-controller)
  'status.welcome': 'Welcome to igopon. Press GO! to start.',
  'status.playerReady': '{name}, you\'re ready!',
  'status.appInstalled': 'App installed! Check your home screen.',
  'status.scoreSubmitted': 'Score submitted.',
  'status.scoreSubmitFailed': 'Failed to submit score.',
  'status.selectRating': 'Please select a rating.',
  'status.feedbackThanks': 'Thank you for your feedback!',
  'status.submitFailed': 'Submission failed.',
  'status.tutorialComplete': 'Tutorial complete! Press GO! to start.',
  'status.tabHidden': 'Paused because tab is hidden.',
  'status.menuOpen': 'Menu is open',

  // Game engine messages
  'engine.newGame': 'New game! Surround and capture.',
  'engine.paused': 'Paused. Press P or GO to resume.',
  'engine.resumed': 'Resuming.',
  'engine.gameOver': 'Game Over.',
  'engine.gameEndMoves': 'Game ended after {count} moves',
  'engine.captured': '{count} captured. Chain x{chain}!',
  'engine.noCapture': 'Stone placed. No captures.',
  'engine.eyeFramePlaced': 'Colored eye frame placed.',
  'engine.eyeFrameCollapsed': 'Eye frame collapsed.',
  'engine.levelUp': 'Level {level} ({minutes} min elapsed) ',

  // Overlay details
  'overlay.chain': 'Chain',
  'overlay.captureB': 'Captures B:',
  'overlay.captureW': 'W:',

  // BGM
  'bgm.lobby': 'Lobby BGM',
  'bgm.game': 'Game BGM',
  'bgm.danger': 'Game BGM (Danger)',
  'bgm.off': 'BGM is off.',
  'bgm.pendingUnlock': 'BGM will activate after interaction.',
  'bgm.playingMute': 'BGM playing (muted)',
  'bgm.playing': 'BGM playing',

  // Date format
  'date.format': '{month}/{day}/{year}',
};

export const messages = { ja, en } as const;
