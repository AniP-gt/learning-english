"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { CEFRLevel } from "../types";
import { cefrLevels } from "../lib/constants";
import {
  defaultGeminiModel,
  geminiModels,
  type GeminiModel,
} from "../lib/geminiModels";

export const useSettings = () => {
  const [apiKey, setApiKey] = useState("");
  const [cefrLevel, setCefrLevel] = useState<CEFRLevel>("B1");
  const [geminiModel, setGeminiModel] = useState<GeminiModel>(defaultGeminiModel);
  const [voice, setVoice] = useState<string>("");
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [settingsMessage, setSettingsMessage] = useState("");
  const timeoutRef = useRef<number | null>(null);

  useEffect(() => {
    if (typeof window === "undefined") {
      return;
    }
    const storedKey = localStorage.getItem("learning-api-key");
    const storedLevel = localStorage.getItem("learning-cefr-level") as CEFRLevel | null;
    const storedModel = localStorage.getItem("learning-gemini-model") as GeminiModel | null;
    const storedVoice = localStorage.getItem("learning-voice");

    // If no stored settings at all (including voice), nothing to hydrate
    if (!storedKey && !storedLevel && !storedModel && !storedVoice) {
      return;
    }

      const timeoutId = window.setTimeout(() => {
        if (storedKey) {
          setApiKey(storedKey);
        }
        if (storedLevel && cefrLevels.includes(storedLevel)) {
          setCefrLevel(storedLevel);
        }
        if (storedModel && geminiModels.includes(storedModel)) {
          setGeminiModel(storedModel);
        }
        if (storedVoice) {
          setVoice(storedVoice);
        }
      }, 0);

    return () => {
      window.clearTimeout(timeoutId);
    };
  }, []);

  // (no auto-save) voice is persisted only when saveSettings() is invoked by the user

  useEffect(() => {
    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, []);

  const saveSettings = useCallback(() => {
    if (typeof window === "undefined") {
      return;
    }
    localStorage.setItem("learning-api-key", apiKey);
    localStorage.setItem("learning-cefr-level", cefrLevel);
    localStorage.setItem("learning-gemini-model", geminiModel);
    localStorage.setItem("learning-voice", voice);
    setSettingsMessage("Settings saved locally");
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }
    timeoutRef.current = window.setTimeout(() => {
      setSettingsMessage("");
      timeoutRef.current = null;
    }, 2500);
  }, [apiKey, cefrLevel, geminiModel, voice]);

  return {
    apiKey,
    setApiKey,
    cefrLevel,
    setCefrLevel,
    geminiModel,
    setGeminiModel,
    settingsOpen,
    setSettingsOpen,
    settingsMessage,
    saveSettings,
    voice,
    setVoice,
  };
};
