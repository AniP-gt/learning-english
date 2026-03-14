TUI英語学習システム 仕様書 (Gemini API & macOS say 連携版)

1. プロジェクト概要

動画「Google Geminiを使った30日で英語が話せる7ステップ勉強法」のワークフローを、エンジニア向けに最適化した学習システム。
GitHubをバックエンド、TUI/Webをフロントエンドとし、Gemini APIを用いて「自分専用の教材」を動的に生成・管理する。

2. コア・コンセプト

Markdown Driven: すべての学習データは GitHub 上の Markdown ファイルとして管理し、可搬性と履歴を担保する。

Gemini API Native: 教材生成、音声解析、画像プロンプト生成に Gemini 3 Flash (Free Tier) を活用する。

Hybrid Speech: macOS 環境では say コマンドを、ブラウザ環境では Web Speech API を使用し、API消費を抑えつつ高速なリスニング環境を提供。

TUI First: Bubble Tea (Go) による高速かつ集中できる学習インターフェースを主軸とする。

3. ディレクトリ・データ構造 (GitHub管理)

学習データは以下の階層構造で自動生成・保存される。

/artifacts/english-learning/
└── data/
    └── YYYY/
        └── MM/
            └── weekN/
                ├── topic.md       # Step 1: 日本語スクリプト & 抽出トピック
                ├── words.md       # Step 2: Gemini生成の単語リスト (JSON/Table)
                └── day1/
                    ├── reading.md         # Step 3: WPM計測用英文 (CEFRレベル付)
                    ├── feedback.md        # Step 5-7: スピーチ解析・添削・履歴
                    ├── speech.wav         # Step 5: 発話の録音トラック
                    └── speech_transcript.txt # Step 5: STT の記録


4. ステップ別詳細仕様

Step 1: Idea (日本語ネタ出し)

機能: Gemini との対話により、日常の関心事を日本語で深掘り。

Gemini 役割: 雑談から「英語で話すべきキーワード」を抽出し、topic.md に保存。

Step 2: Words (単語帳作成)

機能: topic.md を元に、重要単語・訳・例文のリストを生成。

実装: Gemini の Structured Output を利用し、words.md へ Markdown テーブル形式で出力。

Step 3: Reading (WPM計測)

機能: 英文の表示と読解スピードの計測。

TUI実装:

スペースキーでタイマー開始/停止。

WPM = (Word Count / Seconds) * 60 を計算し表示。

過去のWPM記録と比較し、成長を可視化。

Step 4: Listening (say/WebTTS)

機能: 英文の読み上げ。

TUI (macOS): exec.Command("say", "-r", speed, text) を実行。

Web: window.speechSynthesis を利用。

仕様: 再生速度を 0.5x 〜 2.0x で動的に変更可能。

Step 5: Speech (録音/STT)

機能: 1分間のスピーチと文字起こし。

実装:

マイク入力を録音（sox または ffmpeg 使用）。

Gemini API の音声認識（Native Audio）へ送信し、文字起こしと文法添削を実施。

Step 6: 3-2-1 (画像想起)

機能: 英文を日本語に訳さず「イメージ」で捉える訓練。

実装:

Gemini がスピーチ内容から「4コマ漫画のシーン描写」を生成。

Web版では imagen-4.0 で画像を生成・表示。

TUI版では画像URLの表示、またはシーン説明テキストを表示。

Step 7: Roleplay (Gemini Chat)

機能: Gemini を相手にした実戦英会話。

実装:

System Prompt で「メルボルンのバリスタ」等の役割を設定。

音声またはテキストでターン制の会話を実施。

5. インフラ & 外部連携 仕様

Gemini API 連携

モデル: gemini-3-flash

認証: apiKey を環境変数より取得。

エラー処理: 指数バックオフによるリトライ（最大5回）を実装。

ストレージ連携

初期フェーズ: ローカルファイルシステム + Gitコマンド実行。

拡張フェーズ: Firestore を利用したマルチデバイス同期。

パス: /artifacts/{appId}/public/data/learning_logs

Docker環境

docker-compose.yml にて以下を定義：

app: TUI/Web 実行環境。

git-sync: 定期的に GitHub へ Push するサイドカー。

6. UI/UX デザインガイドライン (TUI)

テーマ: Tokyo Night (Dark)

レイアウト:

Left Pane: ディレクトリツリー (20% width)

Main Pane: 学習コンテンツ (80% width)

Footer: ステータスライン (Mode, Step, Git Status)

ショートカットキー:

1-7: ステップ切り替え

s: 音声再生/停止

t: タイマー開始/停止

ctrl+s: GitHubへ保存 (Git Commit & Push)
