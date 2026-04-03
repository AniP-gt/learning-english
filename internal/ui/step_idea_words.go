package ui

import (
	"fmt"
	"strings"

	"github.com/charmbracelet/lipgloss"
)

func (m Model) renderIdeaStep(width, height int) string {
	cw := width - 4 // content width inside Padding(1,2)
	title := styleStepTitle.Width(cw).Render("Step 1: Idea — 日本語ネタ出し")

	var content string
	if m.ideaMode {
		prompt := styleInput.Width(width - 8).Render(
			"日本語で話したいトピックを入力してください:\n\n> " + insertCursor(m.ideaInput, m.ideaCursor),
		)
		hint := styleHint.Width(cw).Render("Enter: 送信 | Esc: キャンセル")
		content = lipgloss.JoinVertical(lipgloss.Left, prompt, hint)
	} else if m.loading {
		content = styleDimCenter.Width(cw).Render("⏳ Gemini が生成中...")
	} else if m.ideaResponse != "" {
		responseBox := styleContentBox.Width(width - 8).Render(m.ideaResponse)
		hint := styleHint.Width(cw).Render("i: 再入力 | g: Gemini再生成 | 2: Wordsへ進む")
		var extra string
		if m.wordsLoading {
			extra = styleDimCenter.Width(cw).Render("⏳ Words & Reading を生成中...")
		} else if m.words != "" && m.readingLoaded {
			extra = styleHint.Foreground(colorGreen).Width(cw).Render("✓ Words & Reading 生成済み")
		}
		content = lipgloss.JoinVertical(lipgloss.Left, responseBox, hint, extra)
	} else {
		hint := styleHint.Width(cw).Render("i: 日本語入力開始 | g: Gemini API (GEMINI_API_KEY必要)")
		placeholder := styleContentBox.Width(width - 8).
			Foreground(colorFgDim).
			Render("日本語で話したいことを何でも書いてください。\n\n例: 最近コーヒーにハマっていて、毎朝豆を挽いている。ポアオーバーの技術を磨きたい。")
		content = lipgloss.JoinVertical(lipgloss.Left, placeholder, hint)
	}

	if m.ideaInput != "" && !m.ideaMode && !m.loading {
		inputPreview := lipgloss.NewStyle().
			Background(colorBg).
			Foreground(colorYellow).
			Padding(0, 1).
			Width(cw).
			Render(fmt.Sprintf("入力: %s", m.ideaInput))
		content = lipgloss.JoinVertical(lipgloss.Left, inputPreview, content)
	}

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

func (m Model) renderWordsStep(width, height int) string {
	cw := width - 4
	title := styleStepTitle.Foreground(colorYellow).Width(cw).Render("Step 2: Words — 単語帳作成")

	if m.flashcardMode {
		return m.renderFlashcardMode(width, height)
	}

	if m.wordsEditMode {
		return m.renderWordsEditMode(width, height)
	}

	var content string
	if m.wordsLoading {
		content = styleDimCenter.Width(cw).Render("⏳ Gemini が単語リストを生成中...")
	} else if m.words != "" {
		var hint string
		if len(m.parsedWords) > 0 {
			hint = styleHint.Width(cw).Render(fmt.Sprintf("g: 再生成 | e: 編集モード | f: フラッシュカードモード (%d 単語)", len(m.parsedWords)))
		} else {
			hint = styleHint.Width(cw).Render("g: 再生成 | e: 編集モード")
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
			styleHint.Width(cw).Render("g: Gemini で単語生成 (Step 1 完了後) | e: 編集モードで手動追加"),
		)
	}

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

func (m Model) renderFlashcardMode(width, height int) string {
	cw := width - 4
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
		checkMark = lipgloss.NewStyle().Background(colorBg).Foreground(colorGreen).Bold(true).Render("✓ 覚えた!")
	} else {
		checkMark = lipgloss.NewStyle().Background(colorBg).Foreground(colorFgDim).Render("○ まだ")
	}

	counter := lipgloss.NewStyle().Background(colorBg).Foreground(colorFgDim).
		Render(fmt.Sprintf("%d / %d  (覚えた: %d)", m.flashcardIndex+1, n, checkedCount))

	var cardFace string
	cardWidth := width - 12
	if cardWidth < 20 {
		cardWidth = 20
	}

	if !m.flashcardFlipped {
		label := lipgloss.NewStyle().Background(colorBg).Foreground(colorFgDim).Italic(true).Render("English")
		word := lipgloss.NewStyle().
			Background(colorBgHigher).
			Foreground(colorBlue).
			Bold(true).
			Width(cardWidth).
			Align(lipgloss.Center).
			Render(card.word)
		cardFace = lipgloss.JoinVertical(lipgloss.Center, label, word)
	} else {
		label := lipgloss.NewStyle().Background(colorBg).Foreground(colorFgDim).Italic(true).Render("日本語")
		trans := lipgloss.NewStyle().
			Background(colorBgHigher).
			Foreground(colorYellow).
			Bold(true).
			Width(cardWidth).
			Align(lipgloss.Center).
			Render(card.translation)
		var ex string
		if card.example != "" {
			ex = lipgloss.NewStyle().
				Background(colorBgHigher).
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

	hint := styleHint.Width(cw).Render("Space: 裏返す  ←/→: 前後  K: 覚えた  s: 発音  r: リセット  Esc: 戻る")

	title := styleStepTitle.Foreground(colorYellow).Width(cw).Render("Step 2: Words — フラッシュカード")

	inner := lipgloss.JoinVertical(lipgloss.Left,
		title,
		bgLine(cw).Padding(1, 0).Render(
			lipgloss.JoinVertical(lipgloss.Center,
				counter,
				bgLine(cw).Padding(1, 0).Render(cardBox),
				checkMark,
				bgLine(cw).PaddingTop(1).Render(progressBar),
				bgLine(cw).PaddingTop(1).Render(hint),
			),
		),
	)

	return lipgloss.NewStyle().
		Background(colorBg).
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
			bar.WriteString(lipgloss.NewStyle().Background(colorBg).Foreground(colorGreen).Render("█"))
		} else {
			bar.WriteString(lipgloss.NewStyle().Background(colorBg).Foreground(colorFgDim).Render("░"))
		}
	}
	return bar.String()
}
