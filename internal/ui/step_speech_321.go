package ui

import (
	"bytes"
	"fmt"
	"image"
	_ "image/jpeg"
	_ "image/png"
	"os"
	"strings"

	termimg "github.com/blacktop/go-termimg"
	"github.com/charmbracelet/lipgloss"
)

func (m Model) renderSpeechStep(width, height int) string {
	title := styleStepTitle.Foreground(colorRed).Render("Step 5: Speech — Chat & Analysis")

	chatHeight := height - 12
	if chatHeight < 4 {
		chatHeight = 4
	}

	var chatLines []string
	for _, msg := range m.speechMessages {
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

	if m.speechLoading {
		chatLines = append(chatLines, styleDimCenter.Render("⏳ Responding..."))
	}

	var chatContent string
	if len(chatLines) == 0 {
		chatContent = lipgloss.NewStyle().Foreground(colorFgDim).
			Render("英語でメッセージを送るには 'i' を押してください。\n\nGeminiが会話相手になります。返答は自動で読み上げられます。\n's' でもう一度聴けます。'g' でスピーチ解析。")
	} else {
		totalLines := len(chatLines)
		offset := m.speechScrollOffset
		if offset > totalLines-1 {
			offset = totalLines - 1
		}
		if offset < 0 {
			offset = 0
		}
		visible := chatLines[offset:]
		chatContent = lipgloss.JoinVertical(lipgloss.Left, visible...)
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
	if m.speechChatInputMode {
		inputSection = styleInput.Width(width - 8).Render(
			"> " + m.speechChatInput + "█",
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

	hint := styleHint.Render("i: 入力 | Enter: 送信 | s: 再生 | g: スピーチ解析 | j/k: スクロール | Esc: キャンセル")

	inner := lipgloss.JoinVertical(lipgloss.Left,
		title,
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

func (m Model) render321Step(width, height int) string {
	title := styleStepTitle.Foreground(colorOrange).Render("Step 6: 3-2-1 — 画像想起訓練")

	var content string
	if m.scene321Loading {
		content = styleDimCenter.Width(width - 4).Render("⏳ Gemini 2.5 Flash Image で画像生成中...")
	} else if m.image321Preview != "" {
		pathLine := lipgloss.NewStyle().Foreground(colorFgDim).Render(fmt.Sprintf("📁 %s", m.image321Path))
		content = lipgloss.JoinVertical(lipgloss.Left, pathLine, m.image321Preview)
	} else if m.image321Path != "" {
		preview := renderTerminalImage(m.image321Path, width-12, height-10)
		pathLine := lipgloss.NewStyle().Foreground(colorFgDim).Render(fmt.Sprintf("📁 %s", m.image321Path))
		if preview != "" {
			content = lipgloss.JoinVertical(lipgloss.Left, pathLine, preview)
		} else {
			content = styleContentBox.Width(width - 8).Render(
				lipgloss.NewStyle().Foreground(colorGreen).Bold(true).Render("Image saved:") +
					"\n\n" + m.image321Path +
					"\n\n" + lipgloss.NewStyle().Foreground(colorFgDim).Render("(ターミナルが画像プロトコルをサポートしていません。iTerm2/Kitty/Ghosttyをお使いください)"),
			)
		}
	} else {
		content = styleContentBox.Width(width - 8).
			Foreground(colorFgDim).
			Render("Step 5 のスピーチから画像を生成します。\n\n英文を日本語に訳さず「イメージ」で捉える訓練です。\n\n'g' を押して Gemini 2.5 Flash Image で画像を生成してください。")
	}

	hint := styleHint.Render("g: Gemini 2.5 Flash Image で画像生成 (Step 5 完了後) | r: 画像再描画")

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

func renderTerminalImage(path string, cols, rows int) string {
	if path == "" {
		return ""
	}

	raw, err := os.ReadFile(path)
	if err != nil {
		return ""
	}

	img, _, err := image.Decode(bytes.NewReader(raw))
	if err != nil {
		return ""
	}

	if cols <= 0 {
		cols = 60
	}
	if rows <= 0 {
		rows = 20
	}

	widget := termimg.NewImageWidgetFromImage(img).
		SetSize(cols, rows).
		SetProtocol(termimg.Auto)

	rendered, err := widget.Render()
	if err != nil {
		return renderHalfblockFallback(img, cols, rows)
	}

	if strings.TrimSpace(rendered) == "" {
		return renderHalfblockFallback(img, cols, rows)
	}

	return rendered
}

func renderHalfblockFallback(img image.Image, cols, rows int) string {
	widget := termimg.NewImageWidgetFromImage(img).
		SetSize(cols, rows).
		SetProtocol(termimg.Halfblocks)

	rendered, err := widget.Render()
	if err != nil {
		return ""
	}
	return rendered
}
