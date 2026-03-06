"use client";

import { useCallback, useMemo, useState } from "react";
import { ChatHistoryEntry } from "../types";
import { parseMarkdownTable, parseTopicFromIdea, reviewsCopy } from "../lib/constants";
import { WordsTable } from "../lib/types";
import { useGenerate } from "./useGenerate";
import { useWeeks } from "./useWeeks";
import { useSpeech } from "./useSpeech";
import { useTimer } from "./useTimer";
import { useSettings } from "./useSettings";

export const useLearning = () => {
  const {
    apiKey,
    setApiKey,
    cefrLevel,
    setCefrLevel,
    settingsOpen,
    setSettingsOpen,
    settingsMessage,
    saveSettings,
  } = useSettings();

  const [topicInput, setTopicInput] = useState("");
  const [ideaResponse, setIdeaResponse] = useState("");
  const [topicHeader, setTopicHeader] = useState("");
  const [wordsOutput, setWordsOutput] = useState("");
  const [readingOutput, setReadingOutput] = useState("");
  const [ideaLoading, setIdeaLoading] = useState(false);
  const [wordsStatus, setWordsStatus] = useState<"idle" | "loading" | "ready">("idle");
  const [readingStatus, setReadingStatus] = useState<"idle" | "loading" | "ready">("idle");
  const [derivedStage, setDerivedStage] = useState<"idle" | "loading" | "done">("idle");
  const [errorMessage, setErrorMessage] = useState("");
  const [speechText, setSpeechText] = useState("");
  const [speechFeedback, setSpeechFeedback] = useState("");
  const [speechLoading, setSpeechLoading] = useState(false);
  const [speechError, setSpeechError] = useState("");
  const [scenePrompt, setScenePrompt] = useState("");
  const [sceneLoading, setSceneLoading] = useState(false);
  const [sceneError, setSceneError] = useState("");
  const [chatHistory, setChatHistory] = useState<ChatHistoryEntry[]>([]);
  const [chatInput, setChatInput] = useState("");
  const [chatLoading, setChatLoading] = useState(false);
  const [chatError, setChatError] = useState("");
  const [feedbackMessage, setFeedbackMessage] = useState("");
  const [feedbackLoading, setFeedbackLoading] = useState(false);
  const [feedbackError, setFeedbackError] = useState("");

  const readingWordCount = useMemo(() => {
    if (!readingOutput) {
      return 0;
    }
    return readingOutput.split(/\s+/).filter(Boolean).length;
  }, [readingOutput]);

  const { sendGenerate, generateWordsForTopic, generateReadingForTopic } = useGenerate({
    apiKey,
    cefrLevel,
    setWordsOutput,
    setWordsStatus,
    setReadingOutput,
    setReadingStatus,
  });

  const {
    weeks,
    weeksLoading,
    weeksError,
    activeWeek,
    weekFilesLoading,
    setActiveWeek,
    loadWeekFiles,
    currentWeekKey,
  } = useWeeks({
    setIdeaResponse,
    setTopicHeader,
    setWordsOutput,
    setWordsStatus,
    setReadingOutput,
    setReadingStatus,
    setDerivedStage,
  });

  const {
    voices,
    selectedVoice,
    setSelectedVoice,
    speechRate,
    setSpeechRate,
    isSpeaking,
    listeningSupported,
    handleSpeak,
  } = useSpeech({ readingOutput });

  const { timerSeconds, isTiming, handleStartTimer, handleStopTimer, resetTimer, wpmResult } = useTimer({
    readingOutput,
    readingWordCount,
    setErrorMessage,
  });

  const wordsTable = useMemo<WordsTable>(() => parseMarkdownTable(wordsOutput), [wordsOutput]);
  const wordsCount = wordsTable?.rows.length ?? 0;
  const sceneSourceText = useMemo(() => {
    const spoken = speechText.trim();
    if (spoken) {
      return spoken;
    }
    return readingOutput.trim();
  }, [readingOutput, speechText]);
  const hasUserMessage = useMemo(
    () => chatHistory.some((message) => message.role === "user"),
    [chatHistory]
  );

  const handleGenerateTopic = useCallback(async () => {
    if (!topicInput.trim()) {
      setErrorMessage("日本語のネタを入力してください。");
      return;
    }
    setErrorMessage("");
    setDerivedStage("loading");
    setIdeaLoading(true);
    setIdeaResponse("");
    setTopicHeader("");
    setWordsOutput("");
    setReadingOutput("");
    setWordsStatus("loading");
    setReadingStatus("loading");
    resetTimer();

    try {
      const idea = await sendGenerate({ action: "topic", input: topicInput.trim() });
      setIdeaResponse(idea);
      const parsed = parseTopicFromIdea(idea);
      setTopicHeader(parsed);
      try {
        await Promise.all([generateWordsForTopic(parsed), generateReadingForTopic(parsed)]);
        setDerivedStage("done");
      } catch (innerError) {
        setDerivedStage("idle");
        setErrorMessage(innerError instanceof Error ? innerError.message : "生成に失敗しました。");
      }
    } catch (outerError) {
      setDerivedStage("idle");
      setWordsStatus("idle");
      setReadingStatus("idle");
      setErrorMessage(outerError instanceof Error ? outerError.message : "トピック生成に失敗しました。");
    } finally {
      setIdeaLoading(false);
    }
  }, [topicInput, generateWordsForTopic, generateReadingForTopic, sendGenerate, resetTimer]);

  const handleRegenerateWords = useCallback(async () => {
    if (!topicHeader) {
      setErrorMessage("先にトピックを生成してください。");
      return;
    }
    setErrorMessage("");
    try {
      await generateWordsForTopic(topicHeader);
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : "Words generation failed");
    }
  }, [topicHeader, generateWordsForTopic]);

  const handleRegenerateReading = useCallback(async () => {
    if (!topicHeader) {
      setErrorMessage("先にトピックを生成してください。");
      return;
    }
    setErrorMessage("");
    try {
      await generateReadingForTopic(topicHeader);
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : "Reading generation failed");
    }
  }, [topicHeader, generateReadingForTopic]);

  const handleAnalyzeSpeech = useCallback(async () => {
    const trimmed = speechText.trim();
    if (!trimmed) {
      setSpeechError("音声テキストを入力してください。");
      return;
    }
    setSpeechError("");
    setSpeechLoading(true);
    try {
      const feedback = await sendGenerate({ action: "speech", input: trimmed, cefrLevel });
      setSpeechFeedback(feedback);
    } catch (error) {
      setSpeechError(error instanceof Error ? error.message : "分析に失敗しました。");
    } finally {
      setSpeechLoading(false);
    }
  }, [cefrLevel, sendGenerate, speechText]);

  const handleGenerateScene = useCallback(async () => {
    const source = speechText.trim() || readingOutput.trim();
    if (!source) {
      setSceneError("SpeechかReadingのテキストが必要です。");
      return;
    }
    setSceneError("");
    setSceneLoading(true);
    setScenePrompt("");
    try {
      const scene = await sendGenerate({ action: "image_prompt", input: source });
      setScenePrompt(scene);
    } catch (error) {
      setSceneError(error instanceof Error ? error.message : "Scene を生成できませんでした。");
    } finally {
      setSceneLoading(false);
    }
  }, [readingOutput, sendGenerate, speechText]);

  const handleSendChat = useCallback(async () => {
    const trimmed = chatInput.trim();
    if (!trimmed) {
      setChatError("メッセージを入力してください。");
      return;
    }
    setChatError("");
    setChatLoading(true);
    const userMessage: ChatHistoryEntry = { role: "user", content: trimmed };
    const requestHistory = [...chatHistory, userMessage];
    try {
      const reply = await sendGenerate({
        action: "chat",
        input: trimmed,
        cefrLevel,
        history: requestHistory,
      });
      setChatHistory([...requestHistory, { role: "assistant", content: reply }]);
      setChatInput("");
      setFeedbackMessage("");
    } catch (error) {
      setChatError(error instanceof Error ? error.message : "送信に失敗しました。");
    } finally {
      setChatLoading(false);
    }
  }, [cefrLevel, chatHistory, chatInput, sendGenerate]);

  const handleRequestFeedback = useCallback(async () => {
    const lastUser = [...chatHistory].reverse().find((item) => item.role === "user");
    if (!lastUser) {
      setFeedbackError("先にユーザーの発言を送信してください。");
      return;
    }
    setFeedbackError("");
    setFeedbackLoading(true);
    try {
      const feedback = await sendGenerate({
        action: "feedback",
        input: lastUser.content,
        cefrLevel,
        history: chatHistory,
      });
      setFeedbackMessage(feedback);
    } catch (error) {
      setFeedbackError(error instanceof Error ? error.message : "フィードバックを取得できませんでした。");
    } finally {
      setFeedbackLoading(false);
    }
  }, [cefrLevel, chatHistory, sendGenerate]);

  return {
    apiKey,
    setApiKey,
    cefrLevel,
    setCefrLevel,
    settingsOpen,
    setSettingsOpen,
    settingsMessage,
    saveSettings,
    topicInput,
    setTopicInput,
    ideaResponse,
    topicHeader,
    wordsOutput,
    readingOutput,
    wordsStatus,
    readingStatus,
    ideaLoading,
    derivedStage,
    errorMessage,
    setErrorMessage,
    timerSeconds,
    isTiming,
    wpmResult,
    speechText,
    setSpeechText,
    speechFeedback,
    speechLoading,
    speechError,
    scenePrompt,
    sceneLoading,
    sceneError,
    sceneSourceText,
    chatHistory,
    chatInput,
    setChatInput,
    chatLoading,
    chatError,
    feedbackMessage,
    feedbackLoading,
    feedbackError,
    handleGenerateTopic,
    handleRegenerateWords,
    handleRegenerateReading,
    handleStartTimer,
    handleStopTimer,
    handleAnalyzeSpeech,
    handleGenerateScene,
    handleSendChat,
    handleRequestFeedback,
    wordsTable,
    wordsCount,
    readingWordCount,
    hasUserMessage,
    voices,
    selectedVoice,
    setSelectedVoice,
    speechRate,
    setSpeechRate,
    isSpeaking,
    listeningSupported,
    handleSpeak,
    weeks,
    weeksLoading,
    weeksError,
    activeWeek,
    weekFilesLoading,
    setActiveWeek,
    loadWeekFiles,
    currentWeekKey,
    reviewsCopy,
  };
};
