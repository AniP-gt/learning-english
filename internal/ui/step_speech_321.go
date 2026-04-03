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
	cw := width - 4
	outerStyle := lipgloss.NewStyle().
		Background(colorBg).
		Width(width).
		Padding(1, 2)
	innerHeight := max(1, height-outerStyle.GetVerticalFrameSize())

	title := styleStepTitle.Foreground(colorRed).Width(cw).Render("Step 5: Speech — スピーチ解析")

	// format seconds as MM:SS for clearer readability
	mins := m.speechSecondsLeft / 60
	secs := m.speechSecondsLeft % 60
	countdownLabel := fmt.Sprintf("⏱ %02d:%02d", mins, secs)
	countdownColor := colorBlue
	if m.speechRecording {
		countdownLabel = fmt.Sprintf("🎙 %02d:%02d remaining", mins, secs)
		// when nearing the end, draw attention with yellow; otherwise red while recording
		if m.speechSecondsLeft <= 10 {
			countdownColor = colorYellow
		} else {
			countdownColor = colorRed
		}
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
		inputPreview := sliceVisibleLines(
			wrapPlainTextLines("Your speech: "+m.speechInput, width-12),
			0,
			2,
		)
		inputSection = lipgloss.NewStyle().
			Background(colorBgDark).
			Foreground(colorFg).
			Padding(0, 2).
			Width(width - 8).
			Render(inputPreview)
	} else {
		inputSection = lipgloss.NewStyle().
			Background(colorBgDark).
			Foreground(colorFgDim).
			Padding(0, 2).
			Width(width - 8).
			Render("Press 'i' to enter your speech text...")
	}

	transcriptBoxStyle := lipgloss.NewStyle().
		Background(colorBgMid).
		BorderStyle(lipgloss.RoundedBorder()).
		BorderForeground(colorBorderAlt).
		Padding(1, 2)
	feedbackBoxStyle := lipgloss.NewStyle().
		Background(colorBgMid).
		BorderStyle(lipgloss.RoundedBorder()).
		BorderForeground(colorBorderAlt).
		Padding(1, 2)

	hint := styleHint.Width(cw).Render("r: 60秒録音 | p: 再生 | i: テキスト入力 | Enter/g: 解析 | j/k: スクロール | Esc: キャンセル")

	contentAreaHeight := innerHeight
	baseHeight := lipgloss.Height(title) +
		lipgloss.Height(controlPanel) +
		lipgloss.Height(renderSpeechAudioPathLine(width, m.speechAudioPath)) +
		lipgloss.Height(inputSection) +
		lipgloss.Height(hint) +
		6

	remainingBoxHeight := max(10, contentAreaHeight-baseHeight)
	minBoxHeight := transcriptBoxStyle.GetVerticalFrameSize() + 1
	transcriptHeight := min(8, max(minBoxHeight, remainingBoxHeight/3))
	feedbackHeight := max(minBoxHeight, remainingBoxHeight-transcriptHeight)

	transcriptContent := lipgloss.NewStyle().Foreground(colorFgDim).Render("Record speech with 'r' to create a transcript automatically.")
	if m.speechTranscript != "" {
		transcriptWidth := visibleBoxWidth(transcriptBoxStyle, width-8)
		transcriptVisible := visibleBoxLines(transcriptBoxStyle, transcriptHeight)
		transcriptContent = sliceVisibleLines(
			wrapPlainTextLines(m.speechTranscript, transcriptWidth),
			0,
			transcriptVisible,
		)
	}
	if m.speechLoading {
		transcriptContent = styleDimCenter.Render("⏳ Transcribing recorded audio...")
	}

	transcriptBox := transcriptBoxStyle.
		Width(width - 8).
		Height(transcriptHeight).
		Render(
			lipgloss.NewStyle().Background(colorBgMid).Foreground(colorBlue).Bold(true).Render("Transcript") + "\n" +
				transcriptContent,
		)

	var feedbackContent string
	if m.speechLoading {
		feedbackContent = styleDimCenter.Render("⏳ Preparing Gemini feedback...")
	} else if m.speechFeedback != "" {
		feedbackBoxWidth := width - 8
		feedbackInnerWidth := visibleBoxWidth(feedbackBoxStyle, feedbackBoxWidth)
		visible := visibleBoxLines(feedbackBoxStyle, feedbackHeight)
		lines := wrapPlainTextLines(m.speechFeedback, feedbackInnerWidth)
		feedbackContent = sliceVisibleLines(lines, m.speechScrollOffset, visible)
	} else {
		feedbackContent = lipgloss.NewStyle().Foreground(colorFgDim).
			Render("英語でスピーチを入力し、Enter を押すと Gemini が自動解析します。\n\n文法修正・語彙提案・改善例を表示します。")
	}

	feedbackBox := feedbackBoxStyle.
		Width(width - 8).
		Height(feedbackHeight).
		Render(feedbackContent)

	inner := lipgloss.JoinVertical(lipgloss.Left,
		title,
		bgLine(cw).PaddingTop(1).Render(controlPanel),
		bgLine(cw).PaddingTop(1).Render(renderSpeechAudioPathLine(width, m.speechAudioPath)),
		bgLine(cw).PaddingTop(1).Render(transcriptBox),
		bgLine(cw).PaddingTop(1).Render(inputSection),
		bgLine(cw).PaddingTop(1).Render(feedbackBox),
		bgLine(cw).PaddingTop(1).Render(hint),
	)

	rendered := outerStyle.
		Height(innerHeight).
		Render(inner)

	return cropRenderedHeight(rendered, height)
}

func renderSpeechAudioPathLine(width int, path string) string {
	return lipgloss.NewStyle().
		Background(colorBg).
		Foreground(colorFgDim).
		Width(width - 8).
		Render("📁 Audio: " + speechPathLabel(path))
}

func speechPathLabel(path string) string {
	if strings.TrimSpace(path) == "" {
		return "(none yet)"
	}
	return path
}

func (m Model) render321Step(width, height int) string {
	cw := width - 4
	title := styleStepTitle.Foreground(colorOrange).Width(cw).Render("Step 6: 3-2-1 — 画像想起訓練")

	var content string
	if m.scene321Loading {
		content = styleDimCenter.Width(cw).Render("⏳ Gemini 2.5 Flash Image で画像生成中...")
	} else if m.image321Preview != "" {
		pathLine := lipgloss.NewStyle().Background(colorBg).Foreground(colorFgDim).Width(cw).Render(fmt.Sprintf("📁 %s", m.image321Path))
		content = lipgloss.JoinVertical(lipgloss.Left, pathLine, m.image321Preview)
	} else if m.image321Path != "" {
		preview := renderTerminalImage(m.image321Path, width-12, height-10)
		pathLine := lipgloss.NewStyle().Background(colorBg).Foreground(colorFgDim).Width(cw).Render(fmt.Sprintf("📁 %s", m.image321Path))
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

	hint := styleHint.Width(cw).Render("g: Gemini 2.5 Flash Image で画像生成 (Step 5 完了後) | r: 画像再描画")

	inner := lipgloss.JoinVertical(lipgloss.Left,
		title,
		bgLine(cw).PaddingTop(1).Render(content),
		bgLine(cw).PaddingTop(1).Render(hint),
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
