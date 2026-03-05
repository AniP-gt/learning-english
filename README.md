# Learning English - TUI & Web App

英語学習システム (Gemini API & Bubbletea TUI)

## 概要

Gemini APIを活用した7ステップ英語学習システム。
- **TUI**: Bubbletea (Go) による高速な学習インターフェース
- **Web**: Next.js によるブラウザベースの学習環境
- **共通ロジック**: Golangで実装された根幹ロジックを共有

## 構成

```
.
├── cmd/
│   └── tui/          # TUIアプリケーション
├── pkg/
│   ├── core/         # 共通ロジック (型定義、設定)
│   ├── storage/      # ファイルストレージ
│   └── gemini/       # Gemini API連携
├── internal/
│   └── ui/           # TUI UI実装
├── web/              # Next.jsアプリケーション
├── docs/             # 仕様書・モック
└── docker-compose.yml
```

## セットアップ

### 環境変数

```bash
cp .env.example .env
# .envファイルを編集してGEMINI_API_KEYを設定
```

### ローカル実行

#### TUI

```bash
go run cmd/tui/main.go
```

#### Web

```bash
cd web
npm install
npm run dev
```

### Docker Compose

```bash
docker compose up --build
```

- TUI: `docker compose run tui`
- Web: http://localhost:3000

## 学習ステップ

1. **Idea**: 日本語でネタ出し (Gemini対話)
2. **Words**: 単語帳作成 (Gemini生成)
3. **Reading**: WPM計測
4. **Listening**: 音声読み上げ (say / Web Speech API)
5. **Speech**: スピーチ録音・文字起こし (Gemini STT)
6. **3-2-1**: 画像想起訓練
7. **Roleplay**: Gemini Chat実戦会話

## データ保存

学習データは以下の構造で保存されます:

```
artifacts/english-learning/data/
└── YYYY/
    └── MM/
        └── weekN/
            ├── topic.md
            ├── words.md
            ├── reading.md
            └── feedback.md
```

## 技術スタック

- **Go 1.26**: コアロジック、TUIアプリ
- **Bubbletea**: TUI フレームワーク
- **Next.js 15**: Webフロントエンド
- **Tailwind CSS**: スタイリング
- **Docker Compose**: コンテナオーケストレーション
- **Gemini API**: AI機能 (教材生成、STT、画像生成)
