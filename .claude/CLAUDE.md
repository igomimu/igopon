# igopon（いごぽん）— 囲碁パズルゲーム

## 基本情報
- **技術**: Vite/TypeScript/Canvas/PWA
- **GitHub**: igomimu/igopon
- **バンドル**: 80KB gzip
- **状態**: 完成、itch.io出店準備中

## 機能
- 囲碁パズルゲーム（Canvas描画）
- i18n完了（日英中）
- PWA対応

## 実装済み（2026-02-20）

### Phase 1: itch.io 公開準備
- `vite.config.ts`: PWA manifest英語化（name: igopon、description英語、lang/categories追加）
- `index.html`: OGP英語化・og:locale追加・Twitter Card強化・iOS PWAメタタグ追加

### Phase 2: 言語切替UI
- `src/i18n/index.ts`: localStorage永続化（優先順位: URLパラメータ → localStorage → ブラウザ言語）
- `src/ui/components/app-shell.ts`: メニュー内に日本語/Englishボタン追加
- `src/ui/app-controller.ts`: 言語切替ハンドラ（ゲーム非実行中のみ有効、reload方式）
- `src/styles/main.css`: lang-switcherスタイル追加

## 次のステップ
- ゲーム名検討 → itch.io公開（手動）→ CrazyGames → Poki
- itch.io: 埋め込みURL `?lang=en` で動作確認
- ゲームプレイGIF・スクリーンショット3枚作成
