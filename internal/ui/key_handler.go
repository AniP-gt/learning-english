package ui

import (
	"fmt"
	"strings"

	tea "github.com/charmbracelet/bubbletea"

	"github.com/AniP-gt/learning-english/pkg/core"
	geminiPkg "github.com/AniP-gt/learning-english/pkg/gemini"
)

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
	if m.dictationInputMode {
		return m.handleDictationInput(msg)
	}
	if m.replyInputMode {
		return m.handleReplyInput(msg)
	}
	if m.wordsEditMode {
		return m.handleWordsEditKey(msg)
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
		// ensure we are on current week and that markdown files exist when user
		// switches to Step 1 (Idea). This makes starting today's study easier.
		m = m.ensureCurrentWeekAndFiles()
	case "2":
		m.activeStep = core.StepWords
	case "3":
		m.activeStep = core.StepReading
		m.readingScrollOffset = 0
	case "4":
		m.activeStep = core.StepListening
	case "5":
		m.activeStep = core.StepSpeech
		m.speechScrollOffset = 0
	case "6":
		m.activeStep = core.StepThreeTwoOne
	case "7":
		m.activeStep = core.StepRoleplay
		m.replyScrollOffset = 0

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

	case "[":
		if m.activeDay > 1 {
			m = m.switchToDay(m.activeDay - 1)
			m.statusMsg = fmt.Sprintf("Day %d", m.activeDay)
		}
	case "]":
		if m.activeDay < maxDays {
			m = m.switchToDay(m.activeDay + 1)
			m.statusMsg = fmt.Sprintf("Day %d", m.activeDay)
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
						m.readingComment = commentForWPM(m.readingWPM)
					}
				}
				return m, nil
			}

			m.readingTimer = 0
			m.readingWPM = 0
			m.readingTiming = true
			return m, tickCmd()

		case core.StepListening:
			return m.toggleListeningPlayback()
		}

	case "s":
		switch m.activeStep {
		case core.StepListening:
			return m.toggleListeningPlayback()
		case core.StepRoleplay:
			if m.replyLastAudio != "" {
				audio := m.replyLastAudio
				speed := m.listeningSpeed
				return m, func() tea.Msg {
					playSay(audio, speed)
					return struct{}{}
				}
			}
		}

	case "j":
		switch m.activeStep {
		case core.StepReading:
			m.readingScrollOffset++
		case core.StepSpeech:
			m.speechScrollOffset++
			// clamp will be applied in render path based on visible height
		case core.StepRoleplay:
			m.replyScrollOffset++
		}

	case "k":
		switch m.activeStep {
		case core.StepReading:
			if m.readingScrollOffset > 0 {
				m.readingScrollOffset--
			}
		case core.StepSpeech:
			if m.speechScrollOffset > 0 {
				m.speechScrollOffset--
			}
		case core.StepRoleplay:
			if m.replyScrollOffset > 0 {
				m.replyScrollOffset--
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
		if m.activeStep == core.StepSpeech {
			if m.speechRecording {
				m.statusMsg = "Recording already in progress..."
				return m, nil
			}
			if !m.speechCanRecord {
				m.statusMsg = m.speechAudioHint
				return m, nil
			}
			m.speechRecording = true
			m.speechLoading = false
			m.speechSecondsLeft = speechRecordingSeconds
			m.speechTranscript = ""
			m.speechFeedback = ""
			m.speechScrollOffset = 0
			m.statusMsg = "Recording speech for 60 seconds..."
			return m, tea.Batch(m.recordSpeechCmd(), tickCmd())
		}
		if m.activeStep == core.StepThreeTwoOne && m.image321Path != "" {
			m.image321Preview = renderTerminalImage(m.image321Path, m.width-12, m.height-14)
		}

	case "p":
		if m.activeStep == core.StepSpeech {
			if m.speechRecording {
				m.statusMsg = "Wait for recording to finish before playback."
				return m, nil
			}
			if m.speechAudioPath == "" {
				m.statusMsg = "No recorded audio available yet."
				return m, nil
			}
			if !m.speechCanPlay {
				m.statusMsg = m.speechAudioHint
				return m, nil
			}
			m.statusMsg = "Playing recorded speech..."
			return m, m.playSpeechRecordingCmd()
		}

	case "d":
		if m.activeStep == core.StepListening {
			m.dictationInputMode = true
			m.dictationCursor = len([]rune(m.dictationInput))
		}

	case "v":
		if m.activeStep == core.StepListening {
			m.dictationShowAnswer = !m.dictationShowAnswer
		}

	case "enter":
		if m.activeStep == core.StepListening {
			m.dictationScore = calcDictationScore(m.dictationInput, m.listeningText)
			m.dictationScored = true
		}

	case "i":
		if m.activeStep == core.StepIdea {
			m.ideaMode = true
			m.ideaInput = ""
			m.ideaCursor = 0
		}
		if m.activeStep == core.StepSpeech {
			m.speechInputMode = true
			m.speechInput = ""
			m.speechCursor = 0
		}
		if m.activeStep == core.StepRoleplay {
			m.replyInputMode = true
			m.replyInput = ""
			m.replyCursor = 0
		}

	case "f":
		if m.activeStep == core.StepWords && len(m.parsedWords) > 0 {
			m.flashcardMode = true
			m.flashcardIndex = 0
			m.flashcardFlipped = false
		}

	case "e":
		if m.activeStep == core.StepWords {
			m.wordsEditMode = true
			m.wordsCursor = 0
			m.statusMsg = "Words edit mode: use j/k to navigate, i: insert, u: update, d: delete, esc: exit"
		}

	case "ctrl+s":
		return m, m.saveToGit()

	case "esc":
		// Allow canceling an ongoing speech recording with Esc when on StepSpeech.
		if m.activeStep == core.StepSpeech && m.speechRecording {
			// best-effort stop the underlying recorder and update UI state
			_ = StopOngoingRecording()
			m.speechRecording = false
			m.speechSecondsLeft = 0
			m.statusMsg = "Recording canceled."
			return m, nil
		}
	}

	return m, nil
}

func (m Model) toggleListeningPlayback() (Model, tea.Cmd) {
	if !m.listeningPlaying {
		m.listeningPlaying = true
		m.listeningPlaybackID++
		return m, m.playSayCmd(m.listeningPlaybackID)
	}

	m.listeningPlaying = false
	if err := StopOngoingSpeechPlayback(); err != nil {
		m.statusMsg = fmt.Sprintf("Playback stop error: %v", err)
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
		// Ensure current week/files available before generating so output is
		// saved to the correct (current) week.
		m = m.ensureCurrentWeekAndFiles()
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
		text := strings.TrimSpace(m.speechInput)
		if text == "" {
			text = strings.TrimSpace(m.speechTranscript)
		}
		if text == "" {
			m.statusMsg = "Press 'r' to record or 'i' to enter speech first"
			return m, nil
		}
		m.speechLoading = true
		m.statusMsg = "Analyzing speech..."
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
				sceneText, sceneErr := g.GenerateImageScene(text)
				if sceneErr != nil {
					return imageGenMsg{err: fmt.Errorf("image generation error: %v; fallback text error: %v", err, sceneErr)}
				}
				txtName := "scene_321.txt"
				if saveErr := s.WriteFile(wp, txtName, []byte(sceneText)); saveErr != nil {
					return imageGenMsg{err: saveErr}
				}
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
	case core.StepRoleplay:
		if len(m.replyMessages) == 0 {
			m.statusMsg = "Press 'i' to start the conversation first"
			return m, nil
		}
		lastUserMsg := ""
		for i := len(m.replyMessages) - 1; i >= 0; i-- {
			if m.replyMessages[i].role == "user" {
				lastUserMsg = m.replyMessages[i].content
				break
			}
		}
		if lastUserMsg == "" {
			m.statusMsg = "No user message to give feedback on"
			return m, nil
		}
		m.replyFeedbackMode = true
		m.replyLoading = true
		m.statusMsg = "Getting feedback..."
		g := m.gemini
		return m, func() tea.Msg {
			content, err := g.FeedbackForReply(lastUserMsg)
			return geminiResponseMsg{content: content, err: err}
		}
	}
	return m, nil
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
	case tea.KeyLeft:
		if m.ideaCursor > 0 {
			m.ideaCursor--
		}
	case tea.KeyRight:
		runes := []rune(m.ideaInput)
		if m.ideaCursor < len(runes) {
			m.ideaCursor++
		}
	case tea.KeyBackspace:
		runes := []rune(m.ideaInput)
		if m.ideaCursor > 0 && len(runes) > 0 {
			m.ideaInput = string(runes[:m.ideaCursor-1]) + string(runes[m.ideaCursor:])
			m.ideaCursor--
		}
	case tea.KeyRunes, tea.KeySpace:
		runes := []rune(m.ideaInput)
		ins := msg.Runes
		m.ideaInput = string(runes[:m.ideaCursor]) + string(ins) + string(runes[m.ideaCursor:])
		m.ideaCursor += len(ins)
	}
	return m, nil
}

func (m Model) handleSpeechInput(msg tea.KeyMsg) (Model, tea.Cmd) {
	switch msg.Type {
	case tea.KeyEsc:
		m.speechInputMode = false
	case tea.KeyEnter:
		if m.speechInput != "" && m.gemini.HasAPIKey() {
			m.speechInputMode = false
			m.speechLoading = true
			m.speechTranscript = m.speechInput
			m.speechFeedback = ""
			m.speechScrollOffset = 0
			m.statusMsg = "Analyzing speech..."
			g := m.gemini
			text := m.speechInput
			return m, func() tea.Msg {
				content, err := g.AnalyzeSpeech(text)
				return geminiResponseMsg{content: content, err: err}
			}
		} else if m.speechInput != "" {
			m.speechInputMode = false
			m.statusMsg = "GEMINI_API_KEY not set"
		}
	case tea.KeyLeft:
		if m.speechCursor > 0 {
			m.speechCursor--
		}
	case tea.KeyRight:
		runes := []rune(m.speechInput)
		if m.speechCursor < len(runes) {
			m.speechCursor++
		}
	case tea.KeyBackspace:
		runes := []rune(m.speechInput)
		if m.speechCursor > 0 && len(runes) > 0 {
			m.speechInput = string(runes[:m.speechCursor-1]) + string(runes[m.speechCursor:])
			m.speechCursor--
		}
	case tea.KeyRunes, tea.KeySpace:
		runes := []rune(m.speechInput)
		ins := msg.Runes
		m.speechInput = string(runes[:m.speechCursor]) + string(ins) + string(runes[m.speechCursor:])
		m.speechCursor += len(ins)
	}
	return m, nil
}

func (m Model) handleDictationInput(msg tea.KeyMsg) (Model, tea.Cmd) {
	switch msg.Type {
	case tea.KeyEsc:
		m.dictationInputMode = false
	case tea.KeyEnter:
		m.dictationInputMode = false
		m.dictationScore = calcDictationScore(m.dictationInput, m.listeningText)
		m.dictationScored = true
	case tea.KeyLeft:
		if m.dictationCursor > 0 {
			m.dictationCursor--
		}
	case tea.KeyRight:
		runes := []rune(m.dictationInput)
		if m.dictationCursor < len(runes) {
			m.dictationCursor++
		}
	case tea.KeyBackspace:
		runes := []rune(m.dictationInput)
		if m.dictationCursor > 0 && len(runes) > 0 {
			m.dictationInput = string(runes[:m.dictationCursor-1]) + string(runes[m.dictationCursor:])
			m.dictationCursor--
		}
	case tea.KeyRunes, tea.KeySpace:
		runes := []rune(m.dictationInput)
		ins := msg.Runes
		m.dictationInput = string(runes[:m.dictationCursor]) + string(ins) + string(runes[m.dictationCursor:])
		m.dictationCursor += len(ins)
	}
	return m, nil
}

func (m Model) handleReplyInput(msg tea.KeyMsg) (Model, tea.Cmd) {
	switch msg.Type {
	case tea.KeyEsc:
		m.replyInputMode = false
	case tea.KeyEnter:
		if m.replyInput != "" && m.gemini.HasAPIKey() {
			userMsg := m.replyInput
			m.replyMessages = append(m.replyMessages, replyMessage{
				role:    "user",
				content: userMsg,
			})
			m.replyInput = ""
			m.replyCursor = 0
			m.replyInputMode = false
			m.replyLoading = true
			m.replyFeedback = ""
			m.statusMsg = "Waiting for reply..."
			g := m.gemini
			history := make([]geminiPkg.ReplyChatMessage, 0, len(m.replyMessages)-1)
			for _, rm := range m.replyMessages[:len(m.replyMessages)-1] {
				history = append(history, geminiPkg.ReplyChatMessage{Role: rm.role, Content: rm.content})
			}
			return m, func() tea.Msg {
				content, err := g.ReplyChat(history, userMsg)
				return geminiResponseMsg{content: content, err: err}
			}
		} else if m.replyInput != "" {
			m.replyMessages = append(m.replyMessages, replyMessage{
				role:    "user",
				content: m.replyInput,
			})
			m.replyInput = ""
			m.replyCursor = 0
			m.replyInputMode = false
			m.statusMsg = "GEMINI_API_KEY not set"
		}
	case tea.KeyLeft:
		if m.replyCursor > 0 {
			m.replyCursor--
		}
	case tea.KeyRight:
		runes := []rune(m.replyInput)
		if m.replyCursor < len(runes) {
			m.replyCursor++
		}
	case tea.KeyBackspace:
		runes := []rune(m.replyInput)
		if m.replyCursor > 0 && len(runes) > 0 {
			m.replyInput = string(runes[:m.replyCursor-1]) + string(runes[m.replyCursor:])
			m.replyCursor--
		}
	case tea.KeyRunes, tea.KeySpace:
		runes := []rune(m.replyInput)
		ins := msg.Runes
		m.replyInput = string(runes[:m.replyCursor]) + string(ins) + string(runes[m.replyCursor:])
		m.replyCursor += len(ins)
	}
	return m, nil
}
