package ui

import (
	"fmt"
	"os/exec"
	"runtime"
	"strconv"

	"github.com/charmbracelet/lipgloss"
)

func playSay(text string, speed int) {
	if runtime.GOOS != "darwin" {
		return
	}
	cmd := exec.Command("say", "-r", strconv.Itoa(speed), text)
	_ = cmd.Run()
}

func (m Model) renderListeningStep(width, height int) string {
	title := styleStepTitle.Foreground(colorPurple).Render("Step 4: Listening — say/WebTTS")

	speedBar := fmt.Sprintf("Rate: %d wpm", m.listeningSpeed)

	var playBtn string
	if !m.listeningPlaying {
		playBtn = lipgloss.NewStyle().
			Background(colorPurple).
			Foreground(colorBg).
			Bold(true).
			Padding(1, 4).
			Render("▶  PLAY")
	} else {
		playBtn = lipgloss.NewStyle().
			Background(colorRed).
			Foreground(colorBg).
			Bold(true).
			Padding(1, 4).
			Render("■  STOP")
	}

	terminalBox := lipgloss.NewStyle().
		Background(colorBgMid).
		Foreground(colorFg).
		Padding(1, 2).
		BorderStyle(lipgloss.NormalBorder()).
		BorderForeground(colorBorderAlt).
		Width(width - 8).
		Render(
			lipgloss.NewStyle().Foreground(colorBlue).Bold(true).Render("Terminal:") + "\n" +
				lipgloss.NewStyle().Foreground(colorGreen).Render(
					fmt.Sprintf(`$ say -r %d "%s..."`, m.listeningSpeed, truncateText(m.listeningText, 40)),
				),
		)

	controlPanel := lipgloss.NewStyle().
		Background(colorBgDark).
		Padding(1, 2).
		BorderStyle(lipgloss.RoundedBorder()).
		BorderForeground(colorBorderAlt).
		Width(width - 8).
		Render(lipgloss.JoinVertical(lipgloss.Left,
			lipgloss.NewStyle().Background(colorBgDark).Foreground(colorFgDim).Render(speedBar),
			lipgloss.NewStyle().Background(colorBgDark).PaddingTop(1).Render(playBtn),
		))

	hint := styleHint.Render("s/SPACE: 再生 | +/-: 速度変更 | g: テキスト更新")

	inner := lipgloss.JoinVertical(lipgloss.Left,
		title,
		lipgloss.NewStyle().Background(colorBg).PaddingTop(1).Render(controlPanel),
		lipgloss.NewStyle().Background(colorBg).PaddingTop(1).Render(terminalBox),
		lipgloss.NewStyle().Background(colorBg).PaddingTop(1).Render(hint),
	)

	return lipgloss.NewStyle().
		Background(colorBg).
		Width(width).
		Height(height).
		Padding(1, 2).
		Render(inner)
}

func truncateText(text string, maxLen int) string {
	if len(text) <= maxLen {
		return text
	}
	return text[:maxLen]
}
