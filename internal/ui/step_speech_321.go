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

	feedbackHeight := height - 28
	if feedbackHeight < 4 {
		feedbackHeight = 4
	}

	countdownLabel := fmt.Sprintf("⏱ %ds", m.speechSecondsLeft)
	countdownColor := colorBlue
	if m.speechRecording {
		countdownLabel = fmt.Sprintf("🎙 %ds remaining", m.speechSecondsLeft)
		countdownColor = colorRed
	}

	recordingState := "Ready"
	if m.speechRecording {
		recordingState = "Recording..."
	} else if m.speechLoading {
		recordingState = "Transcribing & analyzing..."
	} else if m.speechAudioPath != "" {
		recordingState = "Saved"
	}

	availability := []string{}
	if m.speechCanRecord {
		availability = append(availability, "Mic: ready")
	} else {
		availability = append(availability, "Mic: unavailable")
	}
	if m.speechAudioPath != "" && m.speechCanPlay {
		availability = append(availability, "Playback: ready")
	} else if m.speechAudioPath != "" {
		availability = append(availability, "Playback: unavailable")
	} else {
		availability = append(availability, "Playback: no clip yet")
	}

	controlPanel := lipgloss.NewStyle().
		Background(colorBgDark).
		BorderStyle(lipgloss.RoundedBorder()).
		BorderForeground(colorBorderAlt).
		Padding(1, 2).
		Width(width - 8).
		Render(lipgloss.JoinVertical(lipgloss.Left,
			lipgloss.JoinHorizontal(lipgloss.Top,
				lipgloss.NewStyle().Background(colorBgDark).Foreground(colorFg).Bold(true).Render("Mic capture"),
				lipgloss.NewStyle().Background(colorBgDark).Foreground(countdownColor).Bold(true).PaddingLeft(2).Render(countdownLabel),
			),
			lipgloss.NewStyle().Background(colorBgDark).Foreground(colorFgDim).PaddingTop(1).Render("Status: "+recordingState),
			lipgloss.NewStyle().Background(colorBgDark).Foreground(colorFgDim).Render(strings.Join(availability, "  |  ")),
			lipgloss.NewStyle().Background(colorBgDark).Foreground(colorFgDim).PaddingTop(1).Render(m.speechAudioHint),
		))

	var inputSection string
	if m.speechInputMode {
		inputSection = styleInput.Width(width - 8).Render(
			"> " + insertCursor(m.speechInput, m.speechCursor),
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

	transcriptContent := lipgloss.NewStyle().Foreground(colorFgDim).Render("Record speech with 'r' to create a transcript automatically.")
	if m.speechTranscript != "" {
		transcriptContent = m.speechTranscript
	}
	if m.speechLoading {
		transcriptContent = styleDimCenter.Render("⏳ Transcribing recorded audio...")
	}

	transcriptBox := lipgloss.NewStyle().
		Background(colorBgMid).
		BorderStyle(lipgloss.RoundedBorder()).
		BorderForeground(colorBorderAlt).
		Padding(1, 2).
		Width(width - 8).
		Render(
			lipgloss.NewStyle().Background(colorBgMid).Foreground(colorBlue).Bold(true).Render("Transcript") + "\n" +
				transcriptContent,
		)

	var feedbackContent string
	if m.speechLoading {
		feedbackContent = styleDimCenter.Render("⏳ Preparing Gemini feedback...")
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

	audioPathLine := lipgloss.NewStyle().Background(colorBg).Foreground(colorFgDim).Render("📁 Audio: " + speechPathLabel(m.speechAudioPath))
	hint := styleHint.Render("r: 60秒録音 | p: 再生 | i: テキスト入力 | Enter/g: 解析 | j/k: スクロール | Esc: キャンセル")

	inner := lipgloss.JoinVertical(lipgloss.Left,
		title,
		lipgloss.NewStyle().Background(colorBg).PaddingTop(1).Render(controlPanel),
		lipgloss.NewStyle().Background(colorBg).PaddingTop(1).Render(audioPathLine),
		lipgloss.NewStyle().Background(colorBg).PaddingTop(1).Render(transcriptBox),
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

func speechPathLabel(path string) string {
	if strings.TrimSpace(path) == "" {
		return "(none yet)"
	}
	return path
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
