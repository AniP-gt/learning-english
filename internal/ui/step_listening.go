package ui

import (
	"fmt"
	"math"
	"strings"
	"unicode"

	"github.com/charmbracelet/lipgloss"
)

func (m Model) renderListeningStep(width, height int) string {
	cw := width - 4
	title := styleStepTitle.Foreground(colorPurple).Width(cw).Render("Step 4: Listening — Dictation")

	speedBar := fmt.Sprintf("Rate: %d wpm", m.listeningSpeed)

	var playBtn string
	if !m.listeningPlaying {
		playBtn = lipgloss.NewStyle().
			Background(colorPurple).
			Foreground(colorBg).
			Bold(true).
			Padding(1, 4).
			Render("▶  PLAY")
	} else {
		playBtn = lipgloss.NewStyle().
			Background(colorRed).
			Foreground(colorBg).
			Bold(true).
			Padding(1, 4).
			Render("■  STOP")
	}

	controlPanel := lipgloss.NewStyle().
		Background(colorBgDark).
		Padding(1, 2).
		BorderStyle(lipgloss.RoundedBorder()).
		BorderForeground(colorBorderAlt).
		Width(width - 8).
		Render(lipgloss.JoinVertical(lipgloss.Left,
			lipgloss.NewStyle().Background(colorBgDark).Foreground(colorFgDim).Render(speedBar),
			lipgloss.NewStyle().Background(colorBgDark).PaddingTop(1).Render(playBtn),
		))

	var inputArea string
	if m.dictationInputMode {
		cursor := "_"
		runes := []rune(m.dictationInput)
		display := string(runes[:m.dictationCursor]) + cursor + string(runes[m.dictationCursor:])
		inputArea = lipgloss.NewStyle().
			Background(colorBgMid).
			Foreground(colorFg).
			Padding(1, 2).
			BorderStyle(lipgloss.NormalBorder()).
			BorderForeground(colorBlue).
			Width(width - 8).
			Render(
				lipgloss.NewStyle().Foreground(colorBlue).Bold(true).Render("Dictation (入力中):") + "\n" +
					display,
			)
	} else {
		preview := m.dictationInput
		if preview == "" {
			preview = lipgloss.NewStyle().Foreground(colorFgDim).Render("(空白 — 'd' で入力)")
		}
		inputArea = lipgloss.NewStyle().
			Background(colorBgMid).
			Foreground(colorFg).
			Padding(1, 2).
			BorderStyle(lipgloss.NormalBorder()).
			BorderForeground(colorBorderAlt).
			Width(width - 8).
			Render(
				lipgloss.NewStyle().Foreground(colorBlue).Bold(true).Render("Dictation:") + "\n" +
					preview,
			)
	}

	var scoreArea string
	if m.dictationScored {
		scoreColor := colorGreen
		if m.dictationScore < 50 {
			scoreColor = colorRed
		} else if m.dictationScore < 80 {
			scoreColor = colorYellow
		}
		scoreArea = lipgloss.NewStyle().
			Background(colorBg).
			Foreground(scoreColor).
			Bold(true).
			Width(cw).
			Render(fmt.Sprintf("一致率: %d%%", m.dictationScore))
	}

	var answerArea string
	if m.dictationShowAnswer {
		answerArea = lipgloss.NewStyle().
			Background(colorBgMid).
			Foreground(colorFg).
			Padding(1, 2).
			BorderStyle(lipgloss.NormalBorder()).
			BorderForeground(colorPurple).
			Width(width - 8).
			Render(
				lipgloss.NewStyle().Foreground(colorPurple).Bold(true).Render("本文（答え合わせ）:") + "\n" +
					// Show the full listening text for answer checking. Previously we truncated
					// with truncateText(..., 300) which could cut multibyte runes and also
					// prevented users from seeing the entire passage when toggling with 'v'.
					// Render the full string; lipgloss will wrap according to width when displayed.
					m.listeningText,
			)
	}

	hint := styleHint.Width(cw).Render("s/SPACE: 再生 | +/-: 速度変更 | d: ディクテーション入力 | enter: 採点 | v: 本文表示切替")

	parts := []string{
		title,
		bgLine(cw).PaddingTop(1).Render(controlPanel),
		bgLine(cw).PaddingTop(1).Render(inputArea),
	}
	if scoreArea != "" {
		parts = append(parts, bgLine(cw).PaddingTop(1).Render(scoreArea))
	}
	if answerArea != "" {
		parts = append(parts, bgLine(cw).PaddingTop(1).Render(answerArea))
	}
	parts = append(parts, bgLine(cw).PaddingTop(1).Render(hint))

	inner := lipgloss.JoinVertical(lipgloss.Left, parts...)

	return lipgloss.NewStyle().
		Background(colorBg).
		Width(width).
		Height(height).
		Padding(1, 2).
		Render(inner)
}

func truncateText(text string, maxLen int) string {
	if len(text) <= maxLen {
		return text
	}
	return text[:maxLen] + "..."
}

func calcDictationScore(input, reference string) int {
	normalize := func(s string) []string {
		s = strings.ToLower(s)
		var b strings.Builder
		for _, r := range s {
			if unicode.IsLetter(r) || unicode.IsDigit(r) || unicode.IsSpace(r) {
				b.WriteRune(r)
			}
		}
		words := strings.Fields(b.String())
		return words
	}

	inputWords := normalize(input)
	refWords := normalize(reference)

	if len(refWords) == 0 {
		return 0
	}

	matched := 0
	limit := int(math.Min(float64(len(inputWords)), float64(len(refWords))))
	for i := 0; i < limit; i++ {
		if inputWords[i] == refWords[i] {
			matched++
		}
	}

	score := int(math.Round(float64(matched) / float64(len(refWords)) * 100))
	if score > 100 {
		score = 100
	}
	return score
}
