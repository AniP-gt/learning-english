"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { CEFRLevel } from "../types";
import { cefrLevels } from "../lib/constants";

export const useSettings = () => {
  const [apiKey, setApiKey] = useState("");
  const [cefrLevel, setCefrLevel] = useState<CEFRLevel>("B1");
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [settingsMessage, setSettingsMessage] = useState("");
  const timeoutRef = useRef<number | null>(null);

  useEffect(() => {
    if (typeof window === "undefined") {
      return;
    }
    const storedKey = localStorage.getItem("learning-api-key");
    const storedLevel = localStorage.getItem("learning-cefr-level") as CEFRLevel | null;
    if (storedKey) {
      setApiKey(storedKey);
    }
    if (storedLevel && cefrLevels.includes(storedLevel)) {
      setCefrLevel(storedLevel);
    }
  }, []);

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
    setSettingsMessage("Settings saved locally");
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }
    timeoutRef.current = window.setTimeout(() => {
      setSettingsMessage("");
      timeoutRef.current = null;
    }, 2500);
  }, [apiKey, cefrLevel]);

  return {
    apiKey,
    setApiKey,
    cefrLevel,
    setCefrLevel,
    settingsOpen,
    setSettingsOpen,
    settingsMessage,
    saveSettings,
  };
};
