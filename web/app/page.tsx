"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { CEFRLevel, GenerateAction } from "./types";

const steps = [
  { id: 1, title: "1. Idea", caption: "日本語ネタ出し" },
  { id: 2, title: "2. Words", caption: "単語帳作成" },
  { id: 3, title: "3. Reading", caption: "WPM計測" },
  { id: 4, title: "4. Listening", caption: "Say / WebTTS" },
  { id: 5, title: "5. Speech", caption: "録音 & STT" },
  { id: 6, title: "6. 3-2-1", caption: "画像想起" },
  { id: 7, title: "7. Roleplay", caption: "Gemini Chat" },
];

const fileTree = ["topic.md", "words.md", "reading.md", "feedback.md"];

const cefrLevels: CEFRLevel[] = ["A1", "A2", "B1", "B2", "C1", "C2"];

type WordsTable = {
  headers: string[];
  rows: string[][];
} | null;

const parseTopicFromIdea = (text: string) => {
  const match = text.match(/#\s*Topic\s*\n([^\n\r]+)/i);
  if (match && match[1]) {
    return match[1].trim();
  }
  const fallback = text.split(/\r?\n/).find((line) => line.trim().length > 0);
  return fallback ? fallback.trim().slice(0, 40) : "";
};

const parseMarkdownTable = (markdown: string): WordsTable => {
  if (!markdown.trim()) {
    return null;
  }

  const rows: string[][] = [];
  markdown.split(/\r?\n/).forEach((line) => {
    const trimmed = line.trim();
    if (!trimmed.startsWith("|")) {
      return;
    }
    const cells = trimmed
      .split("|")
      .map((cell) => cell.trim())
      .filter((cell) => cell.length > 0);
    if (cells.length === 0) {
      return;
    }
    if (cells.every((cell) => /^-+$/.test(cell))) {
      return;
    }
    rows.push(cells);
  });

  if (rows.length < 2) {
    return null;
  }

  const [headers, ...body] = rows;
  return {
    headers,
    rows: body,
  };
};

const reviewsCopy = {
  loading: "⏳ Words & Reading を生成中...",
  done: "✓ Words & Reading 生成済み",
};

export default function HomePage() {
  const [activeStep, setActiveStep] = useState(1);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [apiKey, setApiKey] = useState("");
  const [cefrLevel, setCefrLevel] = useState<CEFRLevel>("B1");
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
  const [settingsMessage, setSettingsMessage] = useState("");
  const [timerSeconds, setTimerSeconds] = useState(0);
  const [isTiming, setIsTiming] = useState(false);
  const [wpmResult, setWpmResult] = useState<number | null>(null);

  const wordsTable = useMemo(() => parseMarkdownTable(wordsOutput), [wordsOutput]);
  const wordsCount = wordsTable?.rows.length ?? 0;
  const readingWordCount = useMemo(() => {
    if (!readingOutput) {
      return 0;
    }
    return readingOutput.split(/\s+/).filter(Boolean).length;
  }, [readingOutput]);

  const sendGenerate = useCallback(
    async (payload: { action: GenerateAction; input: string; cefrLevel?: CEFRLevel }) => {
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
    },
    [apiKey]
  );

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
    [cefrLevel, sendGenerate]
  );

  const generateReadingForTopic = useCallback(
    async (topic: string) => {
      setReadingStatus("loading");
      try {
        const reading = await sendGenerate({ action: "reading", input: topic, cefrLevel });
        setReadingOutput(reading);
        setReadingStatus("ready");
        return reading;
      } catch (error) {
        setReadingStatus("idle");
        throw error;
      }
    },
    [cefrLevel, sendGenerate]
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
    setWpmResult(null);
    setTimerSeconds(0);
    setIsTiming(false);

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
  }, [topicInput, sendGenerate, generateWordsForTopic, generateReadingForTopic]);

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

  const handleStartTimer = () => {
    if (!readingOutput) {
      setErrorMessage("先にReadingを生成してください。");
      return;
    }
    setErrorMessage("");
    setTimerSeconds(0);
    setWpmResult(null);
    setIsTiming(true);
  };

  const handleStopTimer = () => {
    setIsTiming(false);
    const minutes = timerSeconds / 60;
    if (minutes <= 0) {
      setWpmResult(readingWordCount || 0);
      return;
    }
    setWpmResult(Math.round(readingWordCount / minutes));
  };

  useEffect(() => {
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
    if (!isTiming) {
      return;
    }
    const interval = setInterval(() => {
      setTimerSeconds((prev) => prev + 1);
    }, 1000);
    return () => clearInterval(interval);
  }, [isTiming]);

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "?") {
        event.preventDefault();
        setSettingsOpen((prev) => !prev);
      }
      if (event.key.toLowerCase() === "g" && activeStep === 1 && !ideaLoading) {
        event.preventDefault();
        void handleGenerateTopic();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [activeStep, ideaLoading, handleGenerateTopic]);

  const saveSettings = () => {
    localStorage.setItem("learning-api-key", apiKey);
    localStorage.setItem("learning-cefr-level", cefrLevel);
    setSettingsMessage("Settings saved locally");
    setTimeout(() => setSettingsMessage(""), 2500);
  };

  return (
    <div className="flex min-h-screen bg-[#1a1b26] text-[#a9b1d6] font-mono">
      <aside className="w-72 border-r border-[#24283b] bg-[#16161e] px-4 py-6">
        <div className="text-xs uppercase text-[#7aa2f7] tracking-[0.3em]">workspace</div>
        <div className="mt-5 text-sm text-[#e0af68]">eng-learning</div>
        <div className="mt-6 space-y-2 text-sm">
          <div className="flex items-center gap-2 text-[#9ece6a]">
            <span className="h-2 w-2 rounded-full bg-[#9ece6a]" /> root
          </div>
          <div className="ml-4 space-y-1">
            {fileTree.map((file) => (
              <div key={file} className="flex items-center gap-2 rounded px-3 py-1 text-[#a9b1d6] hover:text-white">
                <span className="h-2 w-2 rounded-full bg-[#7aa2f7]" /> {file}
              </div>
            ))}
          </div>
        </div>
        <div className="mt-8 text-[10px] uppercase tracking-[0.3em] text-[#5b647b]">status</div>
        <div className="mt-2 text-[11px] text-[#a9b1d6]">Synced · GPT & TUI</div>
      </aside>

      <div className="flex flex-1 flex-col">
        <header className="flex items-center justify-between border-b border-[#24283b] bg-[#1f2335] px-6 py-3">
          <div className="text-xs uppercase tracking-[0.6em] text-[#7aa2f7]">Gemini Learning Lab</div>
          <div className="flex items-center gap-3 text-[11px] text-[#a9b1d6]">
            <button
              type="button"
              onClick={() => setSettingsOpen(true)}
              className="rounded-full border border-[#24283b] bg-[#24283b] px-3 py-1 text-xs uppercase tracking-[0.3em] text-[#7aa2f7] transition hover:border-[#7aa2f7]"
            >
              Settings (?)
            </button>
            <span className="flex items-center gap-2 rounded-full border border-[#24283b] bg-[#16161e] px-3 py-1 text-[10px] text-[#9ece6a]">
              CEFR {cefrLevel}
            </span>
          </div>
        </header>

        <nav className="flex border-b border-[#24283b] bg-[#16161e] p-1">
          {steps.map((step) => (
            <button
              key={step.id}
              type="button"
              onClick={() => setActiveStep(step.id)}
              className={`flex-1 rounded px-3 py-2 text-[10px] uppercase tracking-[0.3em] transition ${
                activeStep === step.id
                  ? "bg-[#7aa2f7] text-[#1a1b26] shadow-[0_5px_20px_rgba(122,162,247,0.5)]"
                  : "text-[#5b647b] hover:bg-[#24283b]"
              }`}
            >
              <span className="hidden sm:inline">{step.title}</span>
              <span className="sm:hidden">{step.id}</span>
            </button>
          ))}
        </nav>

        <main className="flex-1 overflow-y-auto p-8">
          {activeStep === 1 && (
            <section className="space-y-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs uppercase tracking-[0.4em] text-[#5b647b]">Step 1 · Idea</p>
                  <h1 className="text-3xl font-bold text-[#7aa2f7]">日本語から英語トピックを引き出す</h1>
                </div>
                <div className="flex items-center gap-2 text-xs text-[#a9b1d6]">
                  <span className="rounded-full border border-[#24283b] bg-[#1f2335] px-3 py-1">g: regenerate</span>
                  <span className="rounded-full border border-[#24283b] bg-[#1f2335] px-3 py-1">? : settings</span>
                </div>
              </div>

              <textarea
                value={topicInput}
                onChange={(event) => setTopicInput(event.target.value)}
                rows={4}
                placeholder="ここに日本語のネタ（例: 週末のカフェ体験や最近気になる映画）を入力する"
                className="w-full rounded border border-[#24283b] bg-[#0f111a] p-4 text-sm leading-relaxed text-[#cdd6f4] focus:border-[#7aa2f7] focus:outline-none"
              />

              <div className="flex flex-wrap items-center gap-3">
                <button
                  type="button"
                  onClick={handleGenerateTopic}
                  disabled={ideaLoading}
                  className="rounded-full bg-[#7aa2f7] px-6 py-2 text-xs font-bold uppercase tracking-[0.4em] text-[#1a1b26] transition hover:brightness-110 disabled:opacity-40"
                >
                  {ideaLoading ? "Generating..." : "Generate Idea"}
                </button>
                <button
                  type="button"
                  onClick={handleGenerateTopic}
                  aria-label="Regen topic"
                  className="rounded-full border border-[#24283b] px-4 py-2 text-xs uppercase tracking-[0.3em] text-[#9ece6a]"
                >
                  g
                </button>
                <span className="text-[11px] text-[#9ece6a]">CEFR {cefrLevel}</span>
              </div>

              {errorMessage && <div className="rounded border border-[#e64980] bg-[#2f0c1c] px-4 py-2 text-[12px] text-[#f7768e]">{errorMessage}</div>}

              <div className="space-y-3 rounded border border-[#24283b] bg-[#16161e] p-4 text-sm text-[#cdd6f4] shadow-[0_10px_30px_rgba(10,11,20,0.4)]">
                <div className="flex flex-wrap items-center gap-3">
                  <span className="text-xs uppercase tracking-[0.4em] text-[#5b647b]">topic</span>
                  {topicHeader ? (
                    <span className="rounded-full border border-[#24283b] bg-[#1f2335] px-3 py-1 text-[11px] text-[#7aa2f7]">{topicHeader}</span>
                  ) : (
                    <span className="text-[11px] text-[#5b647b]">まだ生成されていません</span>
                  )}
                </div>
                <div className="whitespace-pre-wrap text-[13px] leading-relaxed">
                  {ideaResponse || "生成したトピックがここに表示されます。"}
                </div>
                {derivedStage !== "idle" && (
                  <div className="text-xs text-[#9ece6a]">
                    {derivedStage === "loading" ? reviewsCopy.loading : reviewsCopy.done}
                  </div>
                )}
              </div>
            </section>
          )}

          {activeStep === 2 && (
            <section className="space-y-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs uppercase tracking-[0.4em] text-[#5b647b]">Step 2 · Words</p>
                  <h2 className="text-3xl font-bold text-[#9ece6a]">Vocabulary Table</h2>
                </div>
                <div className="flex items-center gap-2 text-xs">
                  <span className="rounded-full border border-[#24283b] bg-[#1f2335] px-3 py-1 text-[#c0caf5]">Count: {wordsCount}</span>
                  <button
                    type="button"
                    onClick={handleRegenerateWords}
                    className="rounded-full border border-[#24283b] px-3 py-1 text-[#7aa2f7]"
                  >
                    g
                  </button>
                </div>
              </div>

              <div className="overflow-hidden rounded border border-[#24283b] bg-[#141724] p-4">
                {wordsTable ? (
                  <table className="w-full border-collapse text-sm">
                    <thead>
                      <tr className="text-[11px] uppercase tracking-[0.3em] text-[#5b647b]">
                        {wordsTable.headers.map((header) => (
                          <th key={header} className="border-b border-[#24283b] pb-2 text-left">
                            {header}
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {wordsTable.rows.map((row, rowIndex) => (
                        <tr key={`row-${rowIndex}`} className={rowIndex % 2 === 0 ? "bg-[#16161e]" : "bg-[#141724]"}>
                          {row.map((cell, cellIndex) => (
                            <td key={`${rowIndex}-${cellIndex}`} className="border-b border-[#24283b] px-2 py-3 align-top text-[13px] text-[#cdd6f4]">
                              {cell}
                            </td>
                          ))}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                ) : (
                  <div className="text-[13px] text-[#5b647b]">
                    Words will appear here after the idea step completes.
                  </div>
                )}
              </div>
            </section>
          )}

          {activeStep === 3 && (
            <section className="space-y-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs uppercase tracking-[0.4em] text-[#5b647b]">Step 3 · Reading</p>
                  <h2 className="text-3xl font-bold text-[#e0af68]">Timing Practice</h2>
                </div>
                <div className="flex items-center gap-2 text-xs">
                  <span className="rounded-full border border-[#24283b] bg-[#1f2335] px-3 py-1 text-[#c0caf5]">CEFR {cefrLevel}</span>
                  <button
                    type="button"
                    onClick={handleRegenerateReading}
                    className="rounded-full border border-[#24283b] px-3 py-1 text-[#7aa2f7]"
                  >
                    g
                  </button>
                </div>
              </div>

              <div className="grid gap-4 md:grid-cols-3">
                <div className="rounded border border-[#24283b] bg-[#16161e] p-4 text-center">
                  <p className="text-[11px] uppercase tracking-[0.4em] text-[#5b647b]">Timer</p>
                  <p className="text-3xl font-bold text-[#e0af68]">{timerSeconds}s</p>
                </div>
                <div className="rounded border border-[#24283b] bg-[#16161e] p-4 text-center">
                  <p className="text-[11px] uppercase tracking-[0.4em] text-[#5b647b]">Words</p>
                  <p className="text-3xl font-bold text-[#7aa2f7]">{readingWordCount}</p>
                </div>
                <div className="rounded border border-[#24283b] bg-[#16161e] p-4 text-center">
                  <p className="text-[11px] uppercase tracking-[0.4em] text-[#5b647b]">WPM</p>
                  <p className="text-3xl font-bold text-[#9ece6a]">{wpmResult ?? "--"}</p>
                </div>
              </div>

              <div className="space-y-3 rounded border border-[#24283b] bg-[#141724] p-5">
                <div className="flex flex-wrap items-center gap-3">
                  <button
                    type="button"
                    onClick={handleStartTimer}
                    disabled={!readingOutput || isTiming}
                    className="rounded-full bg-[#9ece6a] px-4 py-2 text-xs font-bold uppercase tracking-[0.4em] text-[#1a1b26] transition hover:brightness-110 disabled:opacity-40"
                  >
                    Start Timer
                  </button>
                  <button
                    type="button"
                    onClick={handleStopTimer}
                    disabled={!readingOutput || !isTiming}
                    className="rounded-full bg-[#f7768e] px-4 py-2 text-xs font-bold uppercase tracking-[0.4em] text-[#1a1b26] transition hover:brightness-110 disabled:opacity-40"
                  >
                    Stop & Score
                  </button>
                  <span className="rounded-full border border-[#24283b] bg-[#1f2335] px-3 py-1 text-[11px] text-[#7aa2f7]">
                    letter: {topicHeader || "—"}
                  </span>
                </div>
                <div className="rounded border border-[#24283b] bg-[#0f111a] p-4 text-sm leading-relaxed text-[#cdd6f4]">
                  {readingOutput ? (
                    <div className="whitespace-pre-wrap">{readingOutput}</div>
                  ) : (
                    <p className="text-[13px] text-[#5b647b]">Generate the topic to display the reading text.</p>
                  )}
                </div>
              </div>
            </section>
          )}

          {activeStep > 3 && (
            <section className="flex h-60 items-center justify-center rounded border border-[#24283b] bg-[#141724] text-center text-sm text-[#5b647b]">
              <p>Steps {activeStep}〜7 are coming soon. Focus on Steps 1-3 for now.</p>
            </section>
          )}
        </main>

        <footer className="flex items-center justify-between border-t border-[#24283b] bg-[#1f2335] px-6 py-2 text-[10px] uppercase tracking-[0.4em] text-[#7aa2f7]">
          <span>Tokyo Night · Gemini Web</span>
          <span>Step {activeStep}/7</span>
          <span>status: synced</span>
        </footer>
      </div>

      {settingsOpen && (
        <div className="fixed inset-0 z-20 bg-black/60" onClick={() => setSettingsOpen(false)} />
      )}

      <div
        className={`fixed inset-y-0 right-0 z-30 w-96 border-l border-[#24283b] bg-[#0f111a] px-6 py-8 shadow-[0_0_30px_rgba(5,6,15,0.7)] transition-transform duration-300 ${
          settingsOpen ? "translate-x-0" : "translate-x-full"
        }`}
      >
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-semibold text-[#7aa2f7]">Settings</h3>
          <button
            type="button"
            onClick={() => setSettingsOpen(false)}
            className="text-[11px] uppercase tracking-[0.4em] text-[#5b6477]"
          >
            Close
          </button>
        </div>
        <p className="mt-4 text-[12px] text-[#5b647b]">Gemini API key is stored locally and sent securely via the API route.</p>
        <label className="mt-6 block text-[11px] uppercase tracking-[0.4em] text-[#5b647b]" htmlFor="gemini-key">
          Gemini API Key
        </label>
        <input
          id="gemini-key"
          type="password"
          value={apiKey}
          onChange={(event) => setApiKey(event.target.value)}
          placeholder="sk-xxxx"
          className="mt-2 w-full rounded border border-[#24283b] bg-[#121422] px-3 py-2 text-sm text-[#cdd6f4] focus:border-[#7aa2f7] focus:outline-none"
        />

        <div className="mt-5 text-[11px] uppercase tracking-[0.4em] text-[#5b647b]">CEFR Level</div>
        <div className="mt-2 flex flex-wrap gap-2">
          {cefrLevels.map((level) => (
            <button
              key={level}
              type="button"
              onClick={() => setCefrLevel(level)}
              className={`rounded-full px-4 py-1 text-xs uppercase tracking-[0.4em] transition ${
                cefrLevel === level
                  ? "border border-[#7aa2f7] bg-[#7aa2f7]/30 text-[#7aa2f7]"
                  : "border border-[#24283b] text-[#5b647b]"
              }`}
            >
              {level}
            </button>
          ))}
        </div>

        <button
          type="button"
          onClick={saveSettings}
          className="mt-6 w-full rounded-full bg-[#7aa2f7] px-4 py-2 text-xs font-bold uppercase tracking-[0.4em] text-[#1a1b26] transition hover:brightness-110"
        >
          Save Settings
        </button>
        {settingsMessage && <p className="mt-2 text-[12px] text-[#9ece6a]">{settingsMessage}</p>}
      </div>
    </div>
  );
}
