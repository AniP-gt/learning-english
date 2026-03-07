"use client";

import { CEFRLevel } from "../../types";

type ReviewsCopy = {
  loading: string;
  done: string;
};

type IdeaStepProps = {
  topicInput: string;
  onTopicInputChange: (value: string) => void;
  ideaLoading: boolean;
  errorMessage: string;
  handleGenerateTopic: () => void;
  cefrLevel: CEFRLevel;
  ideaResponse: string;
  topicHeader: string;
  derivedStage: "idle" | "loading" | "done";
  reviewsCopy: ReviewsCopy;
};

export const IdeaStep = ({
  topicInput,
  onTopicInputChange,
  ideaLoading,
  errorMessage,
  handleGenerateTopic,
  cefrLevel,
  ideaResponse,
  topicHeader,
  derivedStage,
  reviewsCopy,
}: IdeaStepProps) => (
  <section className="space-y-6 step-section">
    <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
      <div className="space-y-1">
        <p className="text-xs uppercase tracking-[0.4em] text-[#5b647b]">Step 1 · Idea</p>
        <h1 className="text-2xl font-bold text-[#7aa2f7] sm:text-3xl">日本語から英語トピックを引き出す</h1>
      </div>
      <div className="flex flex-wrap items-center gap-2 text-xs text-[#a9b1d6]">
        <span className="rounded-full border border-[#24283b] bg-[#1f2335] px-3 py-1">g: regenerate</span>
        <span className="rounded-full border border-[#24283b] bg-[#1f2335] px-3 py-1">? : settings</span>
      </div>
    </div>

    <textarea
      value={topicInput}
      onChange={(event) => onTopicInputChange(event.target.value)}
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

    {errorMessage && (
      <div className="rounded border border-[#e64980] bg-[#2f0c1c] px-4 py-2 text-[12px] text-[#f7768e]">{errorMessage}</div>
    )}

    <div className="space-y-3 rounded border border-[#24283b] bg-[#16161e] p-4 text-sm text-[#cdd6f4] shadow-[0_10px_30px_rgba(10,11,20,0.4)]">
      <div className="flex flex-wrap items-center gap-3">
        <span className="text-xs uppercase tracking-[0.4em] text-[#5b647b]">topic</span>
        {topicHeader ? (
          <span className="rounded-full border border-[#24283b] bg-[#1f2335] px-3 py-1 text-[11px] text-[#7aa2f7]">{topicHeader}</span>
        ) : (
          <span className="text-[11px] text-[#5b647b]">まだ生成されていません</span>
        )}
      </div>
      <div className="whitespace-pre-wrap text-[13px] leading-relaxed max-h-80 overflow-y-auto">
        {ideaResponse || "生成したトピックがここに表示されます。"}
      </div>
      {derivedStage !== "idle" && (
        <div className="text-xs text-[#9ece6a]">
          {derivedStage === "loading" ? reviewsCopy.loading : reviewsCopy.done}
        </div>
      )}
    </div>
  </section>
);
