package ui

import (
	"fmt"
	"strings"

	"github.com/charmbracelet/lipgloss"
)

func (m Model) renderWordsEditMode(width, height int) string {
	title := styleStepTitle.Foreground(colorYellow).Render("Step 2: Words — Edit Mode")

	var rows []string
	if len(m.parsedWords) == 0 {
		rows = append(rows, lipgloss.NewStyle().Background(colorBg).Foreground(colorFgDim).Render("(no words yet)"))
	} else {
		for i, c := range m.parsedWords {
			prefix := "  "
			if i == m.wordsCursor {
				prefix = "> "
			}
			row := fmt.Sprintf("%s%s — %s", prefix, c.word, c.translation)
			rows = append(rows, lipgloss.NewStyle().Background(colorBg).Render(row))
		}
	}

	var inputBox string
	if m.wordsInputMode {
		inputBox = styleContentBox.Width(width - 8).Render(m.wordsInputBuffer + "█")
	} else {
		hint := styleHint.Render("i:insert u:update d:delete Enter:confirm esc:exit")
		inputBox = hint
	}

	content := lipgloss.JoinVertical(lipgloss.Left,
		styleContentBox.Width(width-8).Render(strings.Join(rows, "\n")),
		inputBox,
	)

	inner := lipgloss.JoinVertical(lipgloss.Left,
		title,
		lipgloss.NewStyle().Background(colorBg).Padding(1, 0).Render(content),
	)

	return lipgloss.NewStyle().
		Background(colorBg).
		Width(width).
		Height(height).
		Padding(1, 2).
		Render(inner)
}
