"use client";

import { useCallback, useEffect, useRef, useState } from "react";

type UseSpeechRecognitionParams = {
  lang?: string;
};

type SpeechRecognitionAlternativeLike = {
  transcript: string;
};

type SpeechRecognitionResultLike = {
  isFinal: boolean;
  length: number;
  [index: number]: SpeechRecognitionAlternativeLike;
};

type SpeechRecognitionResultListLike = {
  length: number;
  [index: number]: SpeechRecognitionResultLike;
};

type SpeechRecognitionEventLike = {
  results: SpeechRecognitionResultListLike;
};

type SpeechRecognitionErrorEventLike = {
  error: string;
};

type BrowserSpeechRecognition = {
  continuous: boolean;
  interimResults: boolean;
  lang: string;
  onstart: (() => void) | null;
  onresult: ((event: SpeechRecognitionEventLike) => void) | null;
  onerror: ((event: SpeechRecognitionErrorEventLike) => void) | null;
  onend: (() => void) | null;
  start: () => void;
  stop: () => void;
  abort: () => void;
};

type BrowserSpeechRecognitionConstructor = new () => BrowserSpeechRecognition;

declare global {
  interface Window {
    SpeechRecognition?: BrowserSpeechRecognitionConstructor;
    webkitSpeechRecognition?: BrowserSpeechRecognitionConstructor;
  }
}

const DEFAULT_LANGUAGE = "en-US";

const getSpeechRecognitionConstructor = () => {
  if (typeof window === "undefined") {
    return null;
  }

  return window.SpeechRecognition ?? window.webkitSpeechRecognition ?? null;
};

const normalizeRecognitionTranscript = (results: SpeechRecognitionResultListLike) => {
  const segments: string[] = [];

  for (let resultIndex = 0; resultIndex < results.length; resultIndex += 1) {
    const result = results[resultIndex];
    const transcript = result?.[0]?.transcript?.trim();
    if (transcript) {
      segments.push(transcript);
    }
  }

  return segments.join(" ").replace(/\s+/g, " ").trim();
};

const getRecognitionErrorMessage = (error: string) => {
  switch (error) {
    case "audio-capture":
      return "Browser speech recognition could not access the microphone.";
    case "network":
      return "Browser speech recognition failed because of a network issue.";
    case "not-allowed":
    case "service-not-allowed":
      return "Browser speech recognition permission was denied.";
    case "language-not-supported":
      return "Browser speech recognition does not support English recognition on this browser.";
    case "no-speech":
      return "Browser speech recognition did not detect any speech.";
    default:
      return "Browser speech recognition failed.";
  }
};

export const useSpeechRecognition = ({ lang = DEFAULT_LANGUAGE }: UseSpeechRecognitionParams = {}) => {
  const [recognitionSupported, setRecognitionSupported] = useState(false);
  const [isRecognizing, setIsRecognizing] = useState(false);
  const [transcript, setTranscript] = useState("");
  const [error, setError] = useState("");

  const recognitionRef = useRef<BrowserSpeechRecognition | null>(null);
  const shouldContinueRef = useRef(false);

  useEffect(() => {
    setRecognitionSupported(Boolean(getSpeechRecognitionConstructor()));
  }, []);

  const stopRecognition = useCallback(() => {
    shouldContinueRef.current = false;
    recognitionRef.current?.stop();
  }, []);

  const resetRecognition = useCallback(() => {
    shouldContinueRef.current = false;
    recognitionRef.current?.abort();
    recognitionRef.current = null;
    setIsRecognizing(false);
    setTranscript("");
    setError("");
  }, []);

  const startRecognition = useCallback(() => {
    if (shouldContinueRef.current) {
      return;
    }

    const Recognition = getSpeechRecognitionConstructor();
    if (!Recognition) {
      setRecognitionSupported(false);
      setError("Browser speech recognition is unavailable in this browser.");
      return;
    }

    setRecognitionSupported(true);
    setTranscript("");
    setError("");
    shouldContinueRef.current = true;

    const recognition = new Recognition();
    recognitionRef.current = recognition;
    recognition.lang = lang;
    recognition.continuous = true;
    recognition.interimResults = true;
    recognition.onstart = () => {
      setIsRecognizing(true);
    };
    recognition.onresult = (event) => {
      setTranscript(normalizeRecognitionTranscript(event.results));
    };
    recognition.onerror = (event) => {
      const message = getRecognitionErrorMessage(event.error);
      setError(message);

      if (event.error !== "no-speech") {
        shouldContinueRef.current = false;
      }
    };
    recognition.onend = () => {
      if (!shouldContinueRef.current) {
        recognitionRef.current = null;
        setIsRecognizing(false);
        return;
      }

      try {
        recognition.start();
      } catch {
        shouldContinueRef.current = false;
        recognitionRef.current = null;
        setIsRecognizing(false);
      }
    };

    try {
      recognition.start();
    } catch {
      shouldContinueRef.current = false;
      recognitionRef.current = null;
      setIsRecognizing(false);
      setError("Browser speech recognition could not start.");
    }
  }, [lang]);

  useEffect(() => {
    return () => {
      shouldContinueRef.current = false;
      recognitionRef.current?.abort();
      recognitionRef.current = null;
    };
  }, []);

  return {
    recognitionSupported,
    isRecognizing,
    transcript,
    error,
    startRecognition,
    stopRecognition,
    resetRecognition,
  };
};
