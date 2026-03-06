package ui

import (
	"strings"
	"time"

	"github.com/charmbracelet/bubbles/textinput"
	tea "github.com/charmbracelet/bubbletea"

	"github.com/AniP-gt/learning-english/pkg/core"
	geminiPkg "github.com/AniP-gt/learning-english/pkg/gemini"
	"github.com/AniP-gt/learning-english/pkg/storage"
)

type Model struct {
	config      *core.Config
	storage     *storage.FileStorage
	gemini      *geminiPkg.Client
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

	wordsEditMode      bool
	wordsCursor        int
	wordsInputMode     bool
	wordsInputBuffer   string
	wordsInputCursor   int
	wordsEditingAction string

	flashcardMode    bool
	flashcardIndex   int
	flashcardFlipped bool
	flashcardChecked []bool
	parsedWords      []flashcard

	readingText   string
	readingTimer  int
	readingWPM    int
	readingTiming bool
	readingLoaded bool

	readingComment string

	listeningSpeed   int
	listeningPlaying bool
	listeningText    string

	speechInput        string
	speechInputMode    bool
	speechCursor       int
	speechFeedback     string
	speechLoading      bool
	speechScrollOffset int

	scene321        string
	scene321Loading bool
	image321Path    string
	image321Preview string

	replyMessages     []replyMessage
	replyInput        string
	replyInputMode    bool
	replyCursor       int
	replyLoading      bool
	replyLastAudio    string
	replyScrollOffset int
	replyFeedback     string
	replyFeedbackMode bool

	showSettings     bool
	settingsCursor   int
	settingsInputs   [2]textinput.Model
	settingsModelIdx int
	settingsCEFRIdx  int
	settingsMsg      string

	statusMsg string
	loading   bool
}

func NewModel(config *core.Config) Model {
	weekPath := storage.CurrentWeekPath()
	s := storage.NewFileStorage(config.DataDir)
	g := geminiPkg.NewClientWithConfig(config.GeminiAPIKey, config.GeminiModel)

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
		config:         config,
		storage:        s,
		gemini:         g,
		weekPath:       weekPath,
		weeks:          weeks,
		sidebarCursor:  currentIdx,
		activeStep:     core.StepIdea,
		sidebarOpen:    true,
		listeningSpeed: 180,
		replyMessages:  []replyMessage{},
		settingsInputs: newSettingsInputs(config),
	}

	m.readingComment = ""

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
	if data, err := s.ReadFile(weekPath, "feedback.md"); err == nil {
		m.speechFeedback = string(data)
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
