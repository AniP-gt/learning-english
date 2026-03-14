package ui

import (
	"fmt"
	"strings"

	"github.com/charmbracelet/lipgloss"

	"github.com/AniP-gt/learning-english/pkg/core"
)

func (m Model) View() string {
	if m.width == 0 {
		return "Loading..."
	}

	if m.showSettings {
		return m.renderSettings(m.width, m.height)
	}

	header := m.renderHeader()
	tabs := m.renderTabs()
	footer := m.renderFooter()
	bodyHeight := max(1, m.height-lipgloss.Height(header)-lipgloss.Height(tabs)-lipgloss.Height(footer))
	body := m.renderBody(bodyHeight)

	return lipgloss.JoinVertical(lipgloss.Left, header, tabs, body, footer)
}

func (m Model) renderHeader() string {
	geminiStatus := styleHint.Foreground(colorGreen).Render("Gemini API: OK")
	if !m.gemini.HasAPIKey() {
		geminiStatus = styleHint.Foreground(colorRed).Render("Gemini API: NO KEY")
	}
	ttsStatus := styleHint.Foreground(colorPurple).Render("TTS: say (macOS)")
	pathLabel := styleHint.Foreground(colorFgDim).Render(fmt.Sprintf("%s (Day %d)", m.weekPath.Path(), m.activeDay))

	left := fmt.Sprintf("📁 %s", pathLabel)
	right := fmt.Sprintf("%s | %s", geminiStatus, ttsStatus)

	gap := m.width - lipgloss.Width(left) - lipgloss.Width(right) - 4
	if gap < 0 {
		gap = 0
	}

	return styleHeader.Width(m.width).Render(
		left + strings.Repeat(" ", gap) + right,
	)
}

func (m Model) renderTabs() string {
	stepNames := []string{
		"1.Idea", "2.Words", "3.Reading", "4.Listening",
		"5.Speech", "6.3-2-1", "7.Reply",
	}
	tabs := make([]string, 7)
	for i, name := range stepNames {
		step := core.Step(i + 1)
		if step == m.activeStep {
			tabs[i] = styleActiveTab.Render(name)
		} else {
			tabs[i] = styleInactiveTab.Render(name)
		}
	}
	bar := lipgloss.JoinHorizontal(lipgloss.Top, tabs...)
	return lipgloss.NewStyle().
		Background(colorBgDark).
		Width(m.width).
		Render(bar)
}

func (m Model) renderBody(bodyHeight int) string {
	if m.sidebarOpen {
		sidebarWidth := 28
		contentWidth := m.width - sidebarWidth
		sidebar := m.renderSidebar(sidebarWidth, bodyHeight)
		content := m.renderContent(contentWidth, bodyHeight)
		return lipgloss.JoinHorizontal(lipgloss.Top, sidebar, content)
	}

	return m.renderContent(m.width, bodyHeight)
}

func (m Model) renderContent(width, height int) string {
	switch m.activeStep {
	case core.StepIdea:
		return m.renderIdeaStep(width, height)
	case core.StepWords:
		return m.renderWordsStep(width, height)
	case core.StepReading:
		return m.renderReadingStep(width, height)
	case core.StepListening:
		return m.renderListeningStep(width, height)
	case core.StepSpeech:
		return m.renderSpeechStep(width, height)
	case core.StepThreeTwoOne:
		return m.render321Step(width, height)
	case core.StepRoleplay:
		return m.renderReplyStep(width, height)
	default:
		return styleDimCenter.Width(width).Height(height).
			Render("(not implemented)")
	}
}

func (m Model) renderFooter() string {
	mode := "NORMAL"
	if m.ideaMode || m.speechInputMode || m.replyInputMode {
		mode = "INSERT"
	}
	if m.sidebarFocused {
		mode = "SIDEBAR"
	}
	if m.flashcardMode {
		mode = "FLASHCARD"
	}

	status := m.statusMsg
	if m.loading || m.wordsLoading || m.speechLoading || m.scene321Loading || m.replyLoading {
		status = "⏳ Loading..."
	}

	left := fmt.Sprintf(" %s | Step:%d/7 | %s | Day:%d | tab:weeks T:hide-sidebar g:Gemini ?:settings q:quit",
		mode, m.activeStep, m.weekPath.Path(), m.activeDay)
	right := fmt.Sprintf("UTF-8 | %s | [, ]:change day", status)

	gap := m.width - lipgloss.Width(left) - lipgloss.Width(right)
	if gap < 0 {
		gap = 0
	}

	return styleFooter.Width(m.width).Render(left + strings.Repeat(" ", gap) + right)
}

func max(a, b int) int {
	if a > b {
		return a
	}
	return b
}
