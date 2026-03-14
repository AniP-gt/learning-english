"use client";

import { CEFRLevel } from "../../types";

type SpeechStepProps = {
  speechText: string;
  onSpeechTextChangeAction: (value: string) => void;
  speechError: string;
  speechLoading: boolean;
  handleAnalyzeSpeechAction: () => void;
  speechFeedback: string;
  cefrLevel: CEFRLevel;
  recordingSupported: boolean;
  isRecording: boolean;
  remainingRecordingSeconds: number;
  recordingReady: boolean;
  recordingDurationMs: number;
  recordedAudioUrl: string | null;
  recordingError: string;
  transcript: string;
  transcriptionLoading: boolean;
  transcriptionError: string;
  transcriptionNotice: string;
  browserFallbackSupported: boolean;
  recordingLimitSeconds: number;
  handleStartRecordingAction: () => Promise<void>;
  handleStopRecordingAction: () => void;
  handleResetRecordingAction: () => void;
  handleTranscribeRecordingAction: () => void;
  handleUseTranscriptAction: () => void;
};

const formatRemainingTime = (seconds: number) => {
  const safeSeconds = Math.max(seconds, 0);
  const minutes = Math.floor(safeSeconds / 60)
    .toString()
    .padStart(2, "0");
  const remainder = (safeSeconds % 60).toString().padStart(2, "0");
  return `${minutes}:${remainder}`;
};

const formatDuration = (durationMs: number) => {
  if (durationMs <= 0) {
    return "0s";
  }
  return `${Math.max(1, Math.round(durationMs / 1000))}s`;
};

export const SpeechStep = ({
  speechText,
  onSpeechTextChangeAction,
  speechError,
  speechLoading,
  handleAnalyzeSpeechAction,
  speechFeedback,
  cefrLevel,
  recordingSupported,
  isRecording,
  remainingRecordingSeconds,
  recordingReady,
  recordingDurationMs,
  recordedAudioUrl,
  recordingError,
  transcript,
  transcriptionLoading,
  transcriptionError,
  transcriptionNotice,
  browserFallbackSupported,
  recordingLimitSeconds,
  handleStartRecordingAction,
  handleStopRecordingAction,
  handleResetRecordingAction,
  handleTranscribeRecordingAction,
  handleUseTranscriptAction,
}: SpeechStepProps) => {
  const progressPercent = ((recordingLimitSeconds - remainingRecordingSeconds) / recordingLimitSeconds) * 100;

  return (
    <section className="space-y-6 step-section">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="space-y-1">
          <p className="text-xs uppercase tracking-[0.4em] text-[#5b647b]">Step 5 · Speech</p>
          <h2 className="text-2xl font-bold text-[#e0af68] sm:text-3xl">Transcribe & refine</h2>
        </div>
        <div className="flex flex-wrap items-center gap-3 text-[11px]">
          <span className="rounded-full border border-[#24283b] bg-[#1f2335] px-3 py-1 text-[#7aa2f7]">CEFR {cefrLevel}</span>
          <span className={`rounded-full border px-3 py-1 ${recordingSupported ? "border-[#24283b] bg-[#1f2335] text-[#9ece6a]" : "border-[#f7768e]/40 bg-[#2a1620] text-[#f7768e]"}`}>
            {recordingSupported ? "Microphone ready" : "Microphone unavailable"}
          </span>
          <span className={`rounded-full border px-3 py-1 ${browserFallbackSupported ? "border-[#24283b] bg-[#1f2335] text-[#7dcfff]" : "border-[#24283b] bg-[#16161e] text-[#5b647b]"}`}>
            {browserFallbackSupported ? "Web Speech fallback ready" : "Web Speech fallback unavailable"}
          </span>
        </div>
      </div>

      <div className="rounded border border-[#24283b] bg-[#141724] p-4 shadow-[0_12px_40px_rgba(0,0,0,0.35)]">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
          <div className="space-y-2">
            <p className="text-xs uppercase tracking-[0.4em] text-[#5b647b]">1-minute speaking capture</p>
            <h3 className="text-xl font-bold text-[#cdd6f4]">Record your spoken English, replay it, then transcribe it.</h3>
            <p className="max-w-2xl text-[12px] leading-relaxed text-[#7f89a8]">
              Start the timer, speak for up to one minute, then play the recording back and convert it to text before asking Gemini for feedback. If Gemini transcription is unavailable, the browser Web Speech API transcript will be used when supported.
            </p>
          </div>
          <div className="rounded-2xl border border-[#24283b] bg-[#0f111a] px-5 py-4 text-center shadow-[inset_0_1px_0_rgba(255,255,255,0.03)]">
            <p className="text-[10px] uppercase tracking-[0.4em] text-[#5b647b]">Time left</p>
            <div className="mt-2 text-3xl font-bold tracking-[0.18em] text-[#e0af68]">{formatRemainingTime(remainingRecordingSeconds)}</div>
            <p className="mt-1 text-[11px] text-[#5b647b]">Limit {recordingLimitSeconds}s</p>
          </div>
        </div>

        <div className="mt-4 h-2 overflow-hidden rounded-full bg-[#0f111a]">
          <div
            className={`h-full rounded-full transition-all ${isRecording ? "bg-[#f7768e]" : "bg-[#7aa2f7]"}`}
            style={{ width: `${Math.min(100, Math.max(0, progressPercent))}%` }}
          />
        </div>

        <div className="mt-4 flex flex-wrap items-center gap-3">
          <button
            type="button"
            onClick={() => void handleStartRecordingAction()}
            disabled={!recordingSupported || isRecording}
            className="flex items-center gap-2 rounded-full bg-[#f7768e] px-6 py-2 text-xs font-bold uppercase tracking-[0.4em] text-[#1a1b26] transition hover:brightness-110 disabled:opacity-40"
          >
            {isRecording ? (
              <>
                <span className="spinner" />
                Recording…
              </>
            ) : (
              "Start recording"
            )}
          </button>
          <button
            type="button"
            onClick={handleStopRecordingAction}
            disabled={!isRecording}
            className="rounded-full border border-[#e0af68] px-5 py-2 text-xs font-bold uppercase tracking-[0.4em] text-[#e0af68] transition hover:brightness-110 disabled:opacity-40"
          >
            Stop
          </button>
          <button
            type="button"
            onClick={handleResetRecordingAction}
            disabled={isRecording || (!recordingReady && !recordedAudioUrl && !transcript)}
            className="rounded-full border border-[#7aa2f7] px-5 py-2 text-xs font-bold uppercase tracking-[0.4em] text-[#7aa2f7] transition hover:brightness-110 disabled:opacity-40"
          >
            Reset
          </button>
          <span className="text-[11px] text-[#5b647b]">
            {isRecording ? "Recording stops automatically at 00:00." : recordingReady ? `Captured ${formatDuration(recordingDurationMs)}.` : "Press record when you're ready to speak."}
          </span>
        </div>

        {recordingError && <p className="mt-3 text-[12px] text-[#f7768e]">{recordingError}</p>}

        {recordedAudioUrl && (
          <div className="mt-4 rounded border border-[#24283b] bg-[#16161e] p-4">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <p className="text-[10px] uppercase tracking-[0.4em] text-[#5b647b]">Playback</p>
                <p className="mt-1 text-[12px] text-[#cdd6f4]">Review your recording before transcription.</p>
              </div>
              <button
                type="button"
                onClick={handleTranscribeRecordingAction}
                disabled={transcriptionLoading || isRecording || !recordingReady}
                className="flex items-center gap-2 rounded-full bg-[#9ece6a] px-5 py-2 text-xs font-bold uppercase tracking-[0.4em] text-[#1a1b26] transition hover:brightness-110 disabled:opacity-40"
              >
                {transcriptionLoading ? (
                  <>
                    <span className="spinner" />
                    Transcribing…
                  </>
                ) : (
                  "Transcribe recording"
                )}
              </button>
            </div>
            <audio controls src={recordedAudioUrl} className="mt-4 w-full" />
          </div>
        )}

        {(transcript || transcriptionError) && (
          <div className="mt-4 rounded border border-[#24283b] bg-[#16161e] p-4">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <p className="text-[10px] uppercase tracking-[0.4em] text-[#5b647b]">Transcription</p>
                <p className="mt-1 text-[12px] text-[#cdd6f4]">Use the transcript as the input for Gemini feedback.</p>
              </div>
              <button
                type="button"
                onClick={handleUseTranscriptAction}
                disabled={!transcript.trim()}
                className="rounded-full border border-[#bb9af7] px-5 py-2 text-xs font-bold uppercase tracking-[0.4em] text-[#bb9af7] transition hover:brightness-110 disabled:opacity-40"
              >
                Use transcript
              </button>
            </div>
            {transcriptionError ? (
              <p className="mt-3 text-[12px] text-[#f7768e]">{transcriptionError}</p>
            ) : (
              <>
                {transcriptionNotice ? <p className="mt-3 text-[12px] text-[#7dcfff]">{transcriptionNotice}</p> : null}
                <pre className="mt-3 max-h-[240px] overflow-y-auto whitespace-pre-wrap rounded border border-[#1f2335] bg-[#0f111a] p-3 text-[13px] leading-relaxed text-[#cdd6f4]">
                  {transcript}
                </pre>
              </>
            )}
          </div>
        )}
      </div>

      <div className="rounded border border-[#24283b] bg-[#141724] p-4">
        <p className="text-xs uppercase tracking-[0.4em] text-[#5b647b]">Speech text</p>
        <textarea
          value={speechText}
          onChange={(event) => onSpeechTextChangeAction(event.target.value)}
          rows={5}
          placeholder="Type or paste what you spoke in English, or use the transcript above."
          className="mt-3 w-full rounded border border-[#24283b] bg-[#0f111a] px-3 py-2 text-sm leading-relaxed text-[#cdd6f4] focus:border-[#7aa2f7] focus:outline-none"
        />
      </div>

      {speechError && <p className="text-[12px] text-[#f7768e]">{speechError}</p>}

      <div className="flex flex-wrap items-center gap-3">
        <button
          type="button"
          onClick={handleAnalyzeSpeechAction}
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
          <pre className="mt-2 max-h-[480px] overflow-y-auto whitespace-pre-wrap text-[13px] leading-relaxed text-[#cdd6f4]">{speechFeedback}</pre>
        </div>
      )}
    </section>
  );
};
