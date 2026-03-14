package ui

import (
	"path/filepath"
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
	activeDay   int
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

	readingComment      string
	readingScrollOffset int

	listeningSpeed      int
	listeningPlaying    bool
	listeningText       string
	dictationInput      string
	dictationCursor     int
	dictationInputMode  bool
	dictationScore      int
	dictationScored     bool
	dictationShowAnswer bool

	speechInput        string
	speechInputMode    bool
	speechCursor       int
	speechTranscript   string
	speechFeedback     string
	speechLoading      bool
	speechRecording    bool
	speechSecondsLeft  int
	speechAudioPath    string
	speechCanRecord    bool
	speechCanPlay      bool
	speechAudioHint    string
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

const maxDays = 7

const defaultReadingParagraph = "I love coffee. Every morning, I grind fresh beans and carefully measure the grounds. The rich aroma fills my kitchen and wakes me up better than any alarm clock. I prefer a light roast because I enjoy the bright acidity and subtle floral notes. The ritual of brewing has become an important part of my daily routine, giving me time to think and prepare for the day ahead."

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
		config:            config,
		storage:           s,
		gemini:            g,
		weekPath:          weekPath,
		weeks:             weeks,
		sidebarCursor:     currentIdx,
		activeStep:        core.StepIdea,
		activeDay:         1,
		sidebarOpen:       true,
		listeningSpeed:    180,
		replyMessages:     []replyMessage{},
		settingsInputs:    newSettingsInputs(config),
		speechSecondsLeft: speechRecordingSeconds,
	}

	m.readingComment = ""
	m = m.loadWeekMetadata(weekPath)
	m = m.switchToDay(m.activeDay)
	audioTools := detectSpeechAudioTools()
	m.speechCanRecord = audioTools.CanRecord()
	m.speechCanPlay = audioTools.CanPlay()
	m.speechAudioHint = audioTools.Hint()
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
			if strings.HasPrefix(line, "CEFR:") {
				continue
			}
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

func clampDay(day int) int {
	if day < 1 {
		return 1
	}
	if day > maxDays {
		return maxDays
	}
	return day
}

func (m Model) loadWeekMetadata(wp core.WeekPath) Model {
	m.parsedWords = nil
	m.flashcardChecked = nil
	m.words = ""
	if data, err := m.storage.ReadWeekFile(wp, "words.md"); err == nil {
		m.words = string(data)
		m.parsedWords = parseWordsMarkdown(m.words)
		m.flashcardChecked = make([]bool, len(m.parsedWords))
	}
	if data, err := m.storage.ReadWeekFile(wp, "topic.md"); err == nil {
		m.ideaResponse = string(data)
	}
	return m
}

func (m Model) switchToDay(day int) Model {
	day = clampDay(day)
	m.activeDay = day
	return m.loadDayArtifacts(m.weekPath, day)
}

func (m Model) loadDayArtifacts(wp core.WeekPath, day int) Model {
	m.readingText = defaultReadingParagraph
	m.listeningText = m.readingText
	m.readingLoaded = false
	m.readingTimer = 0
	m.readingWPM = 0
	m.readingTiming = false
	m.readingScrollOffset = 0
	m.readingComment = ""
	m.listeningPlaying = false
	m.dictationInput = ""
	m.dictationCursor = 0
	m.dictationScore = 0
	m.dictationScored = false
	m.dictationShowAnswer = false
	m.dictationInputMode = false
	m.speechInputMode = false
	m.speechInput = ""
	m.speechCursor = 0
	m.speechFeedback = ""
	m.speechTranscript = ""
	m.speechScrollOffset = 0
	m.speechRecording = false
	m.speechLoading = false
	m.speechAudioPath = ""
	daySelection := dayPath(wp, day)
	if data, err := m.storage.ReadDayFile(daySelection, "reading.md"); err == nil {
		m.readingText = extractBodyFromMarkdown(string(data))
		m.listeningText = m.readingText
		m.readingLoaded = true
	}
	if data, err := m.storage.ReadDayFile(daySelection, "feedback.md"); err == nil {
		m.speechFeedback = string(data)
	}
	if data, err := m.storage.ReadDayFile(daySelection, speechTranscriptFilename); err == nil {
		m.speechTranscript = strings.TrimSpace(string(data))
		if m.speechInput == "" {
			m.speechInput = m.speechTranscript
			m.speechCursor = len([]rune(m.speechInput))
		}
	}
	if m.storage.DayFileExists(daySelection, speechRecordingFilename) {
		m.speechAudioPath = filepath.Join(m.storage.GetDayDir(daySelection), speechRecordingFilename)
	}
	return m
}

func dayPath(wp core.WeekPath, day int) core.DayPath {
	return core.DayPath{Week: wp, Day: clampDay(day)}
}

func (m Model) currentDayPath() core.DayPath {
	return dayPath(m.weekPath, m.activeDay)
}

func (m Model) dayPathForWeek(wp core.WeekPath) core.DayPath {
	return dayPath(wp, m.activeDay)
}
