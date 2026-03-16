package ui

import (
	"context"
	"errors"
	"fmt"
	"os"
	"os/exec"
	"path/filepath"
	"runtime"
	"strconv"
	"strings"
	"sync"
	"time"
)

const (
	speechRecordingFilename  = "speech.wav"
	speechTranscriptFilename = "speech_transcript.txt"
	speechRecordingSeconds   = 60
)

type speechAudioTools struct {
	recorderKind string
	recorderPath string
	playerPath   string
}

type listeningPlaybackFinishedMsg struct {
	playbackID int
	err        error
}

func detectSpeechAudioTools() speechAudioTools {
	tools := speechAudioTools{}
	if runtime.GOOS != "darwin" {
		return tools
	}

	if path, err := exec.LookPath("rec"); err == nil {
		tools.recorderKind = "rec"
		tools.recorderPath = path
	} else if path, err := exec.LookPath("sox"); err == nil {
		tools.recorderKind = "sox"
		tools.recorderPath = path
	}

	if path, err := exec.LookPath("afplay"); err == nil {
		tools.playerPath = path
	}

	return tools
}

var (
	recordingMu     sync.Mutex
	recordingCancel context.CancelFunc
	recordingCmd    *exec.Cmd

	speechPlaybackMu     sync.Mutex
	speechPlaybackCancel context.CancelFunc
	speechPlaybackCmd    *exec.Cmd
)

var errSpeechPlaybackStopped = errors.New("speech playback stopped")

func (t speechAudioTools) CanRecord() bool {
	return t.recorderPath != ""
}

func (t speechAudioTools) CanPlay() bool {
	return t.playerPath != ""
}

func (t speechAudioTools) Hint() string {
	if runtime.GOOS != "darwin" {
		return "Speech recording currently supports macOS only."
	}
	if !t.CanRecord() {
		return "Mic recording requires rec/sox on macOS (brew install sox)."
	}
	if !t.CanPlay() {
		return "Playback requires afplay on macOS."
	}
	return "Press r to record for 60s, then p to replay the saved clip."
}

func buildSpeechRecordingPath(weekDir string) string {
	return filepath.Join(weekDir, speechRecordingFilename)
}

func buildSpeechRecordArgs(recorderKind, outputPath string, duration time.Duration) ([]string, error) {
	if outputPath == "" {
		return nil, fmt.Errorf("recording path is required")
	}
	seconds := strconv.Itoa(int(duration.Round(time.Second) / time.Second))
	if seconds == "0" {
		seconds = strconv.Itoa(speechRecordingSeconds)
	}

	switch recorderKind {
	case "rec":
		return []string{"-q", "-c", "1", "-r", "16000", "-b", "16", outputPath, "trim", "0", seconds}, nil
	case "sox":
		return []string{"-q", "-d", "-c", "1", "-r", "16000", "-b", "16", outputPath, "trim", "0", seconds}, nil
	default:
		return nil, fmt.Errorf("unsupported recorder: %s", recorderKind)
	}
}

func recordSpeechAudio(outputPath string, duration time.Duration) error {
	tools := detectSpeechAudioTools()
	if !tools.CanRecord() {
		return errors.New(tools.Hint())
	}
	if err := os.MkdirAll(filepath.Dir(outputPath), 0o755); err != nil {
		return fmt.Errorf("failed to prepare speech directory: %w", err)
	}
	_ = os.Remove(outputPath)

	args, err := buildSpeechRecordArgs(tools.recorderKind, outputPath, duration)
	if err != nil {
		return err
	}

	ctx, cancel := context.WithTimeout(context.Background(), duration+5*time.Second)

	// store cancel so callers (UI) can cancel early
	recordingMu.Lock()
	recordingCancel = cancel
	cmd := exec.CommandContext(ctx, tools.recorderPath, args...)
	recordingCmd = cmd
	recordingMu.Unlock()

	output, err := cmd.CombinedOutput()

	// clear stored handles
	recordingMu.Lock()
	recordingCancel = nil
	recordingCmd = nil
	recordingMu.Unlock()

	if ctx.Err() == context.DeadlineExceeded {
		return fmt.Errorf("recording timed out after %ds", int(duration/time.Second))
	}
	if ctx.Err() == context.Canceled {
		return fmt.Errorf("recording canceled")
	}
	if err != nil {
		trimmed := strings.TrimSpace(string(output))
		if trimmed != "" {
			return fmt.Errorf("recording failed: %w (%s)", err, trimmed)
		}
		return fmt.Errorf("recording failed: %w", err)
	}
	return nil
}

func playSpeechAudio(path string) error {
	if path == "" {
		return fmt.Errorf("no recorded audio available")
	}
	if _, err := os.Stat(path); err != nil {
		return fmt.Errorf("recorded audio not found: %w", err)
	}

	tools := detectSpeechAudioTools()
	if !tools.CanPlay() {
		return errors.New(tools.Hint())
	}

	cmd := exec.Command(tools.playerPath, path)
	output, err := cmd.CombinedOutput()
	if err != nil {
		trimmed := strings.TrimSpace(string(output))
		if trimmed != "" {
			return fmt.Errorf("playback failed: %w (%s)", err, trimmed)
		}
		return fmt.Errorf("playback failed: %w", err)
	}
	return nil
}

func playSay(text string, speed int) error {
	if runtime.GOOS != "darwin" {
		return nil
	}

	ctx, cancel := context.WithCancel(context.Background())
	cmd := exec.CommandContext(ctx, "say", "-r", strconv.Itoa(speed), text)

	speechPlaybackMu.Lock()
	speechPlaybackCancel = cancel
	speechPlaybackCmd = cmd
	speechPlaybackMu.Unlock()

	output, err := cmd.CombinedOutput()

	speechPlaybackMu.Lock()
	if speechPlaybackCmd == cmd {
		speechPlaybackCancel = nil
		speechPlaybackCmd = nil
	}
	speechPlaybackMu.Unlock()

	if ctx.Err() == context.Canceled {
		return errSpeechPlaybackStopped
	}
	if err != nil {
		trimmed := strings.TrimSpace(string(output))
		if trimmed != "" {
			return fmt.Errorf("speech playback failed: %w (%s)", err, trimmed)
		}
		return fmt.Errorf("speech playback failed: %w", err)
	}
	return nil
}

// StopOngoingRecording requests cancellation of a running recording, if any.
// It is safe to call multiple times.
func StopOngoingRecording() error {
	recordingMu.Lock()
	cancel := recordingCancel
	cmd := recordingCmd
	recordingMu.Unlock()

	if cancel == nil && cmd == nil {
		return fmt.Errorf("no recording in progress")
	}

	if cancel != nil {
		cancel()
	}

	// give the process a short moment to exit; try killing if still running
	if cmd != nil && cmd.Process != nil {
		// best-effort
		_ = cmd.Process.Kill()
	}
	return nil
}

func StopOngoingSpeechPlayback() error {
	speechPlaybackMu.Lock()
	cancel := speechPlaybackCancel
	cmd := speechPlaybackCmd
	speechPlaybackMu.Unlock()

	if cancel == nil && cmd == nil {
		return fmt.Errorf("no speech playback in progress")
	}

	if cancel != nil {
		cancel()
	}

	if cmd != nil && cmd.Process != nil {
		_ = cmd.Process.Kill()
	}
	return nil
}
