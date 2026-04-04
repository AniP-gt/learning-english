package ui

import (
	"fmt"
	"strings"

	"github.com/charmbracelet/lipgloss"
)

func (m Model) renderReadingStep(width, height int) string {
	cw := width - 4
	title := styleStepTitle.Foreground(colorCyan).Width(cw).Render("Step 3: Reading — WPM計測")
	var selectionHint string
	if m.awaitingDayDigit {
		selectionHint = " (awaiting 1..7)"
	}
	subtitle := bgLine(cw).PaddingTop(1).Render(
		styleHint.Width(cw).Render(fmt.Sprintf("Active day: day%d%s | g: regenerate reading for this day | [, ]: switch day | d then 1..7: jump", m.activeDay, selectionHint)),
	)

	wordCount := len(strings.Fields(m.readingText))

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

	statsRow := bgLine(cw).PaddingTop(1).Render(
		lipgloss.JoinHorizontal(lipgloss.Top, timerStat, wordStat, wpmStat),
	)

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
	timerBtnRow := bgLine(cw).PaddingTop(1).Render(timerBtn)

	hint := bgLine(cw).PaddingTop(1).Render(
		styleHint.Width(cw).Render("g: Gemini でテキスト生成 | SPACE: タイマー開始/停止"),
	)

	var wpmCommentRow string
	if m.readingComment != "" {
		wpmCommentRow = bgLine(cw).PaddingTop(1).Render(
			styleHint.Foreground(colorFgDim).Width(cw).Render(m.readingComment),
		)
	}

	// Calculate height consumed by non-textbox elements
	// outer padding: top 1 + bottom 1 = 2
	fixedHeight := 2 +
		lipgloss.Height(title) +
		lipgloss.Height(subtitle) +
		1 + // paddingTop for textBox row
		lipgloss.Height(statsRow) +
		lipgloss.Height(timerBtnRow) +
		lipgloss.Height(hint)
	if wpmCommentRow != "" {
		fixedHeight += lipgloss.Height(wpmCommentRow)
	}

	// remaining height goes to the content box (including its border+padding)
	textBoxHeight := height - fixedHeight - styleContentBox.GetVerticalFrameSize()
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

	parts := []string{
		title,
		subtitle,
		bgLine(cw).PaddingTop(1).Render(textBox),
		statsRow,
		timerBtnRow,
		hint,
	}
	if wpmCommentRow != "" {
		parts = append(parts, wpmCommentRow)
	}

	inner := lipgloss.JoinVertical(lipgloss.Left, parts...)

	return lipgloss.NewStyle().
		Background(colorBg).
		Width(width).
		Height(height).
		Padding(1, 2).
		Render(inner)
}
