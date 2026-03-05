package ui

import (
	"fmt"
	"strings"

	"github.com/charmbracelet/bubbles/textinput"
	tea "github.com/charmbracelet/bubbletea"
	"github.com/charmbracelet/lipgloss"

	"github.com/AniP-gt/learning-english/pkg/core"
	"github.com/AniP-gt/learning-english/pkg/storage"
)

const (
	settingsFieldCount = 3
	settingsIdxDataDir = 0
	settingsIdxAPIKey  = 1
	settingsIdxModel   = 2
)

var settingsLabels = [settingsFieldCount]string{
	"Data Directory",
	"Gemini API Key",
	"Gemini Model",
}

var settingsKeys = [settingsFieldCount]string{
	"data_dir",
	"gemini_api_key",
	"gemini_model",
}

func modelIndex(model string) int {
	for i, m := range core.AvailableGeminiModels {
		if m == model {
			return i
		}
	}
	return 0
}

func newSettingsInputs(cfg *core.Config) [2]textinput.Model {
	values := [2]string{cfg.DataDir, cfg.GeminiAPIKey}
	var inputs [2]textinput.Model
	for i := range inputs {
		ti := textinput.New()
		ti.SetValue(values[i])
		ti.Width = 56
		if i == settingsIdxAPIKey {
			ti.EchoMode = textinput.EchoPassword
			ti.EchoCharacter = '*'
		}
		inputs[i] = ti
	}
	inputs[0].Focus()
	return inputs
}

func (m Model) handleSettingsKey(msg tea.KeyMsg) (Model, tea.Cmd) {
	focused := -1
	for i := range m.settingsInputs {
		if m.settingsInputs[i].Focused() {
			focused = i
			break
		}
	}

	switch msg.String() {
	case "ctrl+c":
		return m, tea.Quit

	case "esc", "?":
		for i := range m.settingsInputs {
			m.settingsInputs[i].Blur()
		}
		m.showSettings = false
		m.settingsMsg = ""
		return m, nil

	case "tab", "down", "j":
		if focused >= 0 {
			m.settingsInputs[focused].Blur()
		}
		next := (m.settingsCursor + 1) % settingsFieldCount
		m.settingsCursor = next
		if next < settingsIdxModel {
			cmd := m.settingsInputs[next].Focus()
			return m, cmd
		}
		return m, nil

	case "shift+tab", "up", "k":
		if focused >= 0 {
			m.settingsInputs[focused].Blur()
		}
		prev := (m.settingsCursor - 1 + settingsFieldCount) % settingsFieldCount
		m.settingsCursor = prev
		if prev < settingsIdxModel {
			cmd := m.settingsInputs[prev].Focus()
			return m, cmd
		}
		return m, nil

	case "left", "h":
		if m.settingsCursor == settingsIdxModel {
			n := len(core.AvailableGeminiModels)
			m.settingsModelIdx = (m.settingsModelIdx - 1 + n) % n
			return m, nil
		}

	case "right", "l":
		if m.settingsCursor == settingsIdxModel {
			n := len(core.AvailableGeminiModels)
			m.settingsModelIdx = (m.settingsModelIdx + 1) % n
			return m, nil
		}

	case "ctrl+s":
		return m.saveSettings()
	}

	if focused >= 0 {
		var cmd tea.Cmd
		m.settingsInputs[focused], cmd = m.settingsInputs[focused].Update(msg)
		return m, cmd
	}
	return m, nil
}

func (m Model) saveSettings() (Model, tea.Cmd) {
	m.config.DataDir = m.settingsInputs[settingsIdxDataDir].Value()
	m.config.GeminiAPIKey = m.settingsInputs[settingsIdxAPIKey].Value()
	m.config.GeminiModel = core.AvailableGeminiModels[m.settingsModelIdx]

	if err := core.SaveConfig(m.config); err != nil {
		m.settingsMsg = fmt.Sprintf("Error: %v", err)
		return m, nil
	}

	s := storage.NewFileStorage(m.config.DataDir)
	m.storage = s
	weeks, _ := s.ListWeeks()
	if len(weeks) == 0 {
		weeks = []core.WeekPath{storage.CurrentWeekPath()}
	}
	m.weeks = weeks
	m.sidebarCursor = 0

	m.gemini.SetAPIKey(m.config.GeminiAPIKey)
	m.gemini.SetModel(m.config.GeminiModel)

	for i := range m.settingsInputs {
		m.settingsInputs[i].Blur()
	}
	m.settingsMsg = fmt.Sprintf("Saved to %s", core.ConfigFilePath())
	m.showSettings = false
	return m, nil
}

func (m Model) renderSettings(width, height int) string {
	overlayWidth := 68
	if overlayWidth > width-4 {
		overlayWidth = width - 4
	}

	titleStyle := lipgloss.NewStyle().
		Foreground(colorBlue).
		Bold(true).
		MarginBottom(1)

	title := titleStyle.Render("⚙  Settings")

	var rows []string
	rows = append(rows, title)

	for i, label := range settingsLabels {
		isSelected := i == m.settingsCursor

		labelStyle := lipgloss.NewStyle().Foreground(colorFgDim)
		if isSelected {
			labelStyle = labelStyle.Foreground(colorYellow).Bold(true)
		}

		cursor := "  "
		if isSelected {
			cursor = "▶ "
		}

		fieldBorderColor := colorBorder
		if isSelected {
			fieldBorderColor = colorBlue
		}

		var fieldBox string
		if i == settingsIdxModel {
			fieldBox = m.renderModelSelector(overlayWidth-8, isSelected, fieldBorderColor)
		} else {
			fieldBox = lipgloss.NewStyle().
				BorderStyle(lipgloss.NormalBorder()).
				BorderForeground(fieldBorderColor).
				Padding(0, 1).
				Render(m.settingsInputs[i].View())
		}

		rows = append(rows,
			labelStyle.Render(cursor+label+" ("+settingsKeys[i]+")"),
			fieldBox,
			"",
		)
	}

	hint := lipgloss.NewStyle().Foreground(colorFgDim).
		Render("Tab/j/k: move field  ←/→: select model  Ctrl+S: save  Esc: close")
	rows = append(rows, hint)

	if m.settingsMsg != "" {
		msgColor := colorGreen
		if strings.HasPrefix(m.settingsMsg, "Error") {
			msgColor = colorRed
		}
		rows = append(rows, lipgloss.NewStyle().Foreground(msgColor).Render(m.settingsMsg))
	}

	inner := lipgloss.JoinVertical(lipgloss.Left, rows...)

	box := lipgloss.NewStyle().
		Background(colorBgHigher).
		Foreground(colorFg).
		Padding(1, 2).
		Width(overlayWidth).
		BorderStyle(lipgloss.RoundedBorder()).
		BorderForeground(colorBorderAlt).
		Render(inner)

	return lipgloss.Place(width, height, lipgloss.Center, lipgloss.Center,
		box,
		lipgloss.WithWhitespaceBackground(colorBg),
	)
}

func (m Model) renderModelSelector(width int, isSelected bool, borderColor lipgloss.Color) string {
	models := core.AvailableGeminiModels
	n := len(models)

	var items []string
	for i, model := range models {
		if i == m.settingsModelIdx {
			s := lipgloss.NewStyle().
				Foreground(colorBg).
				Background(colorBlue).
				Bold(true).
				Padding(0, 1).
				Render("● " + model)
			items = append(items, s)
		} else {
			s := lipgloss.NewStyle().
				Foreground(colorFgDim).
				Padding(0, 1).
				Render("○ " + model)
			items = append(items, s)
		}
	}

	nav := lipgloss.NewStyle().Foreground(colorFgDim).
		Render(fmt.Sprintf("← %d/%d →", m.settingsModelIdx+1, n))

	inner := lipgloss.JoinVertical(lipgloss.Left,
		lipgloss.JoinVertical(lipgloss.Left, items...),
		lipgloss.NewStyle().PaddingTop(1).Render(nav),
	)

	return lipgloss.NewStyle().
		BorderStyle(lipgloss.NormalBorder()).
		BorderForeground(borderColor).
		Padding(0, 1).
		Width(width).
		Render(inner)
}
