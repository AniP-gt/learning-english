"use client";

import { useCallback, useEffect, useState } from "react";
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
    const preferredVoice = voices.find((voice) => voice.voiceURI === selectedVoice);
    if (preferredVoice) {
      const available = synth.getVoices();
      const match = available.find((candidate) => candidate.voiceURI === preferredVoice.voiceURI);
      if (match) {
        utterance.voice = match;
      }
    }
    utterance.rate = Math.min(Math.max(speechRate, 0.5), 2);
    utterance.onend = () => setIsSpeaking(false);
    utterance.onerror = () => setIsSpeaking(false);
    setIsSpeaking(true);
    synth.speak(utterance);
  }, [listeningSupported, readingOutput, selectedVoice, voices, speechRate]);

  return {
    voices,
    selectedVoice,
    setSelectedVoice,
    speechRate,
    setSpeechRate,
    isSpeaking,
    listeningSupported,
    handleSpeak,
  };
};
