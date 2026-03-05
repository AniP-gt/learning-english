package ui

import (
	"fmt"

	tea "github.com/charmbracelet/bubbletea"
	"github.com/charmbracelet/lipgloss"

	"github.com/AniP-gt/learning-english/pkg/core"
)

var (
	highlightColor = lipgloss.Color("#7aa2f7")
	bgColor        = lipgloss.Color("#1a1b26")
	sidebarBg      = lipgloss.Color("#16161e")
	borderColor    = lipgloss.Color("#24283b")

	titleStyle = lipgloss.NewStyle().
			Foreground(highlightColor).
			Bold(true).
			Padding(0, 1)

	activeTabStyle = lipgloss.NewStyle().
			Background(highlightColor).
			Foreground(bgColor).
			Bold(true).
			Padding(0, 2)

	inactiveTabStyle = lipgloss.NewStyle().
				Foreground(lipgloss.Color("#565f89")).
				Padding(0, 2)
)

type Model struct {
	config      *core.Config
	activeStep  core.Step
	width       int
	height      int
	sidebarOpen bool
}

func NewModel(config *core.Config) Model {
	return Model{
		config:      config,
		activeStep:  core.StepReading,
		sidebarOpen: true,
	}
}

func (m Model) Init() tea.Cmd {
	return nil
}

func (m Model) Update(msg tea.Msg) (tea.Model, tea.Cmd) {
	switch msg := msg.(type) {
	case tea.WindowSizeMsg:
		m.width = msg.Width
		m.height = msg.Height
		return m, nil

	case tea.KeyMsg:
		switch msg.String() {
		case "ctrl+c", "q":
			return m, tea.Quit

		case "1":
			m.activeStep = core.StepIdea
		case "2":
			m.activeStep = core.StepWords
		case "3":
			m.activeStep = core.StepReading
		case "4":
			m.activeStep = core.StepListening
		case "5":
			m.activeStep = core.StepSpeech
		case "6":
			m.activeStep = core.StepThreeTwoOne
		case "7":
			m.activeStep = core.StepRoleplay

		case "tab":
			m.sidebarOpen = !m.sidebarOpen
		}
	}

	return m, nil
}

func (m Model) View() string {
	if m.width == 0 {
		return "Loading..."
	}

	header := m.renderHeader()
	tabs := m.renderTabs()
	content := m.renderContent()
	footer := m.renderFooter()

	return lipgloss.JoinVertical(
		lipgloss.Left,
		header,
		tabs,
		content,
		footer,
	)
}

func (m Model) renderHeader() string {
	return lipgloss.NewStyle().
		Background(lipgloss.Color("#1f2335")).
		Foreground(lipgloss.Color("#565f89")).
		Padding(0, 2).
		Width(m.width).
		Render("📁 learning-english | Gemini API: OK | TTS: say (macOS)")
}

func (m Model) renderTabs() string {
	tabs := []string{}

	for i := core.Step(1); i <= core.StepRoleplay; i++ {
		style := inactiveTabStyle
		if i == m.activeStep {
			style = activeTabStyle
		}
		tabs = append(tabs, style.Render(i.String()))
	}

	return lipgloss.NewStyle().
		Background(sidebarBg).
		Width(m.width).
		Render(lipgloss.JoinHorizontal(lipgloss.Top, tabs...))
}

func (m Model) renderContent() string {
	contentHeight := m.height - 6

	switch m.activeStep {
	case core.StepReading:
		return m.renderReadingStep(contentHeight)
	case core.StepListening:
		return m.renderListeningStep(contentHeight)
	default:
		return lipgloss.NewStyle().
			Width(m.width).
			Height(contentHeight).
			Align(lipgloss.Center, lipgloss.Center).
			Foreground(lipgloss.Color("#565f89")).
			Render(fmt.Sprintf("Step %d: %s\n\n(Implementation pending)", m.activeStep, m.activeStep.String()))
	}
}

func (m Model) renderReadingStep(height int) string {
	mockText := "I love coffee. Every morning, I grind fresh beans. The aroma is wonderful. I prefer a light roast because I enjoy the bright acidity..."

	textBox := lipgloss.NewStyle().
		Background(lipgloss.Color("#24283b")).
		Foreground(lipgloss.Color("#a9b1d6")).
		Padding(2).
		Margin(1, 2).
		Width(m.width - 8).
		Render(mockText)

	controls := lipgloss.NewStyle().
		Margin(1, 2).
		Render("Press SPACE to start timer | ESC to stop")

	return lipgloss.NewStyle().
		Height(height).
		Render(lipgloss.JoinVertical(lipgloss.Left, textBox, controls))
}

func (m Model) renderListeningStep(height int) string {
	return lipgloss.NewStyle().
		Width(m.width).
		Height(height).
		Align(lipgloss.Center, lipgloss.Center).
		Render("🔊 Press 's' to play audio\n\nmacOS say command ready")
}

func (m Model) renderFooter() string {
	leftStatus := fmt.Sprintf("NORMAL MODE | Step: %d/7", m.activeStep)
	rightStatus := "UTF-8 | q: quit | tab: toggle sidebar"

	return lipgloss.NewStyle().
		Background(highlightColor).
		Foreground(bgColor).
		Bold(true).
		Width(m.width).
		Padding(0, 2).
		Render(leftStatus + lipgloss.NewStyle().Inline(true).Width(m.width-len(leftStatus)-len(rightStatus)-4).Render("") + rightStatus)
}
