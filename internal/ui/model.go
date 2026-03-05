package ui

import (
	"fmt"
	"strings"
	"time"

	"github.com/charmbracelet/bubbles/textinput"
	tea "github.com/charmbracelet/bubbletea"
	"github.com/charmbracelet/lipgloss"

	"github.com/AniP-gt/learning-english/pkg/core"
	"github.com/AniP-gt/learning-english/pkg/gemini"
	"github.com/AniP-gt/learning-english/pkg/storage"
)

type tickMsg time.Time

type geminiResponseMsg struct {
	content string
	err     error
}

type imageGenMsg struct {
	imgBytes  []byte
	mimeType  string
	savedPath string
	err       error
}

type wordsReadingResponseMsg struct {
	wordsContent   string
	wordsErr       error
	readingContent string
	readingErr     error
}

type Model struct {
	config      *core.Config
	storage     *storage.FileStorage
	gemini      *gemini.Client
	weekPath    core.WeekPath
	activeStep  core.Step
	width       int
	height      int
	sidebarOpen bool

	weeks          []core.WeekPath
	sidebarCursor  int
	sidebarFocused bool

	ideaInput    string
	ideaResponse string
	ideaCursor   int
	ideaMode     bool

	words        string
	wordsLoading bool

	// Flashcard mode
	flashcardMode    bool
	flashcardIndex   int
	flashcardFlipped bool   // false = front (English), true = back (Japanese)
	flashcardChecked []bool // checked[i] = true means "I know this card"
	parsedWords      []flashcard

	readingText   string
	readingTimer  int
	readingWPM    int
	readingTiming bool
	readingLoaded bool

	listeningSpeed   int
	listeningPlaying bool
	listeningText    string

	speechTranscript string
	speechFeedback   string
	speechLoading    bool
	speechInput      string
	speechInputMode  bool

	scene321        string
	scene321Loading bool
	image321Path    string
	image321Preview string

	roleplayMessages  []roleplayMessage
	roleplayInput     string
	roleplayRole      string
	roleplayInputMode bool
	roleplayLoading   bool

	showSettings     bool
	settingsCursor   int
	settingsInputs   [2]textinput.Model
	settingsModelIdx int
	settingsCEFRIdx  int
	settingsMsg      string

	statusMsg string
	loading   bool
}

type roleplayMessage struct {
	role    string
	content string
}

func NewModel(config *core.Config) Model {
	weekPath := storage.CurrentWeekPath()
	s := storage.NewFileStorage(config.DataDir)
	g := gemini.NewClientWithConfig(config.GeminiAPIKey, config.GeminiModel)

	weeks, _ := s.ListWeeks()
	if len(weeks) == 0 {
		weeks = []core.WeekPath{weekPath}
	} else {
		found := false
		for _, w := range weeks {
			if w == weekPath {
				found = true
				break
			}
		}
		if !found {
			weeks = append([]core.WeekPath{weekPath}, weeks...)
		}
	}

	currentIdx := 0
	for i, w := range weeks {
		if w == weekPath {
			currentIdx = i
			break
		}
	}

	m := Model{
		config:           config,
		storage:          s,
		gemini:           g,
		weekPath:         weekPath,
		weeks:            weeks,
		sidebarCursor:    currentIdx,
		activeStep:       core.StepIdea,
		sidebarOpen:      true,
		listeningSpeed:   180,
		roleplayRole:     "a friendly barista from Melbourne, Australia",
		roleplayMessages: []roleplayMessage{},
		settingsInputs:   newSettingsInputs(config),
	}

	m.readingText = "I love coffee. Every morning, I grind fresh beans and carefully measure the grounds. The rich aroma fills my kitchen and wakes me up better than any alarm clock. I prefer a light roast because I enjoy the bright acidity and subtle floral notes. The ritual of brewing has become an important part of my daily routine, giving me time to think and prepare for the day ahead."
	m.listeningText = m.readingText

	if data, err := s.ReadFile(weekPath, "reading.md"); err == nil {
		m.readingText = extractBodyFromMarkdown(string(data))
		m.listeningText = m.readingText
		m.readingLoaded = true
	}
	if data, err := s.ReadFile(weekPath, "words.md"); err == nil {
		m.words = string(data)
		m.parsedWords = parseWordsMarkdown(m.words)
		m.flashcardChecked = make([]bool, len(m.parsedWords))
	}
	if data, err := s.ReadFile(weekPath, "topic.md"); err == nil {
		m.ideaResponse = string(data)
	}
	for _, ext := range []string{".png", ".jpg"} {
		filename := "scene_321" + ext
		if s.FileExists(weekPath, filename) {
			m.image321Path = s.GetWeekDir(weekPath) + "/" + filename
			break
		}
	}

	return m
}

func extractBodyFromMarkdown(content string) string {
	lines := strings.Split(content, "\n")
	var body []string
	inBody := false
	for _, line := range lines {
		if strings.HasPrefix(line, "# ") {
			inBody = true
			continue
		}
		if inBody {
			body = append(body, line)
		}
	}
	if len(body) == 0 {
		return content
	}
	return strings.TrimSpace(strings.Join(body, "\n"))
}

func tickCmd() tea.Cmd {
	return tea.Tick(time.Second, func(t time.Time) tea.Msg {
		return tickMsg(t)
	})
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

	case tickMsg:
		if m.readingTiming {
			m.readingTimer++
			return m, tickCmd()
		}
		return m, nil

	case geminiResponseMsg:
		m.loading = false
		m.wordsLoading = false
		m.speechLoading = false
		m.scene321Loading = false
		m.roleplayLoading = false
		if msg.err != nil {
			m.statusMsg = fmt.Sprintf("Error: %v", msg.err)
			return m, nil
		}
		switch m.activeStep {
		case core.StepIdea:
			m.ideaResponse = msg.content
			m.ideaMode = false
			_ = m.storage.WriteFile(m.weekPath, "topic.md", []byte(msg.content))
			if m.gemini.HasAPIKey() {
				cefrLevel := m.config.CEFRLevel
				if cefrLevel == "" {
					cefrLevel = core.DefaultCEFRLevel
				}
				m.wordsLoading = true
				m.statusMsg = "Generating words & reading..."
				return m, m.generateWordsAndReading(msg.content, cefrLevel)
			}
		case core.StepWords:
			m.words = msg.content
			m.parsedWords = parseWordsMarkdown(msg.content)
			m.flashcardChecked = make([]bool, len(m.parsedWords))
			m.flashcardIndex = 0
			m.flashcardFlipped = false
			_ = m.storage.WriteFile(m.weekPath, "words.md", []byte(msg.content))
		case core.StepReading:
			m.readingText = extractBodyFromMarkdown(msg.content)
			m.listeningText = m.readingText
			m.readingLoaded = true
			_ = m.storage.WriteFile(m.weekPath, "reading.md", []byte(msg.content))
		case core.StepSpeech:
			if m.speechFeedback == "" {
				m.speechFeedback = msg.content
				_ = m.storage.WriteFile(m.weekPath, "feedback.md", []byte(msg.content))
			}
		case core.StepThreeTwoOne:
			m.scene321 = msg.content
		case core.StepRoleplay:
			m.roleplayMessages = append(m.roleplayMessages, roleplayMessage{
				role:    "assistant",
				content: msg.content,
			})
		}
		m.statusMsg = "Done."
		return m, nil

	case imageGenMsg:
		m.scene321Loading = false
		if msg.err != nil {
			m.statusMsg = fmt.Sprintf("Image generation error: %v", msg.err)
			return m, nil
		}
		m.image321Path = msg.savedPath
		m.image321Preview = renderTerminalImage(msg.savedPath, m.width-12, 20)
		m.statusMsg = fmt.Sprintf("Image saved: %s", msg.savedPath)
		return m, nil

	case wordsReadingResponseMsg:
		m.loading = false
		errMsgs := []string{}
		if msg.wordsErr != nil {
			errMsgs = append(errMsgs, fmt.Sprintf("Words: %v", msg.wordsErr))
		} else {
			m.words = msg.wordsContent
			m.parsedWords = parseWordsMarkdown(msg.wordsContent)
			m.flashcardChecked = make([]bool, len(m.parsedWords))
			m.flashcardIndex = 0
			m.flashcardFlipped = false
			_ = m.storage.WriteFile(m.weekPath, "words.md", []byte(msg.wordsContent))
		}
		if msg.readingErr != nil {
			errMsgs = append(errMsgs, fmt.Sprintf("Reading: %v", msg.readingErr))
		} else {
			m.readingText = extractBodyFromMarkdown(msg.readingContent)
			m.listeningText = m.readingText
			m.readingLoaded = true
			_ = m.storage.WriteFile(m.weekPath, "reading.md", []byte(msg.readingContent))
		}
		if len(errMsgs) > 0 {
			m.statusMsg = fmt.Sprintf("Error: %s", strings.Join(errMsgs, " | "))
		} else {
			m.statusMsg = "Words & Reading generated."
		}
		return m, nil

	case tea.KeyMsg:
		return m.handleKey(msg)
	}

	if m.showSettings {
		var cmds []tea.Cmd
		for i := range m.settingsInputs {
			var cmd tea.Cmd
			m.settingsInputs[i], cmd = m.settingsInputs[i].Update(msg)
			cmds = append(cmds, cmd)
		}
		return m, tea.Batch(cmds...)
	}

	return m, nil
}

func (m Model) handleKey(msg tea.KeyMsg) (Model, tea.Cmd) {
	if m.showSettings {
		return m.handleSettingsKey(msg)
	}
	if m.ideaMode {
		return m.handleIdeaInput(msg)
	}
	if m.speechInputMode {
		return m.handleSpeechInput(msg)
	}
	if m.roleplayInputMode {
		return m.handleRoleplayInput(msg)
	}
	if m.flashcardMode {
		return m.handleFlashcardKey(msg)
	}

	if m.sidebarFocused {
		return m.handleSidebarNav(msg)
	}

	switch msg.String() {
	case "ctrl+c", "q":
		return m, tea.Quit

	case "?":
		m.showSettings = true
		m.settingsInputs = newSettingsInputs(m.config)
		m.settingsCursor = 0
		m.settingsModelIdx = modelIndex(m.config.GeminiModel)
		m.settingsCEFRIdx = cefrIndex(m.config.CEFRLevel)
		m.settingsMsg = ""

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
		if m.sidebarOpen {
			m.sidebarFocused = !m.sidebarFocused
		} else {
			m.sidebarOpen = true
			m.sidebarFocused = true
		}

	case "T":
		m.sidebarOpen = !m.sidebarOpen
		if !m.sidebarOpen {
			m.sidebarFocused = false
		}

	case " ":
		switch m.activeStep {
		case core.StepReading:
			if m.readingTiming {
				m.readingTiming = false
				if m.readingTimer > 0 {
					wordCount := len(strings.Fields(m.readingText))
					minutes := float64(m.readingTimer) / 60.0
					if minutes > 0 {
						m.readingWPM = int(float64(wordCount) / minutes)
					}
				}
				return m, nil
			}
			m.readingTimer = 0
			m.readingWPM = 0
			m.readingTiming = true
			return m, tickCmd()

		case core.StepListening:
			if !m.listeningPlaying {
				m.listeningPlaying = true
				return m, m.playSayCmd()
			}
		}

	case "s":
		switch m.activeStep {
		case core.StepListening:
			if !m.listeningPlaying {
				m.listeningPlaying = true
				return m, m.playSayCmd()
			} else {
				m.listeningPlaying = false
			}
		}

	case "+", "=":
		if m.activeStep == core.StepListening && m.listeningSpeed < 400 {
			m.listeningSpeed += 20
		}

	case "-":
		if m.activeStep == core.StepListening && m.listeningSpeed > 80 {
			m.listeningSpeed -= 20
		}

	case "g":
		return m.handleGeminiAction()

	case "r":
		if m.activeStep == core.StepThreeTwoOne && m.image321Path != "" {
			m.image321Preview = renderTerminalImage(m.image321Path, m.width-12, m.height-14)
		}

	case "i":
		if m.activeStep == core.StepIdea {
			m.ideaMode = true
			m.ideaInput = ""
		}
		if m.activeStep == core.StepSpeech {
			m.speechInputMode = true
			m.speechInput = ""
		}
		if m.activeStep == core.StepRoleplay {
			m.roleplayInputMode = true
			m.roleplayInput = ""
		}

	case "f":
		if m.activeStep == core.StepWords && len(m.parsedWords) > 0 {
			m.flashcardMode = true
			m.flashcardIndex = 0
			m.flashcardFlipped = false
		}

	case "ctrl+s":
		return m, m.saveToGit()
	}

	return m, nil
}

func (m Model) handleGeminiAction() (Model, tea.Cmd) {
	if !m.gemini.HasAPIKey() {
		m.statusMsg = "GEMINI_API_KEY not set"
		return m, nil
	}
	cefrLevel := m.config.CEFRLevel
	if cefrLevel == "" {
		cefrLevel = core.DefaultCEFRLevel
	}
	switch m.activeStep {
	case core.StepIdea:
		input := m.ideaInput
		if input == "" {
			input = m.ideaResponse
		}
		if input == "" {
			m.statusMsg = "Press 'i' to enter topic first"
			return m, nil
		}
		m.loading = true
		m.statusMsg = "Generating topic..."
		g := m.gemini
		return m, func() tea.Msg {
			content, err := g.GenerateTopicFromJapanese(input)
			return geminiResponseMsg{content: content, err: err}
		}
	case core.StepWords:
		if m.ideaResponse == "" {
			m.statusMsg = "Complete Step 1 first"
			return m, nil
		}
		m.wordsLoading = true
		m.statusMsg = "Generating words..."
		topic := m.ideaResponse
		g := m.gemini
		return m, func() tea.Msg {
			content, err := g.GenerateWords(topic, cefrLevel)
			return geminiResponseMsg{content: content, err: err}
		}
	case core.StepReading:
		if m.ideaResponse == "" {
			m.statusMsg = "Complete Step 1 first"
			return m, nil
		}
		m.loading = true
		m.statusMsg = "Generating reading text..."
		topic := m.ideaResponse
		g := m.gemini
		return m, func() tea.Msg {
			content, err := g.GenerateReading(topic, cefrLevel)
			return geminiResponseMsg{content: content, err: err}
		}
	case core.StepSpeech:
		if m.speechInput == "" {
			m.statusMsg = "Press 'i' to enter speech text first"
			return m, nil
		}
		m.speechLoading = true
		m.statusMsg = "Analyzing speech..."
		text := m.speechInput
		g := m.gemini
		return m, func() tea.Msg {
			content, err := g.AnalyzeSpeech(text)
			return geminiResponseMsg{content: content, err: err}
		}
	case core.StepThreeTwoOne:
		if m.speechInput == "" && m.speechFeedback == "" {
			m.statusMsg = "Complete Step 5 first"
			return m, nil
		}
		m.scene321Loading = true
		m.statusMsg = "Generating image with Gemini 2.5 Flash Image..."
		text := m.speechInput
		if text == "" {
			text = m.speechFeedback
		}
		g := m.gemini
		s := m.storage
		wp := m.weekPath
		return m, func() tea.Msg {
			imgBytes, mimeType, err := g.GenerateImageForScene(text)
			if err != nil {
				// Image generation failed — fall back to text-based scene description
				sceneText, sceneErr := g.GenerateImageScene(text)
				if sceneErr != nil {
					// Both image and text fallback failed
					return imageGenMsg{err: fmt.Errorf("image generation error: %v; fallback text error: %v", err, sceneErr)}
				}
				// Save the text fallback as scene_321.txt so users can inspect it later
				txtName := "scene_321.txt"
				if saveErr := s.WriteFile(wp, txtName, []byte(sceneText)); saveErr != nil {
					return imageGenMsg{err: saveErr}
				}
				// Also return the text as a normal Gemini response so the UI shows it immediately
				return geminiResponseMsg{content: sceneText, err: nil}
			}

			ext := ".png"
			if mimeType == "image/jpeg" {
				ext = ".jpg"
			}
			filename := "scene_321" + ext
			if saveErr := s.WriteFile(wp, filename, imgBytes); saveErr != nil {
				return imageGenMsg{err: saveErr}
			}
			savedPath := s.GetWeekDir(wp) + "/" + filename
			return imageGenMsg{
				imgBytes:  imgBytes,
				mimeType:  mimeType,
				savedPath: savedPath,
			}
		}
	}
	return m, nil
}

func (m Model) generateWordsAndReading(topic, cefrLevel string) tea.Cmd {
	g := m.gemini
	return func() tea.Msg {
		wc, we := g.GenerateWords(topic, cefrLevel)
		rc, re := g.GenerateReading(topic, cefrLevel)
		return wordsReadingResponseMsg{
			wordsContent:   wc,
			wordsErr:       we,
			readingContent: rc,
			readingErr:     re,
		}
	}
}

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
	m.scene321 = ""
	m.image321Path = ""
	m.image321Preview = ""
	m.roleplayMessages = []roleplayMessage{}
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

func (m Model) handleIdeaInput(msg tea.KeyMsg) (Model, tea.Cmd) {
	switch msg.Type {
	case tea.KeyEsc:
		m.ideaMode = false
	case tea.KeyEnter:
		if m.ideaInput != "" {
			m.ideaMode = false
			if m.gemini.HasAPIKey() {
				m.loading = true
				m.statusMsg = "Generating..."
				input := m.ideaInput
				g := m.gemini
				return m, func() tea.Msg {
					content, err := g.GenerateTopicFromJapanese(input)
					return geminiResponseMsg{content: content, err: err}
				}
			}
		}
	case tea.KeyBackspace:
		runes := []rune(m.ideaInput)
		if len(runes) > 0 {
			m.ideaInput = string(runes[:len(runes)-1])
		}
	case tea.KeyRunes, tea.KeySpace:
		m.ideaInput += string(msg.Runes)
	}
	return m, nil
}

func (m Model) handleSpeechInput(msg tea.KeyMsg) (Model, tea.Cmd) {
	switch msg.Type {
	case tea.KeyEsc:
		m.speechInputMode = false
	case tea.KeyEnter:
		if m.speechInput != "" {
			m.speechInputMode = false
		}
	case tea.KeyBackspace:
		runes := []rune(m.speechInput)
		if len(runes) > 0 {
			m.speechInput = string(runes[:len(runes)-1])
		}
	case tea.KeyRunes, tea.KeySpace:
		m.speechInput += string(msg.Runes)
	}
	return m, nil
}

func (m Model) handleRoleplayInput(msg tea.KeyMsg) (Model, tea.Cmd) {
	switch msg.Type {
	case tea.KeyEsc:
		m.roleplayInputMode = false
	case tea.KeyEnter:
		if m.roleplayInput != "" && m.gemini.HasAPIKey() {
			userMsg := m.roleplayInput
			m.roleplayMessages = append(m.roleplayMessages, roleplayMessage{
				role:    "user",
				content: userMsg,
			})
			m.roleplayInput = ""
			m.roleplayInputMode = false
			m.roleplayLoading = true
			m.statusMsg = "Waiting for response..."
			g := m.gemini
			role := m.roleplayRole
			return m, func() tea.Msg {
				content, err := g.StartRoleplay(role, userMsg)
				return geminiResponseMsg{content: content, err: err}
			}
		} else if m.roleplayInput != "" {
			m.roleplayMessages = append(m.roleplayMessages, roleplayMessage{
				role:    "user",
				content: m.roleplayInput,
			})
			m.roleplayInput = ""
			m.roleplayInputMode = false
			m.statusMsg = "GEMINI_API_KEY not set"
		}
	case tea.KeyBackspace:
		runes := []rune(m.roleplayInput)
		if len(runes) > 0 {
			m.roleplayInput = string(runes[:len(runes)-1])
		}
	case tea.KeyRunes, tea.KeySpace:
		m.roleplayInput += string(msg.Runes)
	}
	return m, nil
}

func (m Model) playSayCmd() tea.Cmd {
	text := m.listeningText
	speed := m.listeningSpeed
	return func() tea.Msg {
		playSay(text, speed)
		return struct{}{}
	}
}

func (m Model) saveToGit() tea.Cmd {
	return func() tea.Msg {
		m.statusMsg = "Saved (Git push requires GIT_ENABLED=true)"
		return geminiResponseMsg{content: "", err: nil}
	}
}

func (m Model) View() string {
	if m.width == 0 {
		return "Loading..."
	}

	if m.showSettings {
		return m.renderSettings(m.width, m.height)
	}

	header := m.renderHeader()
	tabs := m.renderTabs()
	body := m.renderBody()
	footer := m.renderFooter()

	return lipgloss.JoinVertical(lipgloss.Left, header, tabs, body, footer)
}

func (m Model) renderHeader() string {
	geminiStatus := styleHint.Foreground(colorGreen).Render("Gemini API: OK")
	if !m.gemini.HasAPIKey() {
		geminiStatus = styleHint.Foreground(colorRed).Render("Gemini API: NO KEY")
	}
	ttsStatus := styleHint.Foreground(colorPurple).Render("TTS: say (macOS)")
	path := styleHint.Foreground(colorFgDim).Render(m.weekPath.Path())

	left := fmt.Sprintf("📁 %s", path)
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
		"5.Speech", "6.3-2-1", "7.Roleplay",
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

func (m Model) renderBody() string {
	bodyHeight := m.height - 4

	if m.sidebarOpen {
		sidebarWidth := 28
		contentWidth := m.width - sidebarWidth
		sidebar := m.renderSidebar(sidebarWidth, bodyHeight)
		content := m.renderContent(contentWidth, bodyHeight)
		return lipgloss.JoinHorizontal(lipgloss.Top, sidebar, content)
	}

	return m.renderContent(m.width, bodyHeight)
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
		lipgloss.NewStyle().PaddingTop(1).Render(tree),
		lipgloss.NewStyle().PaddingTop(1).Render(dataPathLine),
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
		return m.renderRoleplayStep(width, height)
	default:
		return styleDimCenter.Width(width).Height(height).
			Render("(not implemented)")
	}
}

func (m Model) renderFooter() string {
	mode := "NORMAL"
	if m.ideaMode || m.speechInputMode || m.roleplayInputMode {
		mode = "INSERT"
	}
	if m.sidebarFocused {
		mode = "SIDEBAR"
	}
	if m.flashcardMode {
		mode = "FLASHCARD"
	}

	status := m.statusMsg
	if m.loading || m.wordsLoading || m.speechLoading || m.scene321Loading || m.roleplayLoading {
		status = "⏳ Loading..."
	}

	left := fmt.Sprintf(" %s | Step:%d/7 | %s | tab:weeks T:hide-sidebar g:Gemini ?:settings q:quit",
		mode, m.activeStep, m.weekPath.Path())
	right := fmt.Sprintf("UTF-8 | %s ", status)

	gap := m.width - lipgloss.Width(left) - lipgloss.Width(right)
	if gap < 0 {
		gap = 0
	}

	return styleFooter.Width(m.width).Render(left + strings.Repeat(" ", gap) + right)
}
