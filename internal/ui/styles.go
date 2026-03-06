package ui

import "github.com/charmbracelet/lipgloss"

var (
	colorBg        = lipgloss.Color("#1a1b26")
	colorBgDark    = lipgloss.Color("#16161e")
	colorBgMid     = lipgloss.Color("#1f2335")
	colorBgHigher  = lipgloss.Color("#24283b")
	colorBorder    = lipgloss.Color("#24283b")
	colorBorderAlt = lipgloss.Color("#414868")
	colorFg        = lipgloss.Color("#a9b1d6")
	colorFgDim     = lipgloss.Color("#565f89")
	colorBlue      = lipgloss.Color("#7aa2f7")
	colorCyan      = lipgloss.Color("#7dcfff")
	colorGreen     = lipgloss.Color("#9ece6a")
	colorYellow    = lipgloss.Color("#e0af68")
	colorRed       = lipgloss.Color("#f7768e")
	colorPurple    = lipgloss.Color("#bb9af7")
	colorOrange    = lipgloss.Color("#ff9e64")

	styleBase = lipgloss.NewStyle().
			Foreground(colorFg).
			Background(colorBg)

	styleHeader = lipgloss.NewStyle().
			Background(colorBgMid).
			Foreground(colorFgDim).
			Padding(0, 2)

	styleActiveTab = lipgloss.NewStyle().
			Background(colorBlue).
			Foreground(colorBg).
			Bold(true).
			Padding(0, 1)

	styleInactiveTab = lipgloss.NewStyle().
				Foreground(colorFgDim).
				Padding(0, 1)

	styleFooter = lipgloss.NewStyle().
			Background(colorBlue).
			Foreground(colorBg).
			Bold(true).
			Padding(0, 1)

	styleSidebar = lipgloss.NewStyle().
			Background(colorBgDark).
			BorderRight(true).
			BorderStyle(lipgloss.NormalBorder()).
			BorderForeground(colorBorder)

	styleContentBox = lipgloss.NewStyle().
			Background(colorBgHigher).
			Foreground(colorFg).
			Padding(1, 2).
			BorderStyle(lipgloss.RoundedBorder()).
			BorderForeground(colorBorderAlt)

	styleStat = lipgloss.NewStyle().
			Background(colorBgDark).
			Foreground(colorFg).
			Padding(1, 2).
			BorderStyle(lipgloss.NormalBorder()).
			BorderForeground(colorBorder).
			Align(lipgloss.Center)

	styleInput = lipgloss.NewStyle().
			Background(colorBgMid).
			Foreground(colorFg).
			Padding(1, 2).
			BorderStyle(lipgloss.RoundedBorder()).
			BorderForeground(colorBlue)

	styleDimCenter = lipgloss.NewStyle().
			Background(colorBg).
			Foreground(colorFgDim).
			Align(lipgloss.Center, lipgloss.Center)

	styleStepTitle = lipgloss.NewStyle().
			Background(colorBg).
			Foreground(colorBlue).
			Bold(true)

	styleGeminiChat = lipgloss.NewStyle().
			Background(colorBgMid).
			Foreground(colorFg).
			Padding(0, 1).
			MarginBottom(1)

	styleUserChat = lipgloss.NewStyle().
			Background(colorBg).
			Foreground(colorGreen).
			Bold(true)

	styleAssistantChat = lipgloss.NewStyle().
				Background(colorBg).
				Foreground(colorPurple).
				Bold(true)

	styleHint = lipgloss.NewStyle().
			Background(colorBg).
			Foreground(colorFgDim).
			Italic(true)
)

func insertCursor(text string, cursorPos int) string {
	runes := []rune(text)
	if cursorPos < 0 {
		cursorPos = 0
	}
	if cursorPos > len(runes) {
		cursorPos = len(runes)
	}
	return string(runes[:cursorPos]) + "█" + string(runes[cursorPos:])
}
