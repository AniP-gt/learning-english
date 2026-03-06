"use client";

import { Dispatch, SetStateAction, useCallback } from "react";
import { CEFRLevel, GenerateRequestPayload } from "../types";
import { stripReadingHeader } from "../lib/constants";

type StatusSetter = Dispatch<SetStateAction<"idle" | "loading" | "ready">>;

type UseGenerateParams = {
  apiKey: string;
  cefrLevel: CEFRLevel;
  setWordsOutput: Dispatch<SetStateAction<string>>;
  setWordsStatus: StatusSetter;
  setReadingOutput: Dispatch<SetStateAction<string>>;
  setReadingStatus: StatusSetter;
};

export const useGenerate = ({
  apiKey,
  cefrLevel,
  setWordsOutput,
  setWordsStatus,
  setReadingOutput,
  setReadingStatus,
}: UseGenerateParams) => {
  const sendGenerate = useCallback(async (payload: GenerateRequestPayload) => {
    const headers: Record<string, string> = {
      "Content-Type": "application/json",
    };
    if (apiKey) {
      headers["x-api-key"] = apiKey;
    }

    const response = await fetch("/api/generate", {
      method: "POST",
      headers,
      body: JSON.stringify(payload),
      cache: "no-store",
    });

    if (!response.ok) {
      const message = await response.text();
      throw new Error(message || "Gemini request failed");
    }

    const data = await response.json();
    if (!data?.content) {
      throw new Error("Gemini returned empty content");
    }
    return data.content as string;
  }, [apiKey]);

  const generateWordsForTopic = useCallback(
    async (topic: string) => {
      setWordsStatus("loading");
      try {
        const words = await sendGenerate({ action: "words", input: topic, cefrLevel });
        setWordsOutput(words);
        setWordsStatus("ready");
        return words;
      } catch (error) {
        setWordsStatus("idle");
        throw error;
      }
    },
    [cefrLevel, sendGenerate, setWordsOutput, setWordsStatus]
  );

  const generateReadingForTopic = useCallback(
    async (topic: string) => {
      setReadingStatus("loading");
      try {
        const reading = await sendGenerate({ action: "reading", input: topic, cefrLevel });
        setReadingOutput(stripReadingHeader(reading));
        setReadingStatus("ready");
        return reading;
      } catch (error) {
        setReadingStatus("idle");
        throw error;
      }
    },
    [cefrLevel, sendGenerate, setReadingOutput, setReadingStatus]
  );

  return { sendGenerate, generateWordsForTopic, generateReadingForTopic };
};
