package ui

import (
	"strings"

	"github.com/charmbracelet/lipgloss"
)

func (m Model) renderReplyStep(width, height int) string {
	title := styleStepTitle.Foreground(colorBlue).Render("Step 7: Reply — チャット会話")

	chatHeight := height - 14
	if chatHeight < 4 {
		chatHeight = 4
	}

	chatBoxStyle := lipgloss.NewStyle().
		Background(colorBgMid).
		BorderStyle(lipgloss.RoundedBorder()).
		BorderForeground(colorBorderAlt).
		Padding(1, 2)
	chatBoxWidth := width - 8
	chatInnerWidth := visibleBoxWidth(chatBoxStyle, chatBoxWidth)
	visible := visibleBoxLines(chatBoxStyle, chatHeight)

	var chatLines []string
	for _, msg := range m.replyMessages {
		var label string
		if msg.role == "user" {
			label = styleUserChat.Render("You: ")
		} else {
			label = styleAssistantChat.Render("Gemini: ")
		}

		labelWidth := lipgloss.Width(label)
		messageWidth := max(1, chatInnerWidth-labelWidth)
		wrappedLines := wrapPlainTextLines(msg.content, messageWidth)
		for i, line := range wrappedLines {
			if i == 0 {
				chatLines = append(chatLines, label+line)
				continue
			}
			chatLines = append(chatLines, strings.Repeat(" ", labelWidth)+line)
		}
		chatLines = append(chatLines, "")
	}

	if m.replyLoading {
		chatLines = append(chatLines, styleDimCenter.Render("⏳ Responding..."))
	}

	var chatContent string
	if len(chatLines) == 0 {
		chatContent = lipgloss.NewStyle().Background(colorBgMid).Foreground(colorFgDim).
			Render("英語でメッセージを送るには 'i' を押してください。\n\nGemini が返答し、自動で音声読み上げします。\n's' でもう一度聴けます。'g' で直前の発言のフィードバック。")
	} else {
		chatContent = sliceVisibleLines(chatLines, m.replyScrollOffset, visible)
	}

	chatBox := chatBoxStyle.
		Width(chatBoxWidth).
		Height(chatHeight).
		Render(chatContent)

	var inputSection string
	if m.replyInputMode {
		inputSection = styleInput.Width(width - 8).Render(
			"> " + insertCursor(m.replyInput, m.replyCursor),
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
		lipgloss.NewStyle().Background(colorBg).PaddingTop(1).Render(chatBox),
		lipgloss.NewStyle().Background(colorBg).PaddingTop(1).Render(inputSection),
	}
	if feedbackSection != "" {
		parts = append(parts, lipgloss.NewStyle().Background(colorBg).PaddingTop(1).Render(feedbackSection))
	}
	parts = append(parts, lipgloss.NewStyle().Background(colorBg).PaddingTop(1).Render(hint))

	inner := lipgloss.JoinVertical(lipgloss.Left, parts...)

	return lipgloss.NewStyle().
		Background(colorBg).
		Width(width).
		Height(height).
		Padding(1, 2).
		Render(inner)
}
