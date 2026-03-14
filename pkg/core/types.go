package core

import (
	"fmt"
	"time"
)

// Step represents the learning step (1-7)
type Step int

const (
	StepIdea Step = iota + 1
	StepWords
	StepReading
	StepListening
	StepSpeech
	StepThreeTwoOne
	StepRoleplay
)

func (s Step) String() string {
	names := []string{
		"1. Idea (日本語ネタ出し)",
		"2. Words (単語帳作成)",
		"3. Reading (WPM計測)",
		"4. Listening (say/WebTTS)",
		"5. Speech (スピーチ解析)",
		"6. 3-2-1 (画像想起)",
		"7. Reply (チャット会話)",
	}
	if s < 1 || int(s) > len(names) {
		return "Unknown"
	}
	return names[s-1]
}

// WeekPath represents the data path structure
type WeekPath struct {
	Year  int
	Month int
	Week  int
}

func (w WeekPath) Path() string {
	return fmt.Sprintf("%04d/%02d/week%d", w.Year, w.Month, w.Week)
}

type DayPath struct {
	Week WeekPath
	Day  int
}

func (d DayPath) Path() string {
	day := d.Day
	if day < 1 {
		day = 1
	}
	return fmt.Sprintf("%s/day%d", d.Week.Path(), day)
}

// LearningData represents the data for a learning session
type LearningData struct {
	Path     WeekPath
	Topic    string
	Words    []Word
	Reading  ReadingData
	Feedback []FeedbackEntry
}

// Word represents a vocabulary item
type Word struct {
	Word        string `json:"word"`
	Translation string `json:"translation"`
	Example     string `json:"example"`
}

// ReadingData represents reading exercise data
type ReadingData struct {
	Text      string
	WordCount int
	WPM       int
	Timer     time.Duration
	CEFRLevel string
}

// FeedbackEntry represents speech feedback from Gemini
type FeedbackEntry struct {
	Timestamp     time.Time
	Transcription string
	Corrections   []string
	Score         int
}
