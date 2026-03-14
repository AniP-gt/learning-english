package ui

import (
	"fmt"
	"strings"

	"github.com/charmbracelet/lipgloss"
)

func (m Model) renderReadingStep(width, height int) string {
	title := styleStepTitle.Foreground(colorCyan).Render("Step 3: Reading — WPM計測")

	wordCount := len(strings.Fields(m.readingText))

	// determine available height for text box
	textBoxHeight := height - 18
	if textBoxHeight < 4 {
		textBoxHeight = 4
	}

	textBoxWidth := width - 8
	textInnerWidth := visibleBoxWidth(styleContentBox, textBoxWidth)
	visible := visibleBoxLines(styleContentBox, textBoxHeight)
	lines := wrapPlainTextLines(m.readingText, textInnerWidth)
	visibleText := sliceVisibleLines(lines, m.readingScrollOffset, visible)

	textBox := styleContentBox.
		Width(textBoxWidth).
		Height(textBoxHeight).
		Render(visibleText)

	timerColor := colorYellow
	if m.readingTiming {
		timerColor = colorRed
	}

	timerStat := styleStat.
		Width((width - 12) / 3).
		Foreground(timerColor).
		Render(fmt.Sprintf("Timer\n\n%ds", m.readingTimer))

	wordStat := styleStat.
		Width((width - 12) / 3).
		Foreground(colorCyan).
		Render(fmt.Sprintf("Words\n\n%d", wordCount))

	wpmStr := "--"
	if m.readingWPM > 0 {
		wpmStr = fmt.Sprintf("%d", m.readingWPM)
	}
	wpmStat := styleStat.
		Width((width - 12) / 3).
		Foreground(colorGreen).
		Render(fmt.Sprintf("WPM\n\n%s", wpmStr))

	statsRow := lipgloss.JoinHorizontal(lipgloss.Top, timerStat, wordStat, wpmStat)

	var timerBtn string
	if !m.readingTiming {
		timerBtn = lipgloss.NewStyle().
			Background(colorGreen).
			Foreground(colorBg).
			Bold(true).
			Padding(0, 2).
			Render("▶ SPACE: タイマー開始")
	} else {
		timerBtn = lipgloss.NewStyle().
			Background(colorRed).
			Foreground(colorBg).
			Bold(true).
			Padding(0, 2).
			Render("■ SPACE: 停止 (完了)")
	}

	hint := styleHint.Render("g: Gemini でテキスト生成 | SPACE: タイマー開始/停止")

	var wpmComment string
	if m.readingComment != "" {
		wpmComment = styleHint.Foreground(colorFgDim).Render(m.readingComment)
	}

	inner := lipgloss.JoinVertical(lipgloss.Left,
		title,
		lipgloss.NewStyle().Background(colorBg).PaddingTop(1).Render(textBox),
		lipgloss.NewStyle().Background(colorBg).PaddingTop(1).Render(statsRow),
		lipgloss.NewStyle().Background(colorBg).PaddingTop(1).Render(timerBtn),
		lipgloss.NewStyle().Background(colorBg).PaddingTop(1).Render(hint),
		lipgloss.NewStyle().Background(colorBg).PaddingTop(1).Render(wpmComment),
	)

	return lipgloss.NewStyle().
		Background(colorBg).
		Width(width).
		Height(height).
		Padding(1, 2).
		Render(inner)
}
