"use client";

import { useCallback, useEffect, useState } from "react";
import { useSpeech } from "../hooks/useSpeech";

type Flashcard = {
  word: string;
  translation: string;
  example: string;
};

type FlashcardModalProps = {
  cards: Flashcard[];
  onClose: () => void;
};

export const FlashcardModal = ({ cards, onClose }: FlashcardModalProps) => {
  const [index, setIndex] = useState(0);
  const [flipped, setFlipped] = useState(false);
  const [checked, setChecked] = useState<boolean[]>(() => Array(cards.length).fill(false));

  const total = cards.length;
  const current = cards[index];
  const readingOutput = current?.word ?? "";
  const { isSpeaking, listeningSupported, handleSpeak, handleStop } = useSpeech({
    readingOutput,
  });
  const checkedCount = checked.filter(Boolean).length;

  const goNext = useCallback(() => {
    if (total === 0) return;
    if (index < total - 1) {
      setIndex((i) => i + 1);
      setFlipped(false);
    } else {
      // wrap to first card when pressing next on the last card
      setIndex(0);
      setFlipped(false);
    }
  }, [index, total]);

  const goPrev = useCallback(() => {
    if (index > 0) {
      setIndex((i) => i - 1);
      setFlipped(false);
    }
  }, [index]);

  const toggleCheck = useCallback(() => {
    setChecked((prev) => {
      const next = [...prev];
      next[index] = !next[index];
      return next;
    });
  }, [index]);

  const reset = useCallback(() => {
    setChecked(Array(cards.length).fill(false));
    setIndex(0);
    setFlipped(false);
  }, [cards.length]);

  // キーボード操作 (TUI と同等)
  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => {
      switch (e.key) {
        case "Escape":
          onClose();
          break;
        case " ":
          e.preventDefault();
          setFlipped((f) => !f);
          break;
        case "ArrowRight":
        case "l":
          goNext();
          break;
        case "ArrowLeft":
        case "h":
          goPrev();
          break;
        case "k":
        case "K":
          toggleCheck();
          break;
        case "r":
          reset();
          break;
        case "p":
        case "P":
          if (isSpeaking) handleStop();
          else handleSpeak();
          break;
      }
    };
    window.addEventListener("keydown", handleKey);
    return () => window.removeEventListener("keydown", handleKey);
  }, [goNext, goPrev, onClose, reset, toggleCheck, handleSpeak, handleStop, isSpeaking]);

  if (!current) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4"
      onClick={onClose}
    >
      <div
        className="relative w-full max-w-lg"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="mb-3 flex items-center justify-between text-[11px] uppercase tracking-[0.4em] text-[#5b647b]">
          <span>Flashcard · Step 2</span>
          <div className="flex items-center gap-3">
            <span className="text-[#9ece6a]">
              ✓ {checkedCount}/{total}
            </span>
            <span>
              {index + 1}/{total}
            </span>
            <button
              type="button"
              onClick={onClose}
              className="text-[#f7768e] hover:text-[#f7768e]/80 transition-colors"
              title="Close (Esc)"
            >
              ✕
            </button>
          </div>
        </div>

        <div className="mb-4 h-1 w-full rounded-full bg-[#24283b] overflow-hidden">
          <div
            className="h-full rounded-full bg-[#7aa2f7] transition-all duration-300"
            style={{ width: `${((index + 1) / total) * 100}%` }}
          />
        </div>

        <div
          className={`relative cursor-pointer select-none rounded-xl border bg-[#1f2335] px-8 py-10 text-center shadow-2xl transition-all duration-200 ${
            checked[index]
              ? "border-[#9ece6a]/60 shadow-[0_0_20px_rgba(158,206,106,0.15)]"
              : "border-[#24283b] hover:border-[#7aa2f7]/40"
          }`}
          onClick={() => setFlipped((f) => !f)}
        >
          {checked[index] && (
            <span className="absolute right-4 top-4 text-lg text-[#9ece6a]">✓</span>
          )}

          {!flipped ? (
            <div className="space-y-3">
              <p className="text-[10px] uppercase tracking-[0.4em] text-[#5b647b]">English</p>
              <div className="flex items-center justify-center gap-3">
                <p className="text-3xl font-bold text-[#7aa2f7] break-words">{current.word}</p>
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    if (isSpeaking) handleStop();
                    else handleSpeak();
                  }}
                  disabled={!listeningSupported}
                  title={listeningSupported ? (isSpeaking ? "Stop reading (p)" : "Read aloud (p)") : "Speech not supported in this browser"}
                  className="rounded px-2 py-1 text-sm border border-[#24283b] hover:border-[#7aa2f7]"
                >
                  {isSpeaking ? "⏸" : "🔊"}
                </button>
              </div>
              <p className="mt-6 text-[11px] text-[#5b647b]">
                Space / Click to reveal
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              <p className="text-[10px] uppercase tracking-[0.4em] text-[#5b647b]">Translation</p>
              <p className="text-2xl font-bold text-[#9ece6a] break-words">{current.translation}</p>
              {current.example && (
                <div className="mt-4 border-t border-[#24283b] pt-4">
                  <p className="text-[10px] uppercase tracking-[0.4em] text-[#5b647b] mb-2">Example</p>
                  <p className="text-sm italic text-[#cdd6f4] leading-relaxed">{current.example}</p>
                </div>
              )}
              <p className="mt-4 text-[11px] text-[#5b647b]">
                Space / Click to flip back
              </p>
            </div>
          )}
        </div>

        <div className="mt-4 flex items-center justify-between gap-2">
          <button
            type="button"
            onClick={goPrev}
            disabled={index === 0}
            className="flex-1 rounded border border-[#24283b] px-4 py-2 text-[12px] text-[#7aa2f7] uppercase tracking-[0.3em] hover:border-[#7aa2f7] transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
            title="Previous (← / h)"
          >
            ← Prev
          </button>

          <button
            type="button"
            onClick={toggleCheck}
            className={`rounded border px-4 py-2 text-[12px] uppercase tracking-[0.3em] transition-colors ${
              checked[index]
                ? "border-[#9ece6a] text-[#9ece6a] bg-[#9ece6a]/10"
                : "border-[#24283b] text-[#5b647b] hover:border-[#9ece6a] hover:text-[#9ece6a]"
            }`}
            title="Toggle known (k)"
          >
            {checked[index] ? "✓ Known" : "Mark Known"}
          </button>

          <button
            type="button"
            onClick={goNext}
            disabled={total === 0}
            className="flex-1 rounded border border-[#24283b] px-4 py-2 text-[12px] text-[#7aa2f7] uppercase tracking-[0.3em] hover:border-[#7aa2f7] transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
            title="Next (→ / l) - wraps to first after last"
          >
            Next →
          </button>
        </div>

        <div className="mt-4 text-center">
          <p className="text-[10px] tracking-[0.3em] text-[#3b4261] uppercase">
            <span className="text-[#5b647b]">esc</span> close ·{" "}
            <span className="text-[#5b647b]">space</span> flip ·{" "}
            <span className="text-[#5b647b]">← →</span> nav ·{" "}
            <span className="text-[#5b647b]">k</span> known ·{" "}
            <span className="text-[#5b647b]">r</span> reset
          </p>
        </div>

        {checkedCount > 0 && (
          <div className="mt-3 text-center">
            <button
              type="button"
              onClick={reset}
              className="text-[11px] text-[#f7768e]/60 hover:text-[#f7768e] transition-colors uppercase tracking-[0.3em]"
              title="Reset all (r)"
            >
              Reset all
            </button>
          </div>
        )}
      </div>
    </div>
  );
};
