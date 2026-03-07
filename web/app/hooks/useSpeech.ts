"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { SpeakVoice } from "../lib/types";

type UseSpeechParams = {
  readingOutput: string;
};

export const useSpeech = ({ readingOutput }: UseSpeechParams) => {
  const [voices, setVoices] = useState<SpeakVoice[]>([]);
  const [selectedVoice, setSelectedVoice] = useState("");
  const [speechRate, setSpeechRate] = useState(1);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [listeningSupported, setListeningSupported] = useState(false);

  useEffect(() => {
    if (typeof window === "undefined") {
      return;
    }
    const supported = "speechSynthesis" in window;
    const timeoutId = window.setTimeout(() => {
      setListeningSupported(supported);
    }, 0);

    if (!supported) {
      return () => window.clearTimeout(timeoutId);
    }

    const synthesizer = window.speechSynthesis;
    if (!synthesizer) {
      return () => window.clearTimeout(timeoutId);
    }

    const loadVoices = () => {
      const available = synthesizer.getVoices();
      const englishVoices = available.filter((voice) => voice.lang.toLowerCase().startsWith("en"));
      const preferred = englishVoices.length ? englishVoices : available;
      const normalized = preferred.map((voice) => ({
        name: voice.name,
        lang: voice.lang,
        voiceURI: voice.voiceURI,
      }));
      setVoices(normalized);
      setSelectedVoice((prev) => prev || normalized[0]?.voiceURI || "");
    };
    loadVoices();
    synthesizer.addEventListener("voiceschanged", loadVoices);
    return () => {
      window.clearTimeout(timeoutId);
      synthesizer.removeEventListener("voiceschanged", loadVoices);
    };
  }, []);

  const handleSpeak = useCallback(() => {
    if (!listeningSupported || !readingOutput || typeof window === "undefined") {
      return;
    }
    const synth = window.speechSynthesis;
    if (!synth) {
      return;
    }
    synth.cancel();
    const utterance = new SpeechSynthesisUtterance(readingOutput);
    // keep a reference so stop can target the exact utterance if needed
    utteranceRef.current = utterance;
    const preferredVoice = voices.find((voice) => voice.voiceURI === selectedVoice);
    if (preferredVoice) {
      const available = synth.getVoices();
      const match = available.find((candidate) => candidate.voiceURI === preferredVoice.voiceURI);
      if (match) {
        utterance.voice = match;
      }
    }
    utterance.rate = Math.min(Math.max(speechRate, 0.5), 2);
    utterance.onend = () => {
      // only clear if the current utterance is this one
      if (utteranceRef.current === utterance) utteranceRef.current = null;
      setIsSpeaking(false);
    };
    utterance.onerror = () => {
      if (utteranceRef.current === utterance) utteranceRef.current = null;
      setIsSpeaking(false);
    };
    setIsSpeaking(true);
    synth.speak(utterance);
  }, [listeningSupported, readingOutput, selectedVoice, voices, speechRate]);

  const utteranceRef = useRef<SpeechSynthesisUtterance | null>(null);

  const handleStop = useCallback(() => {
    if (typeof window === "undefined") return;
    const synth = window.speechSynthesis;
    if (!synth) return;
    // Try a gentle pause then cancel to ensure playback stops across platforms
    try {
      synth.pause();
    } catch (e) {
      // ignore
    }
    // Cancel any ongoing or queued utterances
    synth.cancel();
    // clear the active utterance reference
    utteranceRef.current = null;
    setIsSpeaking(false);
  }, []);

  return {
    voices,
    selectedVoice,
    setSelectedVoice,
    speechRate,
    setSpeechRate,
    isSpeaking,
    listeningSupported,
    handleSpeak,
    handleStop,
  };
};
