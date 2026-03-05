package gemini

import (
	"bytes"
	"encoding/json"
	"fmt"
	"io"
	"net/http"
	"os"
	"time"
)

const (
	baseURL  = "https://generativelanguage.googleapis.com/v1beta/models"
	maxRetry = 5
)

type Client struct {
	apiKey     string
	modelName  string
	httpClient *http.Client
}

func NewClient() *Client {
	return &Client{
		apiKey:     os.Getenv("GEMINI_API_KEY"),
		modelName:  "gemini-2.5-flash",
		httpClient: &http.Client{Timeout: 60 * time.Second},
	}
}

func NewClientWithConfig(apiKey, model string) *Client {
	if apiKey == "" {
		apiKey = os.Getenv("GEMINI_API_KEY")
	}
	if model == "" {
		model = "gemini-2.5-flash"
	}
	return &Client{
		apiKey:     apiKey,
		modelName:  model,
		httpClient: &http.Client{Timeout: 60 * time.Second},
	}
}

func (c *Client) SetModel(model string) {
	if model != "" {
		c.modelName = model
	}
}

func (c *Client) SetAPIKey(key string) {
	c.apiKey = key
}

func (c *Client) HasAPIKey() bool {
	return c.apiKey != ""
}

type generateRequest struct {
	Contents []content `json:"contents"`
}

type content struct {
	Parts []part `json:"parts"`
}

type part struct {
	Text string `json:"text"`
}

type generateResponse struct {
	Candidates []struct {
		Content struct {
			Parts []struct {
				Text string `json:"text"`
			} `json:"parts"`
		} `json:"content"`
	} `json:"candidates"`
}

func (c *Client) generate(prompt string) (string, error) {
	if c.apiKey == "" {
		return "", fmt.Errorf("GEMINI_API_KEY not set")
	}

	reqBody := generateRequest{
		Contents: []content{{Parts: []part{{Text: prompt}}}},
	}

	body, err := json.Marshal(reqBody)
	if err != nil {
		return "", err
	}

	url := fmt.Sprintf("%s/%s:generateContent?key=%s", baseURL, c.modelName, c.apiKey)

	var lastErr error
	for attempt := 0; attempt < maxRetry; attempt++ {
		if attempt > 0 {
			wait := time.Duration(1<<uint(attempt)) * time.Second
			time.Sleep(wait)
		}

		resp, err := c.httpClient.Post(url, "application/json", bytes.NewReader(body))
		if err != nil {
			lastErr = err
			continue
		}
		defer resp.Body.Close()

		if resp.StatusCode == 429 || resp.StatusCode >= 500 {
			lastErr = fmt.Errorf("HTTP %d", resp.StatusCode)
			continue
		}

		respBody, err := io.ReadAll(resp.Body)
		if err != nil {
			return "", err
		}

		if resp.StatusCode != 200 {
			return "", fmt.Errorf("API error %d: %s", resp.StatusCode, string(respBody))
		}

		var result generateResponse
		if err := json.Unmarshal(respBody, &result); err != nil {
			return "", err
		}

		if len(result.Candidates) == 0 || len(result.Candidates[0].Content.Parts) == 0 {
			return "", fmt.Errorf("empty response from API")
		}

		return result.Candidates[0].Content.Parts[0].Text, nil
	}

	return "", fmt.Errorf("max retries exceeded: %w", lastErr)
}

func (c *Client) GenerateTopicFromJapanese(japaneseText string) (string, error) {
	prompt := fmt.Sprintf(`以下の日本語テキストから、英語学習に最適なトピックとキーワードを抽出してください。

日本語テキスト:
%s

以下の形式で出力してください:
# Topic
[メインのトピック（英語）]

# Keywords
- [キーワード1（英語）]
- [キーワード2（英語）]
- [キーワード3（英語）]

# Summary
[トピックの簡単な説明（日本語）]`, japaneseText)

	return c.generate(prompt)
}

func (c *Client) GenerateWords(topic string) (string, error) {
	prompt := fmt.Sprintf(`以下のトピックに関連する英単語リストを作成してください。

トピック: %s

以下のMarkdownテーブル形式で10-15単語を出力してください:
| Word | Translation | Example |
|------|-------------|---------|
| word | 日本語訳 | Example sentence using the word. |`, topic)

	return c.generate(prompt)
}

func (c *Client) GenerateReading(topic string) (string, error) {
	prompt := fmt.Sprintf(`以下のトピックに関連する英文を作成してください。WPM計測用の読解テキストです。

トピック: %s

要件:
- CEFRレベル: B1-B2
- 単語数: 150-200語
- 自然な英語で書く
- 複数の段落に分ける

テキストの最初に # Reading と書き、次の行に CEFR: [レベル] | Words: [単語数] と書いてください。
その後に本文を書いてください。`, topic)

	return c.generate(prompt)
}

func (c *Client) GenerateImageScene(speechText string) (string, error) {
	prompt := fmt.Sprintf(`以下のスピーチ内容から、4コマ漫画のシーン描写を生成してください。

スピーチ:
%s

各シーンを以下の形式で出力してください:
## Scene 1: [タイトル]
[シーンの詳細な描写（英語）]

## Scene 2: [タイトル]
[シーンの詳細な描写（英語）]

## Scene 3: [タイトル]
[シーンの詳細な描写（英語）]

## Scene 4: [タイトル]
[シーンの詳細な描写（英語）]`, speechText)

	return c.generate(prompt)
}

func (c *Client) AnalyzeSpeech(transcription string) (string, error) {
	prompt := fmt.Sprintf(`以下の英語スピーチの文字起こしを解析し、フィードバックを提供してください。

文字起こし:
%s

以下の形式でフィードバックを提供してください:
## Grammar Corrections
[文法の修正点]

## Vocabulary Suggestions
[語彙の改善提案]

## Overall Score
[10点満点でのスコアと理由]

## Improved Version
[改善されたスピーチの例]`, transcription)

	return c.generate(prompt)
}

func (c *Client) StartRoleplay(role string, userMessage string) (string, error) {
	systemPrompt := fmt.Sprintf(`You are %s. Respond naturally in English. Keep responses conversational and concise (2-3 sentences). 
If the user makes grammar mistakes, occasionally and gently correct them.`, role)

	prompt := fmt.Sprintf("%s\n\nUser: %s\n\nRespond as %s:", systemPrompt, userMessage, role)
	return c.generate(prompt)
}

func (c *Client) TranscribeSpeech(audioData []byte) (string, error) {
	return "", fmt.Errorf("audio transcription not yet implemented")
}

func (c *Client) GenerateImagePrompt(text string) (string, error) {
	return c.GenerateImageScene(text)
}
