"use client";

import { SpeakVoice } from "../../lib/types";

type ListeningStepProps = {
  readingOutput: string;
  listeningSupported: boolean;
  voices: SpeakVoice[];
  selectedVoice: string;
  onVoiceChange: (value: string) => void;
  speechRate: number;
  onSpeechRateChange: (value: number) => void;
  handleSpeak: () => void;
  isSpeaking: boolean;
};

export const ListeningStep = ({
  readingOutput,
  listeningSupported,
  voices,
  selectedVoice,
  onVoiceChange,
  speechRate,
  onSpeechRateChange,
  handleSpeak,
  isSpeaking,
}: ListeningStepProps) => (
  <section className="space-y-6 step-section">
    <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
      <div className="space-y-1">
        <p className="text-xs uppercase tracking-[0.4em] text-[#5b647b]">Step 4 · Listening</p>
        <h2 className="text-2xl font-bold text-[#7aa2f7] sm:text-3xl">Say it aloud</h2>
      </div>
      <div className="flex flex-wrap items-center gap-3 text-[11px]">
        <span className="rounded-full border border-[#24283b] bg-[#1f2335] px-3 py-1 text-[#9ece6a]">Web Speech</span>
        {listeningSupported ? (
          <span className="text-[#9ece6a]">{isSpeaking ? "Speaking…" : "Ready to read"}</span>
        ) : (
          <span className="text-[#f7768e]">Speech API unavailable</span>
        )}
      </div>
    </div>
    <div className="rounded border border-[#24283b] bg-[#141724] p-4">
      <p className="text-xs uppercase tracking-[0.4em] text-[#5b647b]">Reading Text</p>
      <div className="mt-3 h-44 overflow-y-auto rounded border border-[#1f2335] bg-[#0f111a] p-3 text-[13px] leading-relaxed text-[#cdd6f4]">
        {readingOutput ? (
          <pre className="whitespace-pre-wrap">{readingOutput}</pre>
        ) : (
          <span className="text-[12px] text-[#5b647b]">Steps 1-3 must be complete before listening.</span>
        )}
      </div>
    </div>
    <div className="grid gap-4 md:grid-cols-2">
      <label className="rounded border border-[#24283b] bg-[#16161e] p-4 text-sm text-[#cdd6f4]">
        <span className="text-[10px] uppercase tracking-[0.4em] text-[#5b647b]">Voice</span>
        <select
          value={selectedVoice}
          onChange={(event) => onVoiceChange(event.target.value)}
          disabled={!voices.length}
          className="mt-3 w-full rounded border border-[#24283b] bg-[#0f111a] px-3 py-2 text-[13px] text-[#cdd6f4] focus:border-[#7aa2f7]"
        >
          {voices.length === 0 ? (
            <option value="">No English voices found</option>
          ) : (
            voices.map((voice) => (
              <option key={voice.voiceURI} value={voice.voiceURI}>
                {voice.name} ({voice.lang})
              </option>
            ))
          )}
        </select>
      </label>
      <label className="rounded border border-[#24283b] bg-[#16161e] p-4 text-sm text-[#cdd6f4]">
        <span className="text-[10px] uppercase tracking-[0.4em] text-[#5b647b]">Speed {speechRate.toFixed(1)}x</span>
        <input
          type="range"
          min={0.5}
          max={2}
          step={0.1}
          value={speechRate}
          onChange={(event) => onSpeechRateChange(Number(event.target.value))}
          className="mt-3 w-full accent-[#7aa2f7]"
        />
        <div className="mt-2 text-[11px] text-[#5b647b]">Adjust to mirror natural pace.</div>
      </label>
    </div>
    <div className="flex flex-wrap items-center gap-3">
      <button
        type="button"
        onClick={handleSpeak}
        disabled={!readingOutput || !listeningSupported || voices.length === 0}
        className="flex items-center gap-2 rounded-full bg-[#9ece6a] px-6 py-2 text-xs font-bold uppercase tracking-[0.4em] text-[#1a1b26] transition hover:brightness-110 disabled:opacity-40"
      >
        {isSpeaking ? (
          <>
            <span className="spinner" />
            Speaking…
          </>
        ) : (
          "Speak"
        )}
      </button>
      <div className="text-[11px] text-[#5b647b]">
        {listeningSupported ? (
          <span className="flex items-center gap-2">
            {isSpeaking ? (
              <>
                <span className="pulse-indicator" aria-hidden="true" />
                Speaking now
              </>
            ) : (
              <>
                <span className="h-2 w-2 rounded-full bg-[#7aa2f7]" aria-hidden="true" />
                Ready to read
              </>
            )}
          </span>
        ) : (
          <span className="text-[#f7768e]">Speech synthesis unsupported</span>
        )}
      </div>
    </div>
  </section>
);
