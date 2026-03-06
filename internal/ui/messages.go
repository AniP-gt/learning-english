package ui

import "time"

type tickMsg time.Time

type geminiResponseMsg struct {
	content string
	err     error
}

type imageGenMsg struct {
	imgBytes  []byte
	mimeType  string
	savedPath string
	err       error
}

type wordsReadingResponseMsg struct {
	wordsContent   string
	wordsErr       error
	readingContent string
	readingErr     error
}

type replyMessage struct {
	role    string
	content string
}
