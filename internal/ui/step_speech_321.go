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
	title := styleStepTitle.Foreground(colorRed).Render("Step 5: Speech — スピーチ解析")

	feedbackHeight := height - 14
	if feedbackHeight < 4 {
		feedbackHeight = 4
	}

	var inputSection string
	if m.speechInputMode {
		inputSection = styleInput.Width(width - 8).Render(
			"> " + m.speechInput + "█",
		)
	} else if m.speechInput != "" {
		inputSection = lipgloss.NewStyle().
			Background(colorBgDark).
			Foreground(colorFg).
			Padding(0, 2).
			Width(width - 8).
			Render("Your speech: " + m.speechInput)
	} else {
		inputSection = lipgloss.NewStyle().
			Background(colorBgDark).
			Foreground(colorFgDim).
			Padding(0, 2).
			Width(width - 8).
			Render("Press 'i' to enter your speech text...")
	}

	var feedbackContent string
	if m.speechLoading {
		feedbackContent = styleDimCenter.Render("⏳ Analyzing your speech...")
	} else if m.speechFeedback != "" {
		lines := strings.Split(m.speechFeedback, "\n")
		offset := m.speechScrollOffset
		if offset >= len(lines) {
			offset = len(lines) - 1
		}
		if offset < 0 {
			offset = 0
		}
		feedbackContent = strings.Join(lines[offset:], "\n")
	} else {
		feedbackContent = lipgloss.NewStyle().Foreground(colorFgDim).
			Render("英語でスピーチを入力し、Enter を押すと Gemini が自動解析します。\n\n文法修正・語彙提案・改善例を表示します。")
	}

	feedbackBox := lipgloss.NewStyle().
		Background(colorBgMid).
		BorderStyle(lipgloss.RoundedBorder()).
		BorderForeground(colorBorderAlt).
		Padding(1, 2).
		Width(width - 8).
		Height(feedbackHeight).
		Render(feedbackContent)

	hint := styleHint.Render("i: スピーチ入力 | Enter: 解析開始 | g: 再解析 | j/k: スクロール | Esc: キャンセル")

	inner := lipgloss.JoinVertical(lipgloss.Left,
		title,
		lipgloss.NewStyle().Background(colorBg).PaddingTop(1).Render(inputSection),
		lipgloss.NewStyle().Background(colorBg).PaddingTop(1).Render(feedbackBox),
		lipgloss.NewStyle().Background(colorBg).PaddingTop(1).Render(hint),
	)

	return lipgloss.NewStyle().
		Background(colorBg).
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
		pathLine := lipgloss.NewStyle().Background(colorBg).Foreground(colorFgDim).Render(fmt.Sprintf("📁 %s", m.image321Path))
		content = lipgloss.JoinVertical(lipgloss.Left, pathLine, m.image321Preview)
	} else if m.image321Path != "" {
		preview := renderTerminalImage(m.image321Path, width-12, height-10)
		pathLine := lipgloss.NewStyle().Background(colorBg).Foreground(colorFgDim).Render(fmt.Sprintf("📁 %s", m.image321Path))
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
		lipgloss.NewStyle().Background(colorBg).PaddingTop(1).Render(content),
		lipgloss.NewStyle().Background(colorBg).PaddingTop(1).Render(hint),
	)

	return lipgloss.NewStyle().
		Background(colorBg).
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
