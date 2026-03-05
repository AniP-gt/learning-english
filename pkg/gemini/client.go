package gemini

import (
	"os"
)

type Client struct {
	apiKey string
}

func NewClient() *Client {
	return &Client{
		apiKey: os.Getenv("GEMINI_API_KEY"),
	}
}

func (c *Client) GenerateWords(topic string) ([]byte, error) {
	return nil, nil
}

func (c *Client) TranscribeSpeech(audioData []byte) (string, error) {
	return "", nil
}

func (c *Client) GenerateImagePrompt(text string) (string, error) {
	return "", nil
}
