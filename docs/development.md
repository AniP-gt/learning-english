# 開発環境セットアップガイド

## 必要な環境

### 必須
- **Go 1.26+**: TUIアプリケーション開発
- **Node.js 20+**: Webフロントエンド開発
- **Docker & Docker Compose**: コンテナ実行環境

### オプション
- **macOS**: `say`コマンドによるネイティブTTS
- **Git**: データの履歴管理・同期

## プロジェクト構造

```
learning-english/
├── cmd/
│   └── tui/              # TUIアプリケーションエントリーポイント
│       └── main.go
├── pkg/
│   ├── core/             # 共通ロジック
│   │   ├── types.go      # 型定義 (Step, LearningData, etc.)
│   │   └── config.go     # 設定管理
│   ├── storage/          # ファイルストレージ
│   │   └── file.go       # Markdownファイル読み書き
│   └── gemini/           # Gemini API連携
│       └── client.go     # APIクライアント
├── internal/
│   └── ui/               # TUI UI実装
│       └── model.go      # Bubbletea Model
├── web/                  # Next.jsアプリケーション
│   ├── app/              # App Router
│   ├── components/       # Reactコンポーネント
│   └── public/           # 静的ファイル
├── docs/                 # ドキュメント
│   ├── design.md         # 仕様書
│   ├── moc.tsx           # UIモック
│   └── development.md    # このファイル
├── artifacts/            # 学習データ保存先
│   └── english-learning/
│       └── data/
│           └── YYYY/MM/weekN/
├── docker-compose.yml    # Dockerオーケストレーション
├── Dockerfile.tui        # TUIコンテナ
└── .env                  # 環境変数 (要作成)
```

## セットアップ手順

### 1. リポジトリクローン

```bash
git clone https://github.com/AniP-gt/learning-english.git
cd learning-english
```

### 2. 環境変数設定

```bash
cp .env.example .env
```

`.env`を編集:
```env
GEMINI_API_KEY=your_gemini_api_key_here
LEARNING_DATA_DIR=./artifacts/english-learning/data
GIT_ENABLED=false
GIT_REPO=
```

Gemini API Keyは [Google AI Studio](https://makersuite.google.com/app/apikey) で取得。

### 3. Goモジュール初期化

```bash
go mod download
go mod tidy
```

### 4. TUIビルド

```bash
go build -o bin/tui ./cmd/tui
```

ビルド成功確認:
```bash
ls -lh bin/tui
# 出力例: -rwxr-xr-x 1 user staff 4.1M Mar 5 14:35 bin/tui
```

### 5. Webセットアップ

```bash
cd web
npm install
```

## ローカル開発

### TUI開発

#### 実行
```bash
go run cmd/tui/main.go
```

#### ホットリロード (Air使用)
```bash
# Airインストール
go install github.com/cosmtrek/air@latest

# 実行
air
```

#### デバッグ
```bash
# デバッグビルド
go build -gcflags="all=-N -l" -o bin/tui-debug ./cmd/tui

# Delveでデバッグ
dlv exec ./bin/tui-debug
```

#### キーバインド
- `1-7`: ステップ切り替え
- `tab`: サイドバー表示/非表示
- `q`, `Ctrl+C`: 終了

### Web開発

```bash
cd web
npm run dev
```

ブラウザで http://localhost:3000 を開く。

#### ビルド確認
```bash
npm run build
npm run start
```

### コード整形

#### Go
```bash
go fmt ./...
go vet ./...
```

#### TypeScript
```bash
cd web
npm run lint
npm run lint:fix
```

## Docker開発

### ビルド

```bash
docker compose build
```

### TUI実行

```bash
docker compose run --rm tui
```

### Web実行

```bash
docker compose up web
```

http://localhost:3000 でアクセス可能。

### すべてのサービス起動

```bash
docker compose up
```

### ログ確認

```bash
docker compose logs -f tui
docker compose logs -f web
```

### コンテナ停止・削除

```bash
docker compose down
docker compose down -v  # ボリュームも削除
```

## 依存パッケージ

### Go (pkg/core)

```go
github.com/charmbracelet/bubbletea   // TUIフレームワーク
github.com/charmbracelet/lipgloss    // スタイリング
github.com/charmbracelet/bubbles     // UIコンポーネント
```

追加方法:
```bash
go get github.com/package/name@latest
go mod tidy
```

### Node.js (web/)

```json
{
  "dependencies": {
    "next": "^15.1.3",
    "react": "^19.0.0",
    "react-dom": "^19.0.0"
  },
  "devDependencies": {
    "typescript": "^5.7.2",
    "tailwindcss": "^4.0.0"
  }
}
```

追加方法:
```bash
cd web
npm install package-name
```

## テスト

### Goテスト

```bash
go test ./...
go test -v ./pkg/core
go test -cover ./...
```

### Webテスト

```bash
cd web
npm run test
npm run test:watch
```

## トラブルシューティング

### Go: missing go.sum entry

```bash
go mod tidy
go clean -modcache
go mod download
```

### Web: port 3000 already in use

```bash
# プロセス確認
lsof -i :3000

# プロセス終了
kill -9 <PID>

# または別ポート使用
PORT=3001 npm run dev
```

### Docker: build cache

```bash
docker compose build --no-cache
docker system prune -a
```

### Gemini API: 認証エラー

1. `.env`のAPI Key確認
2. [Google AI Studio](https://makersuite.google.com/app/apikey)で有効期限確認
3. 環境変数再読み込み: `source .env`

## デバッグTips

### TUIデバッグ

標準出力がBubbletea UIに上書きされるため、ログファイルを使用:

```go
// デバッグログ
f, _ := os.OpenFile("debug.log", os.O_APPEND|os.O_CREATE|os.O_WRONLY, 0644)
defer f.Close()
log.SetOutput(f)
log.Printf("Debug: %v", someValue)
```

### Web開発者ツール

Chrome DevTools:
- `Cmd+Opt+I` (macOS) / `Ctrl+Shift+I` (Windows/Linux)
- Network タブ: API呼び出し確認
- Console タブ: エラー確認

## VSCode設定推奨

`.vscode/settings.json`:
```json
{
  "go.formatTool": "gofmt",
  "go.lintTool": "golangci-lint",
  "editor.formatOnSave": true,
  "go.testFlags": ["-v"],
  "typescript.tsdk": "web/node_modules/typescript/lib"
}
```

`.vscode/extensions.json`:
```json
{
  "recommendations": [
    "golang.go",
    "dbaeumer.vscode-eslint",
    "bradlc.vscode-tailwindcss",
    "esbenp.prettier-vscode"
  ]
}
```

## データディレクトリ構造

学習データは以下の形式で自動生成:

```
artifacts/english-learning/data/
└── 2026/
    └── 03/
        └── week1/
            ├── topic.md       # Step 1: トピック
            ├── words.md       # Step 2: 単語リスト
            ├── day1/
            │   ├── reading.md       # Step 3: 読解テキスト (Day 1)
            │   ├── feedback.md      # Step 5-7: フィードバック (Day 1)
            │   ├── speech.wav       # Step 5: 録音オーディオ
            │   └── speech_transcript.txt # Step 5: STT の記録
            └── day2/ ...        # Day 2 以降
```

### ファイル例

`artifacts/english-learning/data/2026/03/week1/words.md`:
```markdown
# Words for Week 1

| Word | Translation | Example |
|------|-------------|---------|
| coffee | コーヒー | I love coffee every morning. |
| aroma | 香り | The aroma is wonderful. |
```

## 次のステップ

1. Gemini API統合実装 (`pkg/gemini/client.go`)
2. Reading/ListeningのWPM計測実装
3. 音声録音・再生機能実装 (`say`コマンド連携)
4. Webフロントエンド UI実装 (`web/app/page.tsx`)
5. Git自動コミット機能実装

## 参考リンク

- [Bubbletea公式](https://github.com/charmbracelet/bubbletea)
- [Next.js公式](https://nextjs.org/docs)
- [Gemini API Docs](https://ai.google.dev/docs)
- [Design Spec](./design.md)
