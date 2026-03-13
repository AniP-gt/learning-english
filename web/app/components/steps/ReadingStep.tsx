"use client";

import { CEFRLevel } from "../../types";

type ReadingStepProps = {
  readingOutput: string;
  readingWordCount: number;
  timerSeconds: number;
  wpmResult: number | null;
  isTiming: boolean;
  handleStartTimerAction: () => void;
  handleStopTimerAction: () => void;
  handleRegenerateReadingAction: () => void;
  cefrLevel: CEFRLevel;
  topicHeader: string;
  manualModeActive: boolean;
  onManualReadingChangeAction: (value: string) => void;
};

export const ReadingStep = ({
  readingOutput,
  readingWordCount,
  timerSeconds,
  wpmResult,
  isTiming,
  handleStartTimerAction,
  handleStopTimerAction,
  handleRegenerateReadingAction,
  cefrLevel,
  topicHeader,
  manualModeActive,
  onManualReadingChangeAction,
}: ReadingStepProps) => (
  <section className="space-y-6 step-section">
    <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
      <div className="space-y-1">
        <p className="text-xs uppercase tracking-[0.4em] text-[#5b647b]">Step 3 · Reading</p>
        <h2 className="text-2xl font-bold text-[#e0af68] sm:text-3xl">Timing Practice</h2>
      </div>
      <div className="flex flex-wrap items-center gap-2 text-xs">
        <span className="rounded-full border border-[#24283b] bg-[#1f2335] px-3 py-1 text-[#c0caf5]">CEFR {cefrLevel}</span>
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
            onClick={handleStartTimerAction}
            disabled={!readingOutput || isTiming}
            className="rounded-full bg-[#9ece6a] px-4 py-2 text-xs font-bold uppercase tracking-[0.4em] text-[#1a1b26] transition hover:brightness-110 disabled:opacity-40"
          >
            Start Timer
          </button>
          <button
            type="button"
            onClick={handleStopTimerAction}
            disabled={!readingOutput || !isTiming}
            className="rounded-full bg-[#f7768e] px-4 py-2 text-xs font-bold uppercase tracking-[0.4em] text-[#1a1b26] transition hover:brightness-110 disabled:opacity-40"
          >
            Stop & Score
          </button>
          <span className="rounded-full border border-[#24283b] bg-[#1f2335] px-3 py-1 text-[11px] text-[#7aa2f7]">
            letter: {topicHeader || "—"}
          </span>
          {!manualModeActive && (
            <button
              type="button"
              onClick={handleRegenerateReadingAction}
              className="rounded-full border border-[#24283b] px-3 py-1 text-[#7aa2f7]"
            >
              g
            </button>
          )}
        </div>
      <div className="rounded border border-[#24283b] bg-[#0f111a] p-4 text-sm leading-relaxed text-[#cdd6f4]">
        {manualModeActive ? (
          <div className="space-y-2">
            <p className="text-[10px] uppercase tracking-[0.4em] text-[#5b647b]">Manual reading text</p>
            <textarea
              value={readingOutput}
              onChange={(event) => onManualReadingChangeAction(event.target.value)}
              placeholder="Paste or type your reading passage here."
              rows={8}
              className="w-full rounded border border-[#24283b] bg-[#0f111a] p-3 text-[13px] leading-relaxed text-[#cdd6f4] placeholder-[#3b4261] resize-none focus:border-[#7aa2f7] focus:outline-none"
            />
            <p className="space-y-1 text-[11px] text-[#7aa2f7]">
              <span>This text feeds Listening, Speech, and Scene steps.</span>
              <span>Regenerate mode is disabled while manual/localStorage mode is active.</span>
            </p>
          </div>
        ) : readingOutput ? (
          <div className="whitespace-pre-wrap max-h-[480px] overflow-y-auto">{readingOutput}</div>
        ) : (
          <p className="text-[13px] text-[#5b647b]">Generate the topic to display the reading text.</p>
        )}
      </div>
    </div>
  </section>
);
