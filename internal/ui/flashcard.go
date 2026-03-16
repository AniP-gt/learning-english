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
		// Advance to next flashcard; wrap to the first after the last
		if m.flashcardIndex < n-1 {
			m.flashcardIndex++
		} else {
			m.flashcardIndex = 0
		}
		m.flashcardFlipped = false

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
	if m.wordsInputMode {
		switch msg.String() {
		case "esc":
			m.wordsInputMode = false
			m.wordsEditingAction = ""
			m = m.resetWordsForm()
			m.statusMsg = "Cancelled edit"
			return m, nil
		case "tab", "down":
			return m.focusWordsFormField(m.wordsFormFocus + 1)
		case "shift+tab", "up":
			return m.focusWordsFormField(m.wordsFormFocus - 1)
		case "enter":
			word := strings.TrimSpace(m.wordsFormInputs[wordsFieldWord].Value())
			translation := strings.TrimSpace(m.wordsFormInputs[wordsFieldTrans].Value())
			example := strings.TrimSpace(m.wordsFormInputs[wordsFieldEx].Value())

			if word == "" || translation == "" {
				m.statusMsg = "Word and translation are required"
				return m, nil
			}

			card := flashcard{word: word, translation: translation, example: example}
			switch m.wordsEditingAction {
			case "insert":
				insertAt := m.wordsCursor + 1
				if n == 0 {
					insertAt = 0
				}
				if insertAt < 0 {
					insertAt = 0
				}
				if insertAt >= len(m.parsedWords) {
					m.parsedWords = append(m.parsedWords, card)
					m.wordsCursor = len(m.parsedWords) - 1
				} else {
					head := append([]flashcard{}, m.parsedWords[:insertAt]...)
					head = append(head, card)
					m.parsedWords = append(head, m.parsedWords[insertAt:]...)
					m.wordsCursor = insertAt
				}
			case "update":
				if m.wordsCursor >= 0 && m.wordsCursor < len(m.parsedWords) {
					m.parsedWords[m.wordsCursor] = card
				}
			}

			m.words = buildWordsMarkdown(m.parsedWords)
			_ = m.storage.WriteWeekFile(m.weekPath, "words.md", []byte(m.words))
			m.wordsInputMode = false
			m.wordsEditingAction = ""
			m = m.resetWordsForm()
			m.statusMsg = "Saved words"
			return m, nil
		}

		var cmd tea.Cmd
		m.wordsFormInputs[m.wordsFormFocus], cmd = m.wordsFormInputs[m.wordsFormFocus].Update(msg)
		return m, cmd
	}

	switch msg.String() {
	case "esc", "q":
		m.wordsEditMode = false
		m.wordsInputMode = false
		m.wordsEditingAction = ""
		m = m.resetWordsForm()
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
		m = m.resetWordsForm()
		m.wordsEditingAction = "insert"
		m.statusMsg = "Insert new row. Fill in the fields and press Enter to save."
		return m, nil
	case "u":
		if m.wordsCursor >= 0 && m.wordsCursor < n {
			m = m.setWordsFormValues(m.parsedWords[m.wordsCursor])
			m.wordsInputMode = true
			m.wordsEditingAction = "update"
			m.statusMsg = "Update row. Edit the fields and press Enter to save."
			return m, nil
		}
	case "d":
		if m.wordsCursor >= 0 && m.wordsCursor < n {
			m.parsedWords = append(m.parsedWords[:m.wordsCursor], m.parsedWords[m.wordsCursor+1:]...)
			m.words = buildWordsMarkdown(m.parsedWords)
			_ = m.storage.WriteWeekFile(m.weekPath, "words.md", []byte(m.words))
			if m.wordsCursor >= len(m.parsedWords) {
				m.wordsCursor = len(m.parsedWords) - 1
			}
			if m.wordsCursor < 0 {
				m.wordsCursor = 0
			}
			m.statusMsg = "Deleted row"
		}
	}
	return m, nil
}
