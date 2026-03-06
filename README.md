# Learning English

日本語話者向けの英語学習アプリケーション（TUI + Web）。
このリポジトリは、Gemini API を活用した学習ワークフローを提供します。ローカルの TUI (Bubbletea) とブラウザベースの Web UI (Next.js) の両方から同一のコアロジックを利用できます。

このプロジェクトを OSS として公開するための README です。導入、開発、貢献方法、ライセンス、注意点をまとめています。

## 主要な特徴

- Gemini API による教材生成、STT（音声→文字変換）、画像生成の利用
- TUI（Bubbletea）による高速な学習体験
- Web（Next.js）での学習記録・再生・共有
- Go で実装された共通コアロジックにより、UI 間で振る舞いを共有

## リポジトリ構成（抜粋）

```
.
├── cmd/               # エントリポイント（例: cmd/tui）
├── pkg/               # 共通ライブラリ（core, storage, gemini など）
├── internal/          # TUI の内部実装
├── web/               # Next.js アプリケーション
├── docs/              # 仕様・モック・設計資料
├── artifacts/         # 学習データの保存先（実行時に生成）
└── docker-compose.yml
```

## クイックスタート

1. リポジトリをクローン

```bash
git clone https://github.com/<your-org>/learning-english.git
cd learning-english
```

2. 環境変数を用意（Gemini API キーなど）

```bash
cp .env.example .env
# .env を編集して GEMINI_API_KEY 等を設定してください
```

3. TUI を実行

```bash
go run cmd/tui/main.go
```

4. Web を実行

```bash
cd web
npm install
npm run dev
# ブラウザで http://localhost:3000 を開く
```

5. Docker Compose（代替）

```bash
docker compose up --build
# TUI: `docker compose run tui`
# Web: http://localhost:3000
```

## 学習ワークフロー（7 ステップ）

1. Idea — 日本語でネタ出し（Gemini との対話）
2. Words — 単語帳の自動生成
3. Reading — リーディング（WPM 計測）
4. Listening — 音声再生（say / Web Speech API）
5. Speech — 録音と文字起こし（Gemini STT）
6. 3-2-1 — 画像想起トレーニング
7. Roleplay — 会話ロールプレイ（Gemini Chat）

## データ構造

学習データは artifacts 配下に以下のように保存されます。

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

## 開発者向け情報

- Go: go.mod を利用しています（Go 1.26 を想定）
- Web: Next.js + TypeScript、Tailwind CSS
- Linter / Formatter: 各自の環境で設定してください（pre-commit フックはありません）

推奨ワークフロー:

1. 新しい機能はブランチを切る（例: feature/xxx）
2. テストとローカル動作確認
3. PR を作成してレビュー依頼

（注）このリポジトリには CI の設定を含めていないため、組み込む場合は .github/workflows 等を追加してください。

## 貢献方法

1. Issue を立てる（バグ、改善案、提案）
2. フォーク→ブランチ→PR
3. PR には目的、実装の要点、再現手順（必要ならスクリーンショット）を記載

歓迎: ドキュメント改善、国際化対応、テスト追加、UI/UX 改善。

## ライセンス

このリポジトリは LICENSE ファイルに従います（リポジトリ内に LICENSE が含まれています）。

## セキュリティとプライバシー

- Gemini API キー等のシークレットは決して公開リポジトリに含めないでください。.env やシークレットは必ずローカル/環境変数として管理してください。
- 学習データに個人情報・機密情報を保存しないでください。外部 API（Gemini）へ送信するデータはプライバシー上のリスクがあるため注意してください。

## 注意点（OSS 公開に向けたメモ）

- Gemini（商用・API 利用）に関する利用規約・料金体系を確認してください。API 利用により発生する費用やデータ利用規約はプロジェクト外の要因です。
- ユーザー生成コンテンツや音声データの取り扱いを明文化することを推奨します（例えば PRIVACY.md）。

## 問い合わせ

問題報告・質問は Issue へお願いします。

--

この README は OSS 公開に必要な最低限の情報をまとめたものです。追加してほしい項目（CI、デプロイ手順、スクリーンショット、データ例など）は PR/Issue を歓迎します。
