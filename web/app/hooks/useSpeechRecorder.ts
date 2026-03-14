"use client";

import { useCallback, useEffect, useRef, useState } from "react";

type UseSpeechRecorderParams = {
  recordingLimitSeconds?: number;
};

type UseSpeechRecorderResult = {
  recordingSupported: boolean;
  isRecording: boolean;
  remainingSeconds: number;
  recordingReady: boolean;
  recordingDurationMs: number;
  audioUrl: string | null;
  audioBlob: Blob | null;
  audioMimeType: string;
  recordingError: string;
  recordingLimitSeconds: number;
  startRecording: () => Promise<void>;
  stopRecording: () => void;
  resetRecording: () => void;
};

const DEFAULT_AUDIO_MIME_TYPE = "audio/webm";

export const useSpeechRecorder = ({ recordingLimitSeconds = 60 }: UseSpeechRecorderParams = {}): UseSpeechRecorderResult => {
  const [recordingSupported] = useState(() => {
    return typeof navigator !== "undefined" && Boolean(navigator.mediaDevices?.getUserMedia) && typeof MediaRecorder !== "undefined";
  });
  const [isRecording, setIsRecording] = useState(false);
  const [remainingSeconds, setRemainingSeconds] = useState(recordingLimitSeconds);
  const [recordingReady, setRecordingReady] = useState(false);
  const [recordingDurationMs, setRecordingDurationMs] = useState(0);
  const [audioUrl, setAudioUrl] = useState<string | null>(null);
  const [audioBlob, setAudioBlob] = useState<Blob | null>(null);
  const [audioMimeType, setAudioMimeType] = useState(DEFAULT_AUDIO_MIME_TYPE);
  const [recordingError, setRecordingError] = useState("");

  const timerRef = useRef<number | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const recorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const audioUrlRef = useRef<string | null>(null);
  const isRecordingRef = useRef(false);
  const startTimestampRef = useRef(0);

  const clearTimer = useCallback(() => {
    if (typeof window === "undefined") {
      return;
    }
    if (timerRef.current !== null) {
      window.clearInterval(timerRef.current);
      timerRef.current = null;
    }
  }, []);

  const releaseAudioUrl = useCallback(() => {
    if (audioUrlRef.current) {
      URL.revokeObjectURL(audioUrlRef.current);
      audioUrlRef.current = null;
    }
  }, []);

  const stopRecording = useCallback(() => {
    if (!isRecordingRef.current) {
      return;
    }

    isRecordingRef.current = false;
    setIsRecording(false);
    clearTimer();
    setRemainingSeconds(recordingLimitSeconds);

    const recorder = recorderRef.current;
    if (recorder && recorder.state !== "inactive") {
      recorder.stop();
    }
    recorderRef.current = null;

    const stream = streamRef.current;
    if (stream) {
      stream.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
    }
  }, [clearTimer, recordingLimitSeconds]);

  const startRecording = useCallback(async () => {
    if (isRecordingRef.current) {
      return;
    }
    if (!recordingSupported) {
      setRecordingError("Microphone recording is unsupported in this browser.");
      return;
    }

    setRecordingError("");
    releaseAudioUrl();
    setAudioUrl(null);
    setAudioBlob(null);
    setAudioMimeType(DEFAULT_AUDIO_MIME_TYPE);
    setRecordingReady(false);
    setRecordingDurationMs(0);
    setRemainingSeconds(recordingLimitSeconds);

    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      streamRef.current = stream;
      chunksRef.current = [];
      startTimestampRef.current = Date.now();

      const recorder = new MediaRecorder(stream);
      recorderRef.current = recorder;

      recorder.addEventListener("dataavailable", (event) => {
        if (event.data.size > 0) {
          chunksRef.current.push(event.data);
        }
      });

      recorder.addEventListener("stop", () => {
        const mimeType = recorder.mimeType || DEFAULT_AUDIO_MIME_TYPE;
        const blob = new Blob(chunksRef.current, { type: mimeType });
        releaseAudioUrl();
        const nextAudioUrl = URL.createObjectURL(blob);
        audioUrlRef.current = nextAudioUrl;
        setAudioUrl(nextAudioUrl);
        setAudioBlob(blob);
        setAudioMimeType(mimeType);
        setRecordingReady(blob.size > 0);
        setRecordingDurationMs(Date.now() - startTimestampRef.current);
      });

      recorder.start();
      isRecordingRef.current = true;
      setIsRecording(true);
      clearTimer();
      timerRef.current = window.setInterval(() => {
        setRemainingSeconds((prev) => {
          if (prev <= 1) {
            stopRecording();
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    } catch (error) {
      setRecordingError(error instanceof Error ? error.message : "Unable to access microphone.");
      clearTimer();
      setIsRecording(false);
      isRecordingRef.current = false;
    }
  }, [clearTimer, recordingLimitSeconds, recordingSupported, releaseAudioUrl, stopRecording]);

  const resetRecording = useCallback(() => {
    if (isRecordingRef.current) {
      stopRecording();
    }
    releaseAudioUrl();
    setAudioUrl(null);
    setAudioBlob(null);
    setAudioMimeType(DEFAULT_AUDIO_MIME_TYPE);
    setRecordingReady(false);
    setRecordingDurationMs(0);
    setRecordingError("");
    setRemainingSeconds(recordingLimitSeconds);
  }, [recordingLimitSeconds, releaseAudioUrl, stopRecording]);

  useEffect(() => {
    return () => {
      stopRecording();
      releaseAudioUrl();
    };
  }, [releaseAudioUrl, stopRecording]);

  return {
    recordingSupported,
    isRecording,
    remainingSeconds,
    recordingReady,
    recordingDurationMs,
    audioUrl,
    audioBlob,
    audioMimeType,
    recordingError,
    recordingLimitSeconds,
    startRecording,
    stopRecording,
    resetRecording,
  };
};
