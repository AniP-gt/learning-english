"use client";

import { CEFRLevel } from "../../types";

type ReadingStepProps = {
  readingOutput: string;
  readingWordCount: number;
  timerSeconds: number;
  wpmResult: number | null;
  isTiming: boolean;
  handleStartTimer: () => void;
  handleStopTimer: () => void;
  handleRegenerateReading: () => void;
  cefrLevel: CEFRLevel;
  topicHeader: string;
};

export const ReadingStep = ({
  readingOutput,
  readingWordCount,
  timerSeconds,
  wpmResult,
  isTiming,
  handleStartTimer,
  handleStopTimer,
  handleRegenerateReading,
  cefrLevel,
  topicHeader,
}: ReadingStepProps) => (
  <section className="space-y-6 step-section">
    <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
      <div className="space-y-1">
        <p className="text-xs uppercase tracking-[0.4em] text-[#5b647b]">Step 3 · Reading</p>
        <h2 className="text-2xl font-bold text-[#e0af68] sm:text-3xl">Timing Practice</h2>
      </div>
      <div className="flex flex-wrap items-center gap-2 text-xs">
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
);
