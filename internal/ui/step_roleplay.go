package ui

import (
	"fmt"

	"github.com/charmbracelet/lipgloss"
)

func (m Model) renderRoleplayStep(width, height int) string {
	title := styleStepTitle.Foreground(colorBlue).Render("Step 7: Roleplay — Gemini Chat")
	roleInfo := lipgloss.NewStyle().
		Foreground(colorYellow).
		Render(fmt.Sprintf("Role: %s", m.roleplayRole))

	chatHeight := height - 10
	if chatHeight < 4 {
		chatHeight = 4
	}

	var chatLines []string
	for _, msg := range m.roleplayMessages {
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

	if m.roleplayLoading {
		chatLines = append(chatLines, styleDimCenter.Render("⏳ Responding..."))
	}

	var chatContent string
	if len(chatLines) == 0 {
		chatContent = lipgloss.NewStyle().Foreground(colorFgDim).
			Render("会話を開始するには 'i' を押してください。\n\nGemini が相手役になって英会話の練習ができます。")
	} else {
		chatContent = lipgloss.JoinVertical(lipgloss.Left, chatLines...)
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
	if m.roleplayInputMode {
		inputSection = styleInput.Width(width - 8).Render(
			"> " + m.roleplayInput + "█",
		)
	} else {
		placeholder := lipgloss.NewStyle().
			Background(colorBgDark).
			Foreground(colorFgDim).
			Padding(0, 2).
			Width(width - 8).
			Render("Press 'i' to type your message...")
		inputSection = placeholder
	}

	hint := styleHint.Render("i: 入力開始 | Enter: 送信 | Esc: キャンセル | q: 終了")

	inner := lipgloss.JoinVertical(lipgloss.Left,
		title,
		lipgloss.NewStyle().PaddingTop(0).Render(roleInfo),
		lipgloss.NewStyle().PaddingTop(1).Render(chatBox),
		lipgloss.NewStyle().PaddingTop(1).Render(inputSection),
		lipgloss.NewStyle().PaddingTop(1).Render(hint),
	)

	return lipgloss.NewStyle().
		Width(width).
		Height(height).
		Padding(1, 2).
		Render(inner)
}
