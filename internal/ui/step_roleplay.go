package ui

import (
	"github.com/charmbracelet/lipgloss"
)

func (m Model) renderReplyStep(width, height int) string {
	title := styleStepTitle.Foreground(colorBlue).Render("Step 7: Reply — チャット会話")

	chatHeight := height - 14
	if chatHeight < 4 {
		chatHeight = 4
	}

	var chatLines []string
	for _, msg := range m.replyMessages {
		if msg.role == "user" {
			label := styleUserChat.Render("You: ")
			text := lipgloss.NewStyle().Foreground(colorFg).Render(msg.content)
			chatLines = append(chatLines, label+text)
		} else {
			label := styleAssistantChat.Render("Gemini: ")
			text := lipgloss.NewStyle().Foreground(colorFg).Render(msg.content)
			chatLines = append(chatLines, label+text)
		}
		chatLines = append(chatLines, "")
	}

	if m.replyLoading {
		chatLines = append(chatLines, styleDimCenter.Render("⏳ Responding..."))
	}

	var chatContent string
	if len(chatLines) == 0 {
		chatContent = lipgloss.NewStyle().Foreground(colorFgDim).
			Render("英語でメッセージを送るには 'i' を押してください。\n\nGemini が返答し、自動で音声読み上げします。\n's' でもう一度聴けます。'g' で直前の発言のフィードバック。")
	} else {
		offset := m.replyScrollOffset
		if offset > len(chatLines)-1 {
			offset = len(chatLines) - 1
		}
		if offset < 0 {
			offset = 0
		}
		chatContent = lipgloss.JoinVertical(lipgloss.Left, chatLines[offset:]...)
	}

	chatBox := lipgloss.NewStyle().
		Background(colorBgMid).
		BorderStyle(lipgloss.RoundedBorder()).
		BorderForeground(colorBorderAlt).
		Padding(1, 2).
		Width(width - 8).
		Height(chatHeight).
		Render(chatContent)

	var inputSection string
	if m.replyInputMode {
		inputSection = styleInput.Width(width - 8).Render(
			"> " + m.replyInput + "█",
		)
	} else {
		inputSection = lipgloss.NewStyle().
			Background(colorBgDark).
			Foreground(colorFgDim).
			Padding(0, 2).
			Width(width - 8).
			Render("Press 'i' to type your message...")
	}

	var feedbackSection string
	if m.replyFeedback != "" {
		feedbackSection = lipgloss.NewStyle().
			Background(colorBgDark).
			Foreground(colorYellow).
			BorderStyle(lipgloss.NormalBorder()).
			BorderForeground(colorBorder).
			Padding(0, 2).
			Width(width - 8).
			Render(m.replyFeedback)
	}

	hint := styleHint.Render("i: 入力 | Enter: 送信 (Geminiが音声返答) | s: 再生 | g: フィードバック | j/k: スクロール | Esc: キャンセル")

	parts := []string{
		title,
		lipgloss.NewStyle().PaddingTop(1).Render(chatBox),
		lipgloss.NewStyle().PaddingTop(1).Render(inputSection),
	}
	if feedbackSection != "" {
		parts = append(parts, lipgloss.NewStyle().PaddingTop(1).Render(feedbackSection))
	}
	parts = append(parts, lipgloss.NewStyle().PaddingTop(1).Render(hint))

	inner := lipgloss.JoinVertical(lipgloss.Left, parts...)

	return lipgloss.NewStyle().
		Width(width).
		Height(height).
		Padding(1, 2).
		Render(inner)
}
