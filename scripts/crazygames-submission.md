# CrazyGames 出展ガイド

申請ポータル: https://developer.crazygames.com/

---

## 重要: itch.io/GameJoltとの違い

| 項目 | itch.io / GameJolt | CrazyGames |
|------|-------------------|------------|
| 提出方法 | ZIP アップロード | **ゲームのURL（HTTPS）** |
| 審査 | なし / なし | **あり（1〜2週間）** |
| SDK | 不要 | 任意（広告収益化に必要） |

**→ ZIPビルド不要。GitHub Pages の URL をそのまま使う。**

---

## 提出URL

```
https://igomimu.github.io/igopon/
```

（HTTPS・GitHub Pages・既に公開中 → 追加作業なし）

---

## 1. 申請フォーム入力項目

### ゲーム情報

- **Game title**: `囲Trap (i-Trap)`
- **Game URL**: `https://igomimu.github.io/igopon/`
- **Category**: Puzzle
- **Tags**: `puzzle, strategy, go, board-game, falling-blocks, tetris-like, two-player-games`

### Description（コピペ用）

```
A unique puzzle game that blends the ancient strategy game of Go with falling-block mechanics. Place black and white stones on a 20x10 board to capture groups and clear lines before the board fills up!

HOW TO PLAY:
- Stones fall from the top — move them left/right, rotate, or drop
- Surround opponent stones to capture them (just like in Go!)
- Captured stones disappear and score big points
- Clear full rows for bonus points
- Game over when stones reach the top

FEATURES:
- Easy to learn, hard to master
- No Go knowledge needed — the game teaches you naturally
- Combo system — chain captures for massive scores
- Dynamic BGM that intensifies as danger rises
- Global leaderboard — compete for the top score
- Works on desktop and mobile
- Available in English and Japanese

CONTROLS:
- Arrow keys or swipe to move
- Up arrow or tap to rotate
- Down arrow or swipe down to soft drop
- Space or double-tap for hard drop
```

### 技術情報

- **Viewport**: 420 × 700（縦型）
- **Mobile friendly**: Yes
- **Orientation**: Portrait（縦）

---

## 2. 必要な画像素材

| 素材 | サイズ | 使用ファイル |
|------|--------|------------|
| サムネイル（必須） | **512 × 384 px** | `public/icon_candidates/20260221_152722.jpg` をトリミング |
| スクリーンショット（最低3枚） | 1280×720 以上推奨 | `screenshots/` フォルダの PNG |
| GIF/動画（任意） | — | `screenshots/gameplay.gif` |

### サムネイル作成手順

CrazyGames は **横長 512×384** が標準。現在のアイコン画像（正方形）から作成する。

```bash
# ImageMagick でトリミング＆リサイズ（要インストール）
convert public/icon_candidates/20260221_152722.jpg \
  -resize 512x384^ -gravity center -extent 512x384 \
  scripts/crazygames-thumbnail.png
```

または Nano Banana Pro でゲームプレイシーン（横長）を新規生成。

---

## 3. CrazyGames SDK（任意 — 初回申請は不要）

審査通過後、広告収益化のために統合する。

### SDK 読み込み（index.html）

```html
<!-- CrazyGames SDK（本番のみ有効） -->
<script src="https://sdk.crazygames.com/crazygames-sdk-v3.js"></script>
```

### 主要API

```typescript
// ゲームロード完了
window.CrazyGames?.SDK?.game?.sdkGameLoadingStop();

// ゲームプレイ開始（広告を止める）
window.CrazyGames?.SDK?.game?.gameplayStart();

// ゲームオーバー（広告挿入OK）
window.CrazyGames?.SDK?.game?.gameplayStop();

// インタースティシャル広告（ゲームオーバー時）
window.CrazyGames?.SDK?.ad?.requestAd('midgame', {
  adFinished: () => { /* ゲーム再開 */ },
  adError: () => { /* エラー時もゲーム再開 */ },
});
```

SDK統合は **Phase 3.5** として審査通過後に実装。

---

## 4. 申請手順

1. https://developer.crazygames.com/ でアカウント作成（Google/Email）
2. 「Submit Game」→ 必要事項を入力
3. サムネイル・スクリーンショット・GIFをアップロード
4. URL欄に `https://igomimu.github.io/igopon/` を入力
5. Submit → 審査待ち（1〜2週間）

---

## 5. 申請前チェックリスト

- [ ] サムネイル画像（512×384）作成
- [ ] スクリーンショット（PNG、最低3枚）準備
- [ ] GIF動画（`screenshots/gameplay.gif`）準備
- [ ] ゲームURLが正常に動作するか確認
- [ ] アカウント作成
- [ ] フォーム入力・Submit

---

## 6. 審査基準（参考）

- ゲームが正常にロード・プレイできること
- モバイル対応していること（タッチ操作）
- HTTPS でホストされていること
- 品質基準（グラフィック・UI・ゲームプレイ）
- 広告ブロッカー対応（SDK統合で自動対応）

**NG例**: ゲームが外部APIに依存して動かない、ロード時間が長すぎる、UI が壊れている

リーダーボード（GAS）はCORS許可済みなので問題なし。

---

## 7. 収益モデル

- 広告収益シェア（CPC/CPM）
- SDK統合後、月間プレイ数に応じて収益発生
- 支払い: PayPal/Wire Transfer（月次）
- 最低支払い額: $100
