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
	defer cancel()

	cmd := exec.CommandContext(ctx, tools.recorderPath, args...)
	output, err := cmd.CombinedOutput()
	if ctx.Err() == context.DeadlineExceeded {
		return fmt.Errorf("recording timed out after %ds", int(duration/time.Second))
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
