"use client";

import Image from "next/image";

type SceneStepProps = {
  sceneSourceText: string;
  scenePrompt: string;
  sceneLoading: boolean;
  sceneError: string;
  handleGenerateSceneAction: () => void;
  weekImageUrl: string;
  readingFallbackText: string;
};

export const SceneStep = ({
  sceneSourceText,
  scenePrompt,
  sceneLoading,
  sceneError,
  handleGenerateSceneAction,
  weekImageUrl,
  readingFallbackText,
}: SceneStepProps) => {
  const trimmedReadingFallback = readingFallbackText.trim();
  const hasReadingFallback = Boolean(trimmedReadingFallback);

  return (
    <section className="space-y-6 step-section">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="space-y-1">
          <p className="text-xs uppercase tracking-[0.4em] text-[#5b647b]">Step 6 · 3-2-1</p>
          <h2 className="text-2xl font-bold text-[#bb9af7] sm:text-3xl">Visualize the scene</h2>
        </div>
        <span className="rounded-full border border-[#24283b] bg-[#1f2335] px-3 py-1 text-[11px] text-[#cdd6f4]">Memory prompt</span>
      </div>
      <div className="rounded border border-[#24283b] bg-[#141724] p-4 text-sm text-[#cdd6f4] shadow-[0_12px_45px_rgba(5,6,16,0.45)]">
        <div className="flex items-center justify-between">
          <p className="text-[10px] uppercase tracking-[0.4em] text-[#5b647b]">Visual anchor</p>
          <span className="text-[11px] text-[#9ece6a]">{weekImageUrl ? "Week image" : "Reading fallback"}</span>
        </div>
        {weekImageUrl ? (
          <div className="mt-3 overflow-hidden rounded-2xl border border-[#1f2335] bg-[#0f111a] shadow-[0_20px_60px_rgba(0,0,0,0.6)]">
            <Image
              src={weekImageUrl}
              alt="Week illustration"
              width={1200}
              height={780}
              className="h-[260px] w-full object-cover"
              unoptimized
            />
          </div>
        ) : hasReadingFallback ? (
          <pre className="mt-3 max-h-[280px] overflow-y-auto whitespace-pre-wrap rounded-2xl border border-[#1f2335] bg-[#0f111a] p-3 text-[13px] leading-relaxed text-[#cdd6f4]">
            {trimmedReadingFallback}
          </pre>
        ) : (
          <p className="mt-3 text-[12px] text-[#5b647b]">
            No week image or reading material yet; finish Steps 3 and 5 to unlock a visual anchor here.
          </p>
        )}
      </div>
      <div className="rounded border border-[#24283b] bg-[#16161e] p-4 text-[13px] text-[#cdd6f4]">
        <p className="text-[10px] uppercase tracking-[0.4em] text-[#5b647b]">Source text</p>
        <p className="mt-2 leading-relaxed text-[#cdd6f4] max-h-[480px] overflow-y-auto">
          {sceneSourceText || "Use Step 5 speech input or the reading text to seed the visualization."}
        </p>
      </div>
      <div className="flex flex-wrap items-center gap-3">
        <button
          type="button"
          onClick={handleGenerateSceneAction}
          disabled={sceneLoading || !sceneSourceText}
          className="flex items-center gap-2 rounded-full bg-[#bb9af7] px-6 py-2 text-xs font-bold uppercase tracking-[0.4em] text-[#1a1b26] transition hover:brightness-110 disabled:opacity-40"
        >
          {sceneLoading ? (
            <>
              <span className="spinner" />
              Generating…
            </>
          ) : (
            "Generate Image Prompt"
          )}
        </button>
        <span className="text-[11px] text-[#5b647b]">Gemini crafts a vivid scene for recall.</span>
      </div>
      {sceneError && <p className="text-[12px] text-[#f7768e]">{sceneError}</p>}
      {scenePrompt && (
        <div className="rounded border border-[#24283b] bg-[#141724] p-4">
          <p className="text-[10px] uppercase tracking-[0.4em] text-[#5b647b]">📸 Scene Description</p>
          <p className="mt-2 whitespace-pre-wrap text-[13px] leading-relaxed text-[#cdd6f4]">{scenePrompt}</p>
        </div>
      )}
    </section>
  );
};
