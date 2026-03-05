package ui

import (
	"fmt"

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
		content = lipgloss.JoinVertical(lipgloss.Left, responseBox, hint)
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

	var content string
	if m.wordsLoading {
		content = styleDimCenter.Width(width - 4).Render("⏳ Gemini が単語リストを生成中...")
	} else if m.words != "" {
		content = styleContentBox.Width(width - 8).Render(m.words)
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
