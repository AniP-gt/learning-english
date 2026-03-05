package ui

import (
	"github.com/charmbracelet/lipgloss"
)

func (m Model) renderSpeechStep(width, height int) string {
	title := styleStepTitle.Foreground(colorRed).Render("Step 5: Speech — 録音/STT")

	var inputSection string
	if m.speechInputMode {
		inputSection = styleInput.Width(width - 8).Render(
			"スピーチテキストを入力してください:\n\n> " + m.speechInput + "█",
		)
	} else if m.speechInput != "" {
		inputSection = styleContentBox.Width(width - 8).Render(
			lipgloss.NewStyle().Foreground(colorGreen).Bold(true).Render("Your Speech:") +
				"\n\n" + m.speechInput,
		)
	} else {
		inputSection = styleContentBox.Width(width - 8).
			Foreground(colorFgDim).
			Render("スピーチテキストを入力するか、音声録音機能を使用してください。\n\n'i' を押してテキスト入力を開始してください。")
	}

	var feedbackSection string
	if m.speechLoading {
		feedbackSection = styleDimCenter.Width(width - 4).Render("⏳ Gemini が解析中...")
	} else if m.speechFeedback != "" {
		feedbackSection = lipgloss.NewStyle().PaddingTop(1).Render(
			styleContentBox.
				Width(width - 8).
				BorderForeground(colorGreen).
				Render(
					lipgloss.NewStyle().Foreground(colorGreen).Bold(true).Render("Gemini Feedback:") +
						"\n\n" + m.speechFeedback,
				),
		)
	}

	hint := styleHint.Render("i: テキスト入力 | g: Gemini解析 | Enter: 確定")

	inner := lipgloss.JoinVertical(lipgloss.Left,
		title,
		lipgloss.NewStyle().PaddingTop(1).Render(inputSection),
		feedbackSection,
		lipgloss.NewStyle().PaddingTop(1).Render(hint),
	)

	return lipgloss.NewStyle().
		Width(width).
		Height(height).
		Padding(1, 2).
		Render(inner)
}

func (m Model) render321Step(width, height int) string {
	title := styleStepTitle.Foreground(colorOrange).Render("Step 6: 3-2-1 — 画像想起訓練")

	var content string
	if m.scene321Loading {
		content = styleDimCenter.Width(width - 4).Render("⏳ Gemini がシーンを生成中...")
	} else if m.scene321 != "" {
		content = styleContentBox.Width(width - 8).Render(m.scene321)
	} else {
		content = styleContentBox.Width(width - 8).
			Foreground(colorFgDim).
			Render("Step 5 のスピーチから4コマ漫画のシーンを生成します。\n\n英文を日本語に訳さず「イメージ」で捉える訓練です。\n\n'g' を押してシーンを生成してください。")
	}

	hint := styleHint.Render("g: Gemini でシーン生成 (Step 5 完了後)")

	inner := lipgloss.JoinVertical(lipgloss.Left,
		title,
		lipgloss.NewStyle().PaddingTop(1).Render(content),
		lipgloss.NewStyle().PaddingTop(1).Render(hint),
	)

	return lipgloss.NewStyle().
		Width(width).
		Height(height).
		Padding(1, 2).
		Render(inner)
}
