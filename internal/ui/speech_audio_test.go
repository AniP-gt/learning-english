package ui

import (
	"reflect"
	"testing"
	"time"
)

func TestBuildSpeechRecordArgsForRec(t *testing.T) {
	args, err := buildSpeechRecordArgs("rec", "/tmp/speech.wav", 60*time.Second)
	if err != nil {
		t.Fatalf("buildSpeechRecordArgs returned error: %v", err)
	}

	want := []string{"-q", "-c", "1", "-r", "16000", "-b", "16", "/tmp/speech.wav", "trim", "0", "60"}
	if !reflect.DeepEqual(args, want) {
		t.Fatalf("unexpected args\nwant: %#v\ngot:  %#v", want, args)
	}
}

func TestBuildSpeechRecordArgsForSox(t *testing.T) {
	args, err := buildSpeechRecordArgs("sox", "/tmp/speech.wav", 45*time.Second)
	if err != nil {
		t.Fatalf("buildSpeechRecordArgs returned error: %v", err)
	}

	want := []string{"-q", "-d", "-c", "1", "-r", "16000", "-b", "16", "/tmp/speech.wav", "trim", "0", "45"}
	if !reflect.DeepEqual(args, want) {
		t.Fatalf("unexpected args\nwant: %#v\ngot:  %#v", want, args)
	}
}

func TestBuildSpeechRecordArgsRejectsUnknownRecorder(t *testing.T) {
	if _, err := buildSpeechRecordArgs("", "/tmp/speech.wav", time.Second); err == nil {
		t.Fatal("expected error for unknown recorder")
	}
}
