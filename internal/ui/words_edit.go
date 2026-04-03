package ui

import (
	"fmt"
	"strings"

	"github.com/charmbracelet/bubbles/textinput"
	tea "github.com/charmbracelet/bubbletea"
	"github.com/charmbracelet/lipgloss"
)

const (
	wordsFieldCount = 3
	wordsFieldWord  = 0
	wordsFieldTrans = 1
	wordsFieldEx    = 2
)

var wordsFieldLabels = [wordsFieldCount]string{
	"Word",
	"Translation",
	"Example sentence",
}

func newWordsFormInputs() [wordsFieldCount]textinput.Model {
	placeholders := [wordsFieldCount]string{
		"coffee",
		"コーヒー",
		"I drink coffee every morning.",
	}

	var inputs [wordsFieldCount]textinput.Model
	for i := range inputs {
		ti := textinput.New()
		ti.Width = 56
		ti.Placeholder = placeholders[i]
		inputs[i] = ti
	}
	inputs[0].Focus()
	return inputs
}

func (m Model) resetWordsForm() Model {
	m.wordsFormInputs = newWordsFormInputs()
	m.wordsFormFocus = 0
	return m
}

func (m Model) setWordsFormValues(card flashcard) Model {
	m = m.resetWordsForm()
	m.wordsFormInputs[wordsFieldWord].SetValue(card.word)
	m.wordsFormInputs[wordsFieldTrans].SetValue(card.translation)
	m.wordsFormInputs[wordsFieldEx].SetValue(card.example)
	return m
}

func (m Model) focusWordsFormField(next int) (Model, tea.Cmd) {
	if next < 0 {
		next = wordsFieldCount - 1
	}
	if next >= wordsFieldCount {
		next = 0
	}
	for i := range m.wordsFormInputs {
		m.wordsFormInputs[i].Blur()
	}
	m.wordsFormFocus = next
	cmd := m.wordsFormInputs[next].Focus()
	return m, cmd
}

func (m Model) renderWordsEditMode(width, height int) string {
	cw := width - 4
	title := styleStepTitle.Foreground(colorYellow).Width(cw).Render("Step 2: Words — Edit Mode")

	var rows []string
	if len(m.parsedWords) == 0 {
		rows = append(rows, lipgloss.NewStyle().Background(colorBg).Foreground(colorFgDim).Render("(no words yet)"))
	} else {
		for i, c := range m.parsedWords {
			prefix := "  "
			if i == m.wordsCursor {
				prefix = "> "
			}
			// include example if present
			example := strings.TrimSpace(c.example)
			var row string
			if example != "" {
				row = fmt.Sprintf("%s%s — %s — %s", prefix, c.word, c.translation, example)
			} else {
				row = fmt.Sprintf("%s%s — %s", prefix, c.word, c.translation)
			}
			rows = append(rows, lipgloss.NewStyle().Background(colorBg).Render(row))
		}
	}

	var inputBox string
	if m.wordsInputMode {
		formRows := make([]string, 0, wordsFieldCount*2+1)
		for i, label := range wordsFieldLabels {
			labelStyle := lipgloss.NewStyle().Background(colorBg).Foreground(colorFgDim)
			borderColor := colorBorder
			if i == m.wordsFormFocus {
				labelStyle = labelStyle.Foreground(colorYellow).Bold(true)
				borderColor = colorBlue
			}

			formRows = append(formRows, labelStyle.Render(label))
			formRows = append(formRows, lipgloss.NewStyle().
				BorderStyle(lipgloss.NormalBorder()).
				BorderForeground(borderColor).
				Padding(0, 1).
				Width(width-12).
				Render(m.wordsFormInputs[i].View()))
		}
		formRows = append(formRows, styleHint.Width(cw).Render("Tab/↑/↓: move field | Enter: save | Esc: cancel"))
		inputBox = styleContentBox.Width(width - 8).Render(lipgloss.JoinVertical(lipgloss.Left, formRows...))
	} else {
		hint := styleHint.Width(cw).Render("i:insert u:update d:delete Enter:confirm esc:exit")
		inputBox = hint
	}

	content := lipgloss.JoinVertical(lipgloss.Left,
		styleContentBox.Width(width-8).Render(strings.Join(rows, "\n")),
		inputBox,
	)

	inner := lipgloss.JoinVertical(lipgloss.Left,
		title,
		bgLine(cw).Padding(1, 0).Render(content),
	)

	return lipgloss.NewStyle().
		Background(colorBg).
		Width(width).
		Height(height).
		Padding(1, 2).
		Render(inner)
}
