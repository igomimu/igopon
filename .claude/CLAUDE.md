# 囲Trap（いごぽん）— 囲碁 × 落ち物パズル

## 基本情報
- **英名**: 囲Trap（読み: i-Trap）
- **和名**: いごぽん
- **技術**: Vite/TypeScript/Canvas/PWA
- **GitHub**: igomimu/igopon
- **公開中**: https://igomimu.github.io/igopon/
- **バンドル**: 81KB JS + 18KB CSS（gzip後）
- **バージョン**: 0.2.17
- **状態**: 完成、itch.io出店準備中

## 機能
- 囲碁ルール × 落ち物パズル（20×10盤面）
- i18n完了（日英2言語、中国語は未実装）
- PWA対応（アイコン・Service Worker完備）
- リーダーボード（Google Apps Script）
- チュートリアル内蔵（3ステップ）
- BGM切替（通常→危険モード）、効果音3+2パターン
- OGP/Twitter Card対応、GA4計測中
- アクセシビリティ（ARIA属性22箇所）

## インフラ
- **デプロイ**: GitHub Actions → GitHub Pages（main push自動）
- **リーダーボードAPI**: Google Apps Script（日/週/月ランキング）
- **計測**: Google Analytics 4（G-ZJ25KF5PR1）

## 実装済み（2026-02-20）

### itch.io 公開準備
- `vite.config.ts`: PWA manifest英語化（name/description/lang/categories）
- `index.html`: OGP英語化・og:locale追加・Twitter Card強化・iOS PWAメタタグ追加

### 言語切替UI
- `src/i18n/index.ts`: localStorage永続化（優先順位: URLパラメータ → localStorage → ブラウザ言語）
- `src/ui/components/app-shell.ts`: メニュー内に日本語/Englishボタン追加
- `src/ui/app-controller.ts`: 言語切替ハンドラ（ゲーム非実行中のみ有効、reload方式）
- `src/styles/main.css`: lang-switcherスタイル追加

---

## 海外出展ロードマップ（2026-02-21策定）

### Phase 0: 出展前の整備（1〜2日）
- [ ] i18n記載を修正（「日英中」→「日英」、中国語は未実装）
- [ ] BGM/効果音のライセンス表記を追加（自作 or 素材サイト名）
- [x] ゲーム名決定: **囲Trap**（i-Trap）
- [x] アイコン決定: `public/icon_candidates/20260221_152722.jpg`
  - コンセプト: 碁盤上で青白く光る曲がり白3子を黒7子が囲んで捕獲する瞬間
  - 生成ツール: Nano Banana Pro（Gemini 3 Pro Image）
  - [x] サイズ展開（512/192/favicon/maskable）
  - [x] PWA manifest・コードへの反映
- [ ] バージョンを 1.0.0 に上げる（初の公式リリース）
- [ ] スクリーンショット追加撮影（PC版、英語UI、複数サイズ）
- [ ] 英語の説明文（短文+長文）を最終化
- [ ] ゲームプレイGIF作成

### Phase 1: itch.io 出店（目標: 数日）
- [ ] itch.io アカウント作成（igomimu）
- [ ] 新規プロジェクト作成（HTML5ゲーム）
- [ ] dist フォルダをZip化してアップロード
- [ ] ページ設定:
  - タイトル・説明文（英語）
  - スクリーンショット（3〜5枚）
  - タグ: puzzle, go, igo, strategy, html5, pwa, browser
  - ジャンル: Puzzle
  - 価格: Free（まずは無料で認知獲得）
- [ ] 埋め込みプレイヤーの動作確認（iframe `?lang=en`）
- [ ] リーダーボードAPIのCORS設定にitch.ioドメイン追加
- [ ] GA4がitch.io iframe内で動作するか確認
- [ ] 公開 → SNS告知（X @igomimu）

### Phase 2: フィードバック収集と改善（1〜2週間）
- [ ] itch.io のアクセス数・プレイ数を監視
- [ ] GA4でプレイ時間・離脱ポイントを分析
- [ ] 英語圏ユーザーからのフィードバック対応
- [ ] 必要に応じてチュートリアル強化（囲碁を知らない人向け）
- [ ] バグ修正・UX改善

### Phase 3: CrazyGames 申請（Phase 2 安定後）
- [ ] CrazyGames Developer ポータルで申請
  - https://developer.crazygames.com/
- [ ] 要件確認:
  - GDPR対応（プライバシーポリシー済、Cookie同意が必要か確認）
  - 広告SDK統合の要否（CrazyGames SDKの検討）
  - レスポンシブ対応の確認（横画面含む）
- [ ] CrazyGames SDK統合（任意だが収益化に必要）
  - ゲーム開始前・ゲームオーバー時のインタースティシャル広告
  - SDK読み込み分岐（CrazyGames環境のみ有効化）
- [ ] 審査提出 → 承認待ち（通常1〜2週間）
- [ ] 公開後の指標監視

### Phase 4: Poki 申請（Phase 3 安定後）
- [ ] Poki Developer ポータルで申請
  - https://developers.poki.com/
- [ ] 要件確認:
  - COPPA対応（子ども向けコンテンツの場合）
  - Poki SDK統合（必須 — 広告・アナリティクス）
  - 本人確認・税務書類の提出
- [ ] Poki SDK統合
  - gameLoadingStart/gameLoadingFinished
  - commercialBreak（広告表示タイミング）
  - gameplayStart/gameplayStop
- [ ] 審査提出 → 承認待ち
- [ ] 公開

### Phase 5: 拡張（長期）
- [ ] 中国語対応（i18n追加）
- [ ] 韓国語対応の検討（囲碁人口が多い）
- [ ] Steam / Google Play Store への展開検討
- [ ] 追加ゲームモード（タイムアタック、対戦等）
- [ ] snap-goban との連携プロモーション

---

## 各プラットフォーム比較

| 項目 | itch.io | CrazyGames | Poki |
|------|---------|------------|------|
| 審査 | なし | あり（1-2週間）| あり（厳しめ）|
| SDK統合 | 不要 | 任意（収益化時必須）| 必須 |
| 収益モデル | 任意寄付/有料 | 広告収益シェア | 広告収益シェア |
| ユーザー層 | インディーゲーマー | カジュアルゲーマー | 子ども〜ティーン |
| 月間訪問数 | 〜80M | 〜35M | 〜80M |
| 難易度 | ★☆☆ | ★★☆ | ★★★ |

---

## 画像生成ツール

- **Nano Banana Pro**（Gemini 3 Pro Image）をClaude Codeスキルとして設定済み
- 場所: `/home/mimura/projects/ccskill-nanobanana`
- igoponへのリンク: `.claude/skills/nano-banana-pro` → シンボリックリンク
- 環境変数: `CCSKILL_NANOBANANA_DIR` を `.bashrc` に設定済み
- 他端末セットアップ: APIキーは Google AI Studio で発行済み（.envに格納）
