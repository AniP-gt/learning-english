package ui

import (
	"fmt"

	tea "github.com/charmbracelet/bubbletea"
	"github.com/charmbracelet/lipgloss"

	"github.com/AniP-gt/learning-english/pkg/core"
	"github.com/AniP-gt/learning-english/pkg/storage"
)

func (m Model) handleSidebarNav(msg tea.KeyMsg) (Model, tea.Cmd) {
	switch msg.String() {
	case "ctrl+c", "q":
		return m, tea.Quit
	case "esc", "tab":
		m.sidebarFocused = false
	case "j", "down":
		if m.sidebarCursor < len(m.weeks)-1 {
			m.sidebarCursor++
		}
	case "k", "up":
		if m.sidebarCursor > 0 {
			m.sidebarCursor--
		}
	case "enter", " ":
		if len(m.weeks) > 0 {
			return m.switchWeek(m.weeks[m.sidebarCursor])
		}
	case "n":
		return m.createNewWeek()
	}
	return m, nil
}

func (m Model) switchWeek(wp core.WeekPath) (Model, tea.Cmd) {
	m.weekPath = wp
	m.sidebarFocused = false

	m.readingText = "I love coffee. Every morning, I grind fresh beans and carefully measure the grounds. The rich aroma fills my kitchen and wakes me up better than any alarm clock. I prefer a light roast because I enjoy the bright acidity and subtle floral notes. The ritual of brewing has become an important part of my daily routine, giving me time to think and prepare for the day ahead."
	m.listeningText = m.readingText
	m.readingWPM = 0
	m.readingTimer = 0
	m.readingTiming = false
	m.readingLoaded = false
	m.words = ""
	m.parsedWords = nil
	m.flashcardChecked = nil
	m.flashcardIndex = 0
	m.flashcardFlipped = false
	m.flashcardMode = false
	m.ideaResponse = ""
	m.speechFeedback = ""
	m.speechInput = ""
	m.speechScrollOffset = 0
	m.scene321 = ""
	m.image321Path = ""
	m.image321Preview = ""
	m.replyMessages = []replyMessage{}
	m.replyLastAudio = ""
	m.replyScrollOffset = 0
	m.replyFeedback = ""
	m.statusMsg = fmt.Sprintf("Switched to %s", wp.Path())

	if data, err := m.storage.ReadFile(wp, "reading.md"); err == nil {
		m.readingText = extractBodyFromMarkdown(string(data))
		m.listeningText = m.readingText
		m.readingLoaded = true
	}
	if data, err := m.storage.ReadFile(wp, "words.md"); err == nil {
		m.words = string(data)
		m.parsedWords = parseWordsMarkdown(m.words)
		m.flashcardChecked = make([]bool, len(m.parsedWords))
	}
	if data, err := m.storage.ReadFile(wp, "topic.md"); err == nil {
		m.ideaResponse = string(data)
	}
	if data, err := m.storage.ReadFile(wp, "feedback.md"); err == nil {
		m.speechFeedback = string(data)
	}
	for _, ext := range []string{".png", ".jpg"} {
		filename := "scene_321" + ext
		if m.storage.FileExists(wp, filename) {
			m.image321Path = m.storage.GetWeekDir(wp) + "/" + filename
			break
		}
	}

	return m, nil
}

func (m Model) createNewWeek() (Model, tea.Cmd) {
	wp := storage.CurrentWeekPath()
	for _, w := range m.weeks {
		if w == wp {
			m.statusMsg = "Current week already exists"
			return m, nil
		}
	}
	m.weeks = append([]core.WeekPath{wp}, m.weeks...)
	m.sidebarCursor = 0
	return m.switchWeek(wp)
}

func (m Model) renderSidebar(width, height int) string {
	files := []string{"topic.md", "words.md", "reading.md", "feedback.md", "scene_321.png"}

	headerStyle := lipgloss.NewStyle().
		Foreground(colorBlue).
		Bold(true).
		Padding(0, 1)

	if m.sidebarFocused {
		headerStyle = headerStyle.Foreground(colorYellow)
	}

	header := headerStyle.Render("📂 WEEKS")

	var lines []string
	currentPath := storage.CurrentWeekPath()

	for i, w := range m.weeks {
		isCurrent := (w == currentPath)
		isSelected := (i == m.sidebarCursor)
		isActive := (w == m.weekPath)

		label := w.Path()

		var prefix string
		switch {
		case isCurrent && isActive:
			prefix = "▶"
		case isActive:
			prefix = "►"
		case isSelected && m.sidebarFocused:
			prefix = "›"
		default:
			prefix = " "
		}

		var rowStyle lipgloss.Style
		switch {
		case isSelected && m.sidebarFocused:
			rowStyle = lipgloss.NewStyle().
				Background(colorBlue).
				Foreground(colorBg).
				Bold(true).
				Width(width - 2)
		case isActive:
			rowStyle = lipgloss.NewStyle().
				Foreground(colorGreen).
				Bold(true).
				Width(width - 2)
		case isCurrent:
			rowStyle = lipgloss.NewStyle().
				Foreground(colorYellow).
				Width(width - 2)
		default:
			rowStyle = lipgloss.NewStyle().
				Foreground(colorFgDim).
				Width(width - 2)
		}

		row := rowStyle.Render(fmt.Sprintf(" %s %s", prefix, label))
		lines = append(lines, row)

		if isActive || (isSelected && m.sidebarFocused) {
			for _, f := range files {
				exists := m.storage.FileExists(w, f)
				icon := "◦"
				fStyle := lipgloss.NewStyle().Foreground(colorFgDim)
				if exists {
					icon = "●"
					fStyle = lipgloss.NewStyle().Foreground(colorGreen)
				}
				lines = append(lines, fStyle.Render(fmt.Sprintf("   %s %s", icon, f)))
			}
		}
	}

	if len(m.weeks) == 0 {
		lines = append(lines, lipgloss.NewStyle().Foreground(colorFgDim).Render(" (no data yet)"))
	}

	dataPathLine := lipgloss.NewStyle().
		Foreground(colorFgDim).
		Padding(0, 1).
		Render(truncateLeft(m.config.DataDir, width-2))

	var hint string
	if m.sidebarFocused {
		hint = lipgloss.NewStyle().
			Foreground(colorYellow).
			Padding(0, 1).
			Render("j/k:move Enter:select n:new Esc:exit")
	} else {
		hint = lipgloss.NewStyle().
			Foreground(colorFgDim).
			Padding(0, 1).
			Render("tab: focus weeks")
	}

	tree := lipgloss.JoinVertical(lipgloss.Left, lines...)

	inner := lipgloss.JoinVertical(lipgloss.Left,
		header,
		lipgloss.NewStyle().Background(colorBgDark).PaddingTop(1).Render(tree),
		lipgloss.NewStyle().Background(colorBgDark).PaddingTop(1).Render(dataPathLine),
		hint,
	)

	borderColor := colorBorder
	if m.sidebarFocused {
		borderColor = colorYellow
	}

	return lipgloss.NewStyle().
		Background(colorBgDark).
		BorderRight(true).
		BorderStyle(lipgloss.NormalBorder()).
		BorderForeground(borderColor).
		Width(width).
		Height(height).
		Render(inner)
}

func truncateLeft(s string, maxLen int) string {
	if len(s) <= maxLen {
		return s
	}
	return "…" + s[len(s)-maxLen+1:]
}

func (m Model) ensureCurrentWeekAndFiles() Model {
	wp := storage.CurrentWeekPath()
	if m.weekPath != wp {
		found := false
		for _, w := range m.weeks {
			if w == wp {
				found = true
				break
			}
		}
		if !found {
			m.weeks = append([]core.WeekPath{wp}, m.weeks...)
			m.sidebarCursor = 0
		}
		m, _ = m.switchWeek(wp)
	}

	_ = m.storage.EnsureWeekDir(wp)

	year := wp.Year
	month := wp.Month
	week := wp.Week

	topicT := fmt.Sprintf("# Topic — %04d/%02d/week%d\n\n## Japanese Input\n\n\n## Keywords\n\n\n## Summary\n", year, month, week)
	wordsT := fmt.Sprintf("# Words — %04d/%02d/week%d\n\n| Word | Translation | Example |\n|------|-------------|---------|\n", year, month, week)
	readingT := fmt.Sprintf("# Reading — %04d/%02d/week%d\n\nCEFR: %s | Words: 0\n\n", year, month, week, m.config.CEFRLevel)
	feedbackT := fmt.Sprintf("# Feedback — %04d/%02d/week%d\n\n", year, month, week)

	if !m.storage.FileExists(wp, "topic.md") {
		_ = m.storage.WriteFile(wp, "topic.md", []byte(topicT))
	}
	if !m.storage.FileExists(wp, "words.md") {
		_ = m.storage.WriteFile(wp, "words.md", []byte(wordsT))
	}
	if !m.storage.FileExists(wp, "reading.md") {
		_ = m.storage.WriteFile(wp, "reading.md", []byte(readingT))
	}
	if !m.storage.FileExists(wp, "feedback.md") {
		_ = m.storage.WriteFile(wp, "feedback.md", []byte(feedbackT))
	}

	return m
}

func commentForWPM(wpm int) string {
	if wpm <= 0 {
		return ""
	}
	switch {
	case wpm < 150:
		return "Nice effort — keep practicing! Aim for 150 WPM."
	case wpm >= 150 && wpm < 180:
		return "Good job — around 150 WPM! Keep it up."
	case wpm >= 180 && wpm < 200:
		return "Amazing speed — that's blazing (≈180 WPM)!"
	default:
		return "Incredible speed — you're blazing beyond expectations!"
	}
}

func CommentForWPM(wpm int) string { return commentForWPM(wpm) }
