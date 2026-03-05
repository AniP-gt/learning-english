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
