# igopon

第二世代の「いごぽん」クライアント。TypeScript + Vite を土台に、盤面ロジック、UI、BGM、リーダーボード通信をモジュール単位で再設計しています。

## 特徴

- `src/game` で盤面・ピース・ルールを型安全に管理
- `src/ui` でキャンバス描画と操作系を分離
- Apps Script ベースの既存 API (`docs/gas.js`) との互換レイヤーを `src/api/leaderboard.ts` に実装
- BGM/効果音のロール管理を `src/audio` で再設計し、状態遷移と同期

## セットアップ

1. 依存関係のインストール

```bash
npm install
```

2. 開発サーバー

```bash
npm run dev
```

3. 本番ビルド

```bash
npm run build
```

4. プレビュー

```bash
npm run preview
```

## ディレクトリ構成

```
├── public/
│   └── audio/        # BGM ソース
├── src/
│   ├── api/          # リーダーボード等の通信ラッパー
│   ├── audio/        # BGM マネージャー
│   ├── game/         # 盤面・ピース・ロジック
│   ├── ui/           # DOM / Canvas レイヤー
│   ├── styles/       # グローバルスタイル
│   └── main.ts       # エントリーポイント
├── index.html        # ルートテンプレート
├── package.json
└── vite.config.ts
```

## 今後のタスク例

- 既存 `docs/script.js` からのロジック移植の完了とテスト
- UI アクセシビリティ (ARIA / キーボード支援) の細部調整
- サウンドアセットの追加とロール切替アニメーション

```
