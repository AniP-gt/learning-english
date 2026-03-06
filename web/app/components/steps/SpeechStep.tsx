"use client";

import { CEFRLevel } from "../../types";

type SpeechStepProps = {
  speechText: string;
  onSpeechTextChange: (value: string) => void;
  speechError: string;
  speechLoading: boolean;
  handleAnalyzeSpeech: () => void;
  speechFeedback: string;
  cefrLevel: CEFRLevel;
};

export const SpeechStep = ({
  speechText,
  onSpeechTextChange,
  speechError,
  speechLoading,
  handleAnalyzeSpeech,
  speechFeedback,
  cefrLevel,
}: SpeechStepProps) => (
  <section className="space-y-6 step-section">
    <div className="flex items-center justify-between">
      <div>
        <p className="text-xs uppercase tracking-[0.4em] text-[#5b647b]">Step 5 · Speech</p>
        <h2 className="text-3xl font-bold text-[#e0af68]">Transcribe & refine</h2>
      </div>
      <span className="rounded-full border border-[#24283b] bg-[#1f2335] px-3 py-1 text-[11px] text-[#7aa2f7]">CEFR {cefrLevel}</span>
    </div>
    <div className="rounded border border-[#24283b] bg-[#141724] p-4">
      <p className="text-xs uppercase tracking-[0.4em] text-[#5b647b]">Speech text</p>
      <textarea
        value={speechText}
        onChange={(event) => onSpeechTextChange(event.target.value)}
        rows={5}
        placeholder="Type or paste what you spoke in English."
        className="mt-3 w-full rounded border border-[#24283b] bg-[#0f111a] px-3 py-2 text-sm leading-relaxed text-[#cdd6f4] focus:border-[#7aa2f7] focus:outline-none"
      />
    </div>
    {speechError && <p className="text-[12px] text-[#f7768e]">{speechError}</p>}
    <div className="flex flex-wrap items-center gap-3">
      <button
        type="button"
        onClick={handleAnalyzeSpeech}
        disabled={speechLoading || !speechText.trim()}
        className="flex items-center gap-2 rounded-full bg-[#7aa2f7] px-6 py-2 text-xs font-bold uppercase tracking-[0.4em] text-[#1a1b26] transition hover:brightness-110 disabled:opacity-40"
      >
        {speechLoading ? (
          <>
            <span className="spinner" />
            Analyzing…
          </>
        ) : (
          "Analyze with Gemini"
        )}
      </button>
      <span className="text-[11px] text-[#5b647b]">Grammar, phrasing, and score in one pass.</span>
    </div>
    {speechFeedback && (
      <div className="rounded border border-[#24283b] bg-[#141724] p-4">
        <p className="text-[10px] uppercase tracking-[0.4em] text-[#5b647b]">Gemini Feedback</p>
        <pre className="mt-2 whitespace-pre-wrap text-[13px] leading-relaxed text-[#cdd6f4]">{speechFeedback}</pre>
      </div>
    )}
  </section>
);
