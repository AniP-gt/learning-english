package ui

import (
	"fmt"
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

// buildWordsMarkdown constructs a markdown table from flashcards.
func buildWordsMarkdown(cards []flashcard) string {
	// header
	b := strings.Builder{}
	b.WriteString("| Word | Translation | Example |\n")
	b.WriteString("|------|-------------|---------|\n")
	for _, c := range cards {
		// escape vertical bars in content (very simple)
		w := strings.ReplaceAll(c.word, "|", "\\|")
		t := strings.ReplaceAll(c.translation, "|", "\\|")
		e := strings.ReplaceAll(c.example, "|", "\\|")
		b.WriteString(fmt.Sprintf("| %s | %s | %s |\n", w, t, e))
	}
	return b.String()
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
	case "s", "S":
		// Pronounce the current word (macOS: say). playSay is a noop on non-darwin.
		if m.flashcardIndex >= 0 && m.flashcardIndex < len(m.parsedWords) {
			word := m.parsedWords[m.flashcardIndex].word
			// Use a tea.Cmd to run speech asynchronously
			return m, func() tea.Msg {
				playSay(word, m.listeningSpeed)
				return struct{}{}
			}
		}
	}
	return m, nil
}

// words edit handling moved here because it logically operates on flashcards
func (m Model) handleWordsEditKey(msg tea.KeyMsg) (Model, tea.Cmd) {
	n := len(m.parsedWords)
	// If we're in input mode, handle rune/backspace/enter/esc here so
	// the user can actually type into the input buffer.
	if m.wordsInputMode {
		switch msg.Type {
		case tea.KeyEsc:
			// cancel input editing
			m.wordsInputMode = false
			m.wordsEditingAction = ""
			m.statusMsg = "Cancelled edit"
			return m, nil
		case tea.KeyEnter:
			// reuse existing enter-handling below by falling through to
			// parsing and saving the buffer
			cols := splitMarkdownRow(m.wordsInputBuffer)
			if len(cols) >= 2 {
				w := strings.TrimSpace(cols[0])
				t := strings.TrimSpace(cols[1])
				e := ""
				if len(cols) >= 3 {
					e = strings.TrimSpace(cols[2])
				}
				if m.wordsEditingAction == "insert" {
					insertAt := m.wordsCursor + 1
					if insertAt < 0 {
						insertAt = 0
					}
					new := flashcard{word: w, translation: t, example: e}
					if insertAt >= len(m.parsedWords) {
						m.parsedWords = append(m.parsedWords, new)
					} else {
						head := append([]flashcard{}, m.parsedWords[:insertAt]...)
						head = append(head, new)
						m.parsedWords = append(head, m.parsedWords[insertAt:]...)
					}
				} else if m.wordsEditingAction == "update" {
					if m.wordsCursor >= 0 && m.wordsCursor < len(m.parsedWords) {
						m.parsedWords[m.wordsCursor] = flashcard{word: w, translation: t, example: e}
					}
				}
				m.words = buildWordsMarkdown(m.parsedWords)
				_ = m.storage.WriteFile(m.weekPath, "words.md", []byte(m.words))
				m.wordsInputMode = false
				m.wordsEditingAction = ""
				m.statusMsg = "Saved words"
			} else {
				m.statusMsg = "Invalid row format"
			}
			return m, nil
		case tea.KeyLeft:
			if m.wordsInputCursor > 0 {
				m.wordsInputCursor--
			}
			return m, nil
		case tea.KeyRight:
			runes := []rune(m.wordsInputBuffer)
			if m.wordsInputCursor < len(runes) {
				m.wordsInputCursor++
			}
			return m, nil
		case tea.KeyBackspace:
			runes := []rune(m.wordsInputBuffer)
			if m.wordsInputCursor > 0 && len(runes) > 0 {
				m.wordsInputBuffer = string(runes[:m.wordsInputCursor-1]) + string(runes[m.wordsInputCursor:])
				m.wordsInputCursor--
			}
			return m, nil
		case tea.KeyRunes, tea.KeySpace:
			runes := []rune(m.wordsInputBuffer)
			ins := msg.Runes
			m.wordsInputBuffer = string(runes[:m.wordsInputCursor]) + string(ins) + string(runes[m.wordsInputCursor:])
			m.wordsInputCursor += len(ins)
			return m, nil
		default:
			// ignore other keys while editing
			return m, nil
		}
	}

	// Not in input mode — handle navigation and commands
	switch msg.String() {
	case "esc", "q":
		m.wordsEditMode = false
		m.wordsInputMode = false
		m.wordsEditingAction = ""
		m.statusMsg = "Exited words edit mode"
	case "j", "down":
		if m.wordsCursor < n-1 {
			m.wordsCursor++
		}
	case "k", "up":
		if m.wordsCursor > 0 {
			m.wordsCursor--
		}
	case "i":
		m.wordsInputMode = true
		m.wordsInputBuffer = "|  |  |  |"
		m.wordsInputCursor = len([]rune(m.wordsInputBuffer))
		m.wordsEditingAction = "insert"
		m.statusMsg = "Insert new row. Enter to confirm."
	case "u":
		if m.wordsCursor >= 0 && m.wordsCursor < n {
			c := m.parsedWords[m.wordsCursor]
			m.wordsInputBuffer = fmt.Sprintf("| %s | %s | %s |", c.word, c.translation, c.example)
			m.wordsInputCursor = len([]rune(m.wordsInputBuffer))
			m.wordsInputMode = true
			m.wordsEditingAction = "update"
			m.statusMsg = "Update row. Edit and press Enter to save."
		}
	case "d":
		if m.wordsCursor >= 0 && m.wordsCursor < n {
			m.parsedWords = append(m.parsedWords[:m.wordsCursor], m.parsedWords[m.wordsCursor+1:]...)
			m.words = buildWordsMarkdown(m.parsedWords)
			_ = m.storage.WriteFile(m.weekPath, "words.md", []byte(m.words))
			if m.wordsCursor >= len(m.parsedWords) {
				m.wordsCursor = len(m.parsedWords) - 1
			}
			m.statusMsg = "Deleted row"
		}
	}
	return m, nil
}
