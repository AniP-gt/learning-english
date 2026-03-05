package ui

import (
	"strings"

	tea "github.com/charmbracelet/bubbletea"
)

type flashcard struct {
	word        string
	translation string
	example     string
}

func parseWordsMarkdown(md string) []flashcard {
	var cards []flashcard
	lines := strings.Split(md, "\n")
	for _, line := range lines {
		line = strings.TrimSpace(line)
		if !strings.HasPrefix(line, "|") {
			continue
		}
		if strings.Contains(line, "---") {
			continue
		}
		cols := splitMarkdownRow(line)
		if len(cols) < 2 {
			continue
		}
		word := strings.TrimSpace(cols[0])
		translation := strings.TrimSpace(cols[1])
		if strings.EqualFold(word, "word") || strings.EqualFold(word, "english") {
			continue
		}
		if word == "" || translation == "" {
			continue
		}
		var example string
		if len(cols) >= 3 {
			example = strings.TrimSpace(cols[2])
		}
		cards = append(cards, flashcard{
			word:        word,
			translation: translation,
			example:     example,
		})
	}
	return cards
}

func splitMarkdownRow(line string) []string {
	line = strings.TrimSpace(line)
	line = strings.Trim(line, "|")
	cols := strings.Split(line, "|")
	for i, c := range cols {
		cols[i] = strings.TrimSpace(c)
	}
	return cols
}

func (m Model) handleFlashcardKey(msg tea.KeyMsg) (Model, tea.Cmd) {
	n := len(m.parsedWords)
	if n == 0 {
		m.flashcardMode = false
		return m, nil
	}
	switch msg.String() {
	case "esc", "q":
		m.flashcardMode = false
		m.flashcardFlipped = false

	case " ":
		m.flashcardFlipped = !m.flashcardFlipped

	case "right", "l":
		if m.flashcardIndex < n-1 {
			m.flashcardIndex++
			m.flashcardFlipped = false
		}

	case "left", "h":
		if m.flashcardIndex > 0 {
			m.flashcardIndex--
			m.flashcardFlipped = false
		}

	case "k", "K":
		m.flashcardChecked[m.flashcardIndex] = !m.flashcardChecked[m.flashcardIndex]

	case "r":
		for i := range m.flashcardChecked {
			m.flashcardChecked[i] = false
		}
		m.flashcardIndex = 0
		m.flashcardFlipped = false
	}
	return m, nil
}
