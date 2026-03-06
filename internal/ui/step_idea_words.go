package ui

import (
	"fmt"
	"strings"

	"github.com/charmbracelet/lipgloss"
)

func (m Model) renderIdeaStep(width, height int) string {
	title := styleStepTitle.Render("Step 1: Idea — 日本語ネタ出し")

	var content string
	if m.ideaMode {
		prompt := styleInput.Width(width - 8).Render(
			"日本語で話したいトピックを入力してください:\n\n> " + m.ideaInput + "█",
		)
		hint := styleHint.Render("Enter: 送信 | Esc: キャンセル")
		content = lipgloss.JoinVertical(lipgloss.Left, prompt, hint)
	} else if m.loading {
		content = styleDimCenter.Width(width - 4).Render("⏳ Gemini が生成中...")
	} else if m.ideaResponse != "" {
		responseBox := styleContentBox.Width(width - 8).Render(m.ideaResponse)
		hint := styleHint.Render("i: 再入力 | g: Gemini再生成 | 2: Wordsへ進む")
		var extra string
		if m.wordsLoading {
			extra = styleDimCenter.Width(width - 4).Render("⏳ Words & Reading を生成中...")
		} else if m.words != "" && m.readingLoaded {
			extra = styleHint.Foreground(colorGreen).Render("✓ Words & Reading 生成済み")
		}
		content = lipgloss.JoinVertical(lipgloss.Left, responseBox, hint, extra)
	} else {
		hint := styleHint.Render("i: 日本語入力開始 | g: Gemini API (GEMINI_API_KEY必要)")
		placeholder := styleContentBox.Width(width - 8).
			Foreground(colorFgDim).
			Render("日本語で話したいことを何でも書いてください。\n\n例: 最近コーヒーにハマっていて、毎朝豆を挽いている。ポアオーバーの技術を磨きたい。")
		content = lipgloss.JoinVertical(lipgloss.Left, placeholder, hint)
	}

	if m.ideaInput != "" && !m.ideaMode && !m.loading {
		inputPreview := lipgloss.NewStyle().
			Foreground(colorYellow).
			Padding(0, 1).
			Render(fmt.Sprintf("入力: %s", m.ideaInput))
		content = lipgloss.JoinVertical(lipgloss.Left, inputPreview, content)
	}

	inner := lipgloss.JoinVertical(lipgloss.Left,
		title,
		lipgloss.NewStyle().Padding(1, 0).Render(content),
	)

	return lipgloss.NewStyle().
		Width(width).
		Height(height).
		Padding(1, 2).
		Render(inner)
}

func (m Model) renderWordsStep(width, height int) string {
	title := styleStepTitle.Foreground(colorYellow).Render("Step 2: Words — 単語帳作成")

	if m.flashcardMode {
		return m.renderFlashcardMode(width, height)
	}

	if m.wordsEditMode {
		return m.renderWordsEditMode(width, height)
	}

	var content string
	if m.wordsLoading {
		content = styleDimCenter.Width(width - 4).Render("⏳ Gemini が単語リストを生成中...")
	} else if m.words != "" {
		var hint string
		if len(m.parsedWords) > 0 {
			hint = styleHint.Render(fmt.Sprintf("g: 再生成 | f: フラッシュカードモード (%d 単語)", len(m.parsedWords)))
		} else {
			hint = styleHint.Render("g: 再生成")
		}
		content = lipgloss.JoinVertical(lipgloss.Left,
			styleContentBox.Width(width-8).Render(m.words),
			hint,
		)
	} else {
		content = lipgloss.JoinVertical(lipgloss.Left,
			styleContentBox.Width(width-8).
				Foreground(colorFgDim).
				Render("単語リストがまだありません。\n\nStep 1 でトピックを生成してから 'g' を押してください。\n\n例:\n| Word | Translation | Example |\n|------|-------------|---------||\n| coffee | コーヒー | I love coffee every morning. |\n| aroma | 香り | The aroma is wonderful. |"),
			styleHint.Render("g: Gemini で単語生成 (Step 1 完了後)"),
		)
	}

	inner := lipgloss.JoinVertical(lipgloss.Left,
		title,
		lipgloss.NewStyle().Padding(1, 0).Render(content),
	)

	return lipgloss.NewStyle().
		Width(width).
		Height(height).
		Padding(1, 2).
		Render(inner)
}

func (m Model) renderFlashcardMode(width, height int) string {
	n := len(m.parsedWords)
	if n == 0 {
		return styleDimCenter.Width(width).Height(height).Render("単語がありません")
	}

	card := m.parsedWords[m.flashcardIndex]
	checked := m.flashcardChecked[m.flashcardIndex]

	checkedCount := 0
	for _, c := range m.flashcardChecked {
		if c {
			checkedCount++
		}
	}

	progressBar := buildProgressBar(m.flashcardChecked, width-8)

	var checkMark string
	if checked {
		checkMark = lipgloss.NewStyle().Foreground(colorGreen).Bold(true).Render("✓ 覚えた!")
	} else {
		checkMark = lipgloss.NewStyle().Foreground(colorFgDim).Render("○ まだ")
	}

	counter := lipgloss.NewStyle().Foreground(colorFgDim).
		Render(fmt.Sprintf("%d / %d  (覚えた: %d)", m.flashcardIndex+1, n, checkedCount))

	var cardFace string
	cardWidth := width - 12
	if cardWidth < 20 {
		cardWidth = 20
	}

	if !m.flashcardFlipped {
		label := lipgloss.NewStyle().Foreground(colorFgDim).Italic(true).Render("English")
		word := lipgloss.NewStyle().
			Foreground(colorBlue).
			Bold(true).
			Width(cardWidth).
			Align(lipgloss.Center).
			Render(card.word)
		cardFace = lipgloss.JoinVertical(lipgloss.Center, label, word)
	} else {
		label := lipgloss.NewStyle().Foreground(colorFgDim).Italic(true).Render("日本語")
		trans := lipgloss.NewStyle().
			Foreground(colorYellow).
			Bold(true).
			Width(cardWidth).
			Align(lipgloss.Center).
			Render(card.translation)
		var ex string
		if card.example != "" {
			ex = lipgloss.NewStyle().
				Foreground(colorFgDim).
				Width(cardWidth).
				Align(lipgloss.Center).
				Render(card.example)
		}
		cardFace = lipgloss.JoinVertical(lipgloss.Center, label, trans, ex)
	}

	cardBorderColor := colorBorderAlt
	if checked {
		cardBorderColor = colorGreen
	}

	cardBox := lipgloss.NewStyle().
		Background(colorBgHigher).
		Foreground(colorFg).
		Padding(2, 4).
		BorderStyle(lipgloss.RoundedBorder()).
		BorderForeground(cardBorderColor).
		Width(cardWidth).
		Align(lipgloss.Center).
		Render(cardFace)

	hint := styleHint.Render("Space: 裏返す  ←/→: 前後  K: 覚えた  s: 発音  r: リセット  Esc: 戻る")

	title := styleStepTitle.Foreground(colorYellow).Render("Step 2: Words — フラッシュカード")

	inner := lipgloss.JoinVertical(lipgloss.Left,
		title,
		lipgloss.NewStyle().Padding(1, 0).Render(
			lipgloss.JoinVertical(lipgloss.Center,
				counter,
				lipgloss.NewStyle().Padding(1, 0).Render(cardBox),
				checkMark,
				lipgloss.NewStyle().PaddingTop(1).Render(progressBar),
				lipgloss.NewStyle().PaddingTop(1).Render(hint),
			),
		),
	)

	return lipgloss.NewStyle().
		Width(width).
		Height(height).
		Padding(1, 2).
		Render(inner)
}

func buildProgressBar(checked []bool, width int) string {
	n := len(checked)
	if n == 0 || width <= 0 {
		return ""
	}
	bar := strings.Builder{}
	for _, c := range checked {
		if c {
			bar.WriteString(lipgloss.NewStyle().Foreground(colorGreen).Render("█"))
		} else {
			bar.WriteString(lipgloss.NewStyle().Foreground(colorFgDim).Render("░"))
		}
	}
	return bar.String()
}
