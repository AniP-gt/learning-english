"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { ChatHistoryEntry } from "../types";
import { parseMarkdownTable, parseTopicFromIdea, reviewsCopy } from "../lib/constants";
import { WordsTable } from "../lib/types";

const MANUAL_WORDS_KEY = "learning-manual-words-md";
const MANUAL_READING_KEY = "learning-manual-reading";
const MANUAL_SCENE_IMAGE_KEY = "learning-manual-scene-image";
import { useGenerate } from "./useGenerate";
import { useWeeks } from "./useWeeks";
import { useSpeech } from "./useSpeech";
import { useTimer } from "./useTimer";
import { useSettings } from "./useSettings";
import { useSpeechRecorder } from "./useSpeechRecorder";

export const useLearning = () => {
  const {
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
  const [weekImageUrl, setWeekImageUrl] = useState<string>("");
  const [chatHistory, setChatHistory] = useState<ChatHistoryEntry[]>([]);
  const [chatInput, setChatInput] = useState("");
  const [chatLoading, setChatLoading] = useState(false);
  const [chatError, setChatError] = useState("");
  const [feedbackMessage, setFeedbackMessage] = useState("");
  const [feedbackLoading, setFeedbackLoading] = useState(false);
  const [feedbackError, setFeedbackError] = useState("");
  const [dictationText, setDictationText] = useState("");
  const [dictationScore, setDictationScore] = useState<number | null>(null);
  const [showAnswer, setShowAnswer] = useState(false);
  const [speechRecordingTranscript, setSpeechRecordingTranscript] = useState("");
  const [speechTranscriptionError, setSpeechTranscriptionError] = useState("");
  const [speechTranscriptionLoading, setSpeechTranscriptionLoading] = useState(false);
  const [persistedSpeechRecordingUrl, setPersistedSpeechRecordingUrl] = useState<string | null>(null);

  const readingWordCount = useMemo(() => {
    if (!readingOutput) {
      return 0;
    }
    return readingOutput.split(/\s+/).filter(Boolean).length;
  }, [readingOutput]);

  const { sendGenerate, generateWordsForTopic, generateReadingForTopic } = useGenerate({
    apiKey,
    cefrLevel,
    geminiModel,
    setWordsOutputAction: setWordsOutput,
    setWordsStatusAction: setWordsStatus,
    setReadingOutputAction: setReadingOutput,
    setReadingStatusAction: setReadingStatus,
  });

  const {
    weeks,
    weeksLoading,
    weeksError,
    activeWeek,
    weekFilesLoading,
    storageMetadata,
    availableDays,
    activeDay,
    setActiveWeek,
    loadWeekFiles,
    selectDay,
    currentWeekKey,
  } = useWeeks({
    setIdeaResponseAction: setIdeaResponse,
    setTopicHeaderAction: setTopicHeader,
    setWordsOutputAction: setWordsOutput,
    setWordsStatusAction: setWordsStatus,
    setReadingOutputAction: setReadingOutput,
    setReadingStatusAction: setReadingStatus,
    setDerivedStageAction: setDerivedStage,
    setSpeechFeedbackAction: setSpeechFeedback,
    setSpeechTranscriptAction: setSpeechRecordingTranscript,
    setSpeechTextAction: setSpeechText,
    setSpeechAudioUrlAction: setPersistedSpeechRecordingUrl,
    setWeekImageUrlAction: setWeekImageUrl,
  });

  const filesystemAvailable = storageMetadata?.available ?? true;
  const manualModeActive = storageMetadata !== null && !filesystemAvailable;
  const [manualWordsMarkdown, setManualWordsMarkdown] = useState("");
  const [persistedManualReading, setPersistedManualReading] = useState("");
  const [manualSceneImage, setManualSceneImage] = useState("");

  useEffect(() => {
    if (typeof window === "undefined") {
      return;
    }
    const storedWords = localStorage.getItem(MANUAL_WORDS_KEY) ?? "";
    if (storedWords) {
      setManualWordsMarkdown(storedWords);
    }
    const storedReading = localStorage.getItem(MANUAL_READING_KEY) ?? "";
    if (storedReading) {
      setPersistedManualReading(storedReading);
    }
    const storedSceneImage = localStorage.getItem(MANUAL_SCENE_IMAGE_KEY) ?? "";
    if (storedSceneImage) {
      setManualSceneImage(storedSceneImage);
    }
  }, []);

  useEffect(() => {
    if (typeof window === "undefined") {
      return;
    }
    if (manualWordsMarkdown) {
      localStorage.setItem(MANUAL_WORDS_KEY, manualWordsMarkdown);
    } else {
      localStorage.removeItem(MANUAL_WORDS_KEY);
    }
  }, [manualWordsMarkdown]);

  useEffect(() => {
    if (typeof window === "undefined" || !manualModeActive) {
      return;
    }
    if (readingOutput) {
      localStorage.setItem(MANUAL_READING_KEY, readingOutput);
      setPersistedManualReading(readingOutput);
    } else {
      localStorage.removeItem(MANUAL_READING_KEY);
      setPersistedManualReading("");
    }
  }, [manualModeActive, readingOutput]);

  useEffect(() => {
    if (typeof window === "undefined" || !manualModeActive) {
      return;
    }
    if (manualSceneImage) {
      localStorage.setItem(MANUAL_SCENE_IMAGE_KEY, manualSceneImage);
    } else {
      localStorage.removeItem(MANUAL_SCENE_IMAGE_KEY);
    }
  }, [manualModeActive, manualSceneImage]);

  useEffect(() => {
    if (!manualModeActive || !persistedManualReading) {
      return;
    }
    if (readingOutput === persistedManualReading) {
      return;
    }
    setReadingOutput(persistedManualReading);
    setReadingStatus("ready");
    setDerivedStage("done");
  }, [manualModeActive, persistedManualReading, readingOutput, setReadingOutput, setReadingStatus, setDerivedStage]);

  useEffect(() => {
    if (!manualModeActive || !readingOutput.trim() || speechText.trim()) {
      return;
    }
    setSpeechText(readingOutput);
  }, [manualModeActive, readingOutput, speechText]);

  useEffect(() => {
    if (!manualModeActive || !manualWordsMarkdown) {
      return;
    }
    if (wordsOutput.trim()) {
      return;
    }
    setWordsOutput(manualWordsMarkdown);
    setWordsStatus("ready");
  }, [manualModeActive, manualWordsMarkdown, wordsOutput, setWordsOutput, setWordsStatus]);

  const {
    voices,
    selectedVoice,
    setSelectedVoice,
    speechRate,
    setSpeechRate,
    isSpeaking,
    listeningSupported,
    handleSpeak,
    handleStop,
  } = useSpeech({ readingOutput, initialVoice: voice, onVoiceChangeAction: setVoice });

  const {
    recordingSupported: speechRecordingSupported,
    isRecording: isSpeechRecording,
    remainingSeconds: speechRecordingRemainingSeconds,
    recordingReady: speechRecordingReady,
    recordingDurationMs: speechRecordingDurationMs,
    audioUrl: speechRecordingUrl,
    audioBlob: speechRecordingBlob,
    audioMimeType: speechRecordingMimeType,
    recordingError: speechRecordingError,
    recordingLimitSeconds: speechRecordingLimitSeconds,
    startRecording: startSpeechRecording,
    stopRecording: stopSpeechRecording,
    resetRecording: resetSpeechRecordingBase,
  } = useSpeechRecorder({ recordingLimitSeconds: 60 });

  const { timerSeconds, isTiming, handleStartTimer, handleStopTimer, resetTimer, wpmResult } = useTimer({
    readingOutput,
    readingWordCount,
    setErrorMessage,
  });

  const wordsTable = useMemo<WordsTable>(() => parseMarkdownTable(wordsOutput), [wordsOutput]);
  const wordsCount = wordsTable?.rows.length ?? 0;
  const manualTablePreview = useMemo<WordsTable>(() => parseMarkdownTable(manualWordsMarkdown), [manualWordsMarkdown]);
  const manualImportReady = Boolean(manualTablePreview?.rows.length);
  const manualRowCount = manualTablePreview?.rows.length ?? 0;

  const buildWordsMarkdown = useCallback((headers: string[], rows: string[][]): string => {
    const separator = headers.map(() => "---").join(" | ");
    const headerLine = `| ${headers.join(" | ")} |`;
    const separatorLine = `| ${separator} |`;
    const rowLines = rows.map((row) => `| ${row.join(" | ")} |`);
    return [headerLine, separatorLine, ...rowLines].join("\n") + "\n";
  }, []);

  const handleManualMarkdownChange = useCallback((value: string) => {
    setManualWordsMarkdown(value);
  }, []);

  const handleManualWordsImport = useCallback(() => {
    if (!manualTablePreview) {
      return;
    }
    setWordsOutput(manualWordsMarkdown);
    setWordsStatus("ready");
  }, [manualTablePreview, manualWordsMarkdown, setWordsOutput, setWordsStatus]);

  const handleManualReadingChange = useCallback(
    (value: string) => {
      setReadingOutput(value);
      setSpeechText(value);
      setReadingStatus(value ? "ready" : "idle");
      setDerivedStage(value ? "done" : "idle");
    },
    [setReadingOutput, setDerivedStage, setReadingStatus]
  );

  const handleManualSceneImageUpload = useCallback((file: File | null) => {
    if (!file) {
      return;
    }
    const reader = new FileReader();
    reader.onload = () => {
      const result = reader.result;
      if (typeof result === "string") {
        setManualSceneImage(result);
      }
    };
    reader.readAsDataURL(file);
  }, []);

  const handleManualSceneImageDelete = useCallback(() => {
    setManualSceneImage("");
  }, []);

  const saveWordsToFile = useCallback(
    async (markdown: string) => {
      const targetWeek = activeWeek || currentWeekKey;
      if (!targetWeek || !filesystemAvailable) {
        return;
      }
      const encoded = encodeURIComponent(targetWeek);
      const response = await fetch(`/api/weeks/${encoded}/files`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ words: markdown }),
      });
      if (!response.ok) {
        const message = await response.text();
        throw new Error(message || "Failed to save words");
      }
    },
    [activeWeek, currentWeekKey, filesystemAvailable]
  );

  const saveGeneratedToFile = useCallback(
    async (topic: string, words: string, reading: string, day?: string) => {
      const targetWeek = activeWeek || currentWeekKey;
      if (!targetWeek || !filesystemAvailable) {
        return;
      }
      const encoded = encodeURIComponent(targetWeek);
      const targetDay = day || activeDay || "day1";
      const response = await fetch(`/api/weeks/${encoded}/files`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ topic, words, reading, day: targetDay }),
      });
      if (!response.ok) {
        const message = await response.text();
        throw new Error(message || "Failed to save generated files");
      }
      await loadWeekFiles(targetWeek, targetDay);
    },
    [activeWeek, currentWeekKey, filesystemAvailable, activeDay, loadWeekFiles]
  );

  const saveSpeechArtifactsToFile = useCallback(
    async ({
      feedback,
      transcript,
      audioBase64,
      audioMimeType,
    }: {
      feedback?: string;
      transcript?: string;
      audioBase64?: string;
      audioMimeType?: string;
    }) => {
      const targetWeek = activeWeek || currentWeekKey;
      if (!targetWeek || !filesystemAvailable) {
        return;
      }
      const encoded = encodeURIComponent(targetWeek);
      await fetch(`/api/weeks/${encoded}/files`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          day: activeDay || "day1",
          feedback,
          speechTranscript: transcript,
          speechAudioBase64: audioBase64,
          speechAudioMimeType: audioMimeType,
        }),
      });
      await loadWeekFiles(targetWeek, activeDay || "day1");
    },
    [activeWeek, currentWeekKey, filesystemAvailable, activeDay, loadWeekFiles]
  );

  const handleAddWord = useCallback(
    async (newRow: string[]) => {
      if (!wordsTable) {
        return;
      }
      const updated = { ...wordsTable, rows: [...wordsTable.rows, newRow] };
      const markdown = buildWordsMarkdown(updated.headers, updated.rows);
      setWordsOutput(markdown);
      await saveWordsToFile(markdown);
    },
    [wordsTable, buildWordsMarkdown, saveWordsToFile]
  );

  const handleEditWord = useCallback(
    async (rowIndex: number, updatedRow: string[]) => {
      if (!wordsTable) {
        return;
      }
      const newRows = wordsTable.rows.map((row, i) => (i === rowIndex ? updatedRow : row));
      const markdown = buildWordsMarkdown(wordsTable.headers, newRows);
      setWordsOutput(markdown);
      await saveWordsToFile(markdown);
    },
    [wordsTable, buildWordsMarkdown, saveWordsToFile]
  );

  const handleDeleteWord = useCallback(
    async (rowIndex: number) => {
      if (!wordsTable) {
        return;
      }
      const newRows = wordsTable.rows.filter((_, i) => i !== rowIndex);
      const markdown = buildWordsMarkdown(wordsTable.headers, newRows);
      setWordsOutput(markdown);
      await saveWordsToFile(markdown);
    },
    [wordsTable, buildWordsMarkdown, saveWordsToFile]
  );
  const sceneSourceText = useMemo(() => {
    const spoken = speechText.trim();
    if (spoken) {
      return spoken;
    }
    return readingOutput.trim();
  }, [readingOutput, speechText]);
  const sceneImageUrl = manualModeActive && manualSceneImage ? manualSceneImage : weekImageUrl;
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
        const words = await generateWordsForTopic(parsed);
        const reading = await generateReadingForTopic(parsed, words);
        await saveGeneratedToFile(idea, words, reading, activeDay);
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
  }, [topicInput, generateWordsForTopic, generateReadingForTopic, sendGenerate, resetTimer, saveGeneratedToFile]);

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
      const reading = await generateReadingForTopic(topicHeader, wordsOutput);
      await saveGeneratedToFile(ideaResponse || topicHeader, wordsOutput, reading, activeDay);
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : "Reading generation failed");
    }
  }, [topicHeader, wordsOutput, generateReadingForTopic, saveGeneratedToFile, ideaResponse, activeDay]);

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
      void saveSpeechArtifactsToFile({ feedback });
    } catch (error) {
      setSpeechError(error instanceof Error ? error.message : "分析に失敗しました。");
    } finally {
      setSpeechLoading(false);
    }
  }, [cefrLevel, saveSpeechArtifactsToFile, sendGenerate, speechText]);

  const handleTranscribeSpeechRecording = useCallback(async () => {
    if (!speechRecordingBlob) {
      setSpeechTranscriptionError("Record audio before requesting a transcription.");
      return;
    }

    setSpeechTranscriptionError("");
    setSpeechTranscriptionLoading(true);

    try {
      const audio = await new Promise<string>((resolve, reject) => {
        const reader = new FileReader();
        reader.onloadend = () => {
          const result = reader.result;
          if (typeof result !== "string") {
            reject(new Error("Unable to read the recorded audio."));
            return;
          }

          const base64 = result.split(",")[1];
          if (!base64) {
            reject(new Error("Unable to encode the recorded audio."));
            return;
          }

          resolve(base64);
        };
        reader.onerror = () => reject(new Error("Unable to read the recorded audio."));
        reader.readAsDataURL(speechRecordingBlob);
      });

      const headers: Record<string, string> = {
        "Content-Type": "application/json",
      };
      if (apiKey) {
        headers["x-api-key"] = apiKey;
      }

      const response = await fetch("/api/transcribe", {
        method: "POST",
        headers,
        body: JSON.stringify({ audio, mimeType: speechRecordingMimeType }),
        cache: "no-store",
      });

      const data = (await response.json()) as { transcript?: string; error?: string };
      if (!response.ok) {
        throw new Error(data.error || "Unable to transcribe the recording.");
      }
	      if (!data.transcript?.trim()) {
	        throw new Error("Transcription returned empty text.");
	      }

	      const transcript = data.transcript.trim();
	      setSpeechRecordingTranscript(transcript);

	      await saveSpeechArtifactsToFile({
	        transcript,
	        audioBase64: audio,
	        audioMimeType: speechRecordingMimeType,
	      });
    } catch (error) {
      setSpeechTranscriptionError(error instanceof Error ? error.message : "Unable to transcribe the recording.");
    } finally {
      setSpeechTranscriptionLoading(false);
    }
  }, [apiKey, saveSpeechArtifactsToFile, speechRecordingBlob, speechRecordingMimeType]);

  const handleUseTranscriptFromRecording = useCallback(() => {
    if (!speechRecordingTranscript.trim()) {
      return;
    }
    setSpeechText(speechRecordingTranscript);
  }, [setSpeechText, speechRecordingTranscript]);

  const resetSpeechRecording = useCallback(() => {
    resetSpeechRecordingBase();
    setSpeechRecordingTranscript("");
    setSpeechTranscriptionError("");
    setSpeechTranscriptionLoading(false);
    setPersistedSpeechRecordingUrl(null);
  }, [resetSpeechRecordingBase]);

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

  const handleCheckDictation = useCallback(() => {
    const normalize = (text: string) =>
      text
        .toLowerCase()
        .replace(/[^a-z0-9\s]/g, "")
        .split(/\s+/)
        .filter(Boolean);

    const inputWords = normalize(dictationText);
    const referenceWords = normalize(readingOutput);

    if (referenceWords.length === 0) {
      setDictationScore(0);
      return;
    }

    const matched = inputWords.filter((word, i) => referenceWords[i] === word).length;
    const score = Math.round((matched / referenceWords.length) * 100);
    setDictationScore(Math.min(score, 100));
  }, [dictationText, readingOutput]);

  const handleToggleAnswer = useCallback(() => {
    setShowAnswer((prev) => !prev);
  }, []);

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
    speechRecordingSupported,
    isSpeechRecording,
    speechRecordingRemainingSeconds,
    speechRecordingReady,
    speechRecordingDurationMs,
    speechRecordingUrl: speechRecordingUrl ?? persistedSpeechRecordingUrl,
    speechRecordingError,
    speechRecordingTranscript,
    speechTranscriptionLoading,
    speechTranscriptionError,
    speechRecordingLimitSeconds,
    startSpeechRecording,
    stopSpeechRecording,
    resetSpeechRecording,
    handleTranscribeSpeechRecording,
    handleUseTranscriptFromRecording,
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
    wordsTable,    wordsCount,
    readingWordCount,
    hasUserMessage,
    handleAddWord,
    handleEditWord,
    handleDeleteWord,
    manualModeActive,
    manualWordsMarkdown,
    manualWordsRowCount: manualRowCount,
    manualImportReady,
    handleManualWordsMarkdownChange: handleManualMarkdownChange,
    handleManualWordsImport,
    handleManualReadingChange,
    manualSceneImage,
    handleManualSceneImageUpload,
    handleManualSceneImageDelete,
    voices,
    selectedVoice,
    setSelectedVoice,
    speechRate,
    setSpeechRate,
    isSpeaking,
    listeningSupported,
    handleSpeak,
    handleStop,
    weeks,
    weeksLoading,
    weeksError,
    activeWeek,
    weekFilesLoading,
    storageMetadata,
    availableDays,
    activeDay,
    setActiveWeek,
    loadWeekFiles,
    selectDay,
    currentWeekKey,
    reviewsCopy,
    voice,
    setVoice,
    dictationText,
    setDictationText,
    dictationScore,
    showAnswer,
    handleCheckDictation,
    handleToggleAnswer,
    weekImageUrl,
    sceneImageUrl,
  };
};
