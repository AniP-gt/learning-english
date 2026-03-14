package ui

import (
	"fmt"
	"os"
	"strings"
	"time"

	tea "github.com/charmbracelet/bubbletea"

	"github.com/AniP-gt/learning-english/pkg/core"
)

func (m Model) Update(msg tea.Msg) (tea.Model, tea.Cmd) {
	switch msg := msg.(type) {
	case tea.WindowSizeMsg:
		m.width = msg.Width
		m.height = msg.Height
		return m, nil

	case tickMsg:
		shouldTick := false
		if m.readingTiming {
			m.readingTimer++
			shouldTick = true
		}
		if m.speechRecording {
			if m.speechSecondsLeft > 0 {
				m.speechSecondsLeft--
			}
			if m.speechSecondsLeft > 0 {
				shouldTick = true
			}
		}
		if shouldTick {
			return m, tickCmd()
		}
		return m, nil

	case speechRecordingMsg:
		m.speechRecording = false
		m.speechSecondsLeft = 0
		if msg.err != nil {
			m.statusMsg = fmt.Sprintf("Recording error: %v", msg.err)
			return m, nil
		}
		m.speechAudioPath = msg.audioPath
		if !m.gemini.HasAPIKey() {
			m.statusMsg = "Recording saved. Set GEMINI_API_KEY to transcribe."
			return m, nil
		}
		m.speechLoading = true
		m.statusMsg = "Transcribing speech..."
		return m, m.transcribeRecordedSpeechCmd(msg.audioPath)

	case speechTranscriptionMsg:
		m.speechLoading = false
		if msg.audioPath != "" {
			m.speechAudioPath = msg.audioPath
		}
		if transcript := strings.TrimSpace(msg.transcript); transcript != "" {
			m.speechTranscript = transcript
			m.speechInput = transcript
			m.speechCursor = len([]rune(m.speechInput))
			_ = m.storage.WriteFile(m.weekPath, speechTranscriptFilename, []byte(transcript))
		}
		if msg.feedback != "" {
			m.speechFeedback = msg.feedback
			m.speechScrollOffset = 0
			_ = m.storage.WriteFile(m.weekPath, "feedback.md", []byte(msg.feedback))
		}
		if msg.err != nil {
			m.statusMsg = fmt.Sprintf("Transcription error: %v", msg.err)
			return m, nil
		}
		m.statusMsg = "Speech transcribed and analyzed."
		return m, nil

	case speechPlaybackMsg:
		if msg.err != nil {
			m.statusMsg = fmt.Sprintf("Playback error: %v", msg.err)
		} else {
			m.statusMsg = "Playback finished."
		}
		return m, nil

	case geminiResponseMsg:
		m.loading = false
		m.wordsLoading = false
		m.scene321Loading = false
		m.replyLoading = false
		if msg.err != nil {
			m.speechLoading = false
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
			m.speechLoading = false
			m.speechFeedback = msg.content
			m.speechScrollOffset = 0
			_ = m.storage.WriteFile(m.weekPath, "feedback.md", []byte(msg.content))
		case core.StepThreeTwoOne:
			m.scene321 = msg.content
		case core.StepRoleplay:
			reply := msg.content
			if m.replyFeedbackMode {
				m.replyFeedback = reply
				m.replyFeedbackMode = false
				m.statusMsg = "Done."
				return m, nil
			}
			m.replyMessages = append(m.replyMessages, replyMessage{
				role:    "assistant",
				content: reply,
			})
			m.replyLastAudio = reply
			speed := m.listeningSpeed
			return m, func() tea.Msg {
				playSay(reply, speed)
				return struct{}{}
			}
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

func (m Model) recordSpeechCmd() tea.Cmd {
	audioPath := buildSpeechRecordingPath(m.storage.GetWeekDir(m.weekPath))
	return func() tea.Msg {
		err := recordSpeechAudio(audioPath, speechRecordingSeconds*time.Second)
		return speechRecordingMsg{audioPath: audioPath, err: err}
	}
}

func (m Model) transcribeRecordedSpeechCmd(audioPath string) tea.Cmd {
	g := m.gemini
	return func() tea.Msg {
		audioData, err := os.ReadFile(audioPath)
		if err != nil {
			return speechTranscriptionMsg{audioPath: audioPath, err: err}
		}

		transcript, err := g.TranscribeSpeech(audioData)
		if err != nil {
			return speechTranscriptionMsg{audioPath: audioPath, err: err}
		}

		feedback, err := g.AnalyzeSpeech(transcript)
		return speechTranscriptionMsg{
			audioPath:  audioPath,
			transcript: transcript,
			feedback:   feedback,
			err:        err,
		}
	}
}

func (m Model) playSpeechRecordingCmd() tea.Cmd {
	audioPath := m.speechAudioPath
	return func() tea.Msg {
		return speechPlaybackMsg{err: playSpeechAudio(audioPath)}
	}
}
