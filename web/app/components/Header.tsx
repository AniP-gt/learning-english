"use client";

import { CEFRLevel } from "../types";

type HeaderProps = {
  cefrLevel: CEFRLevel;
  onSettingsOpenAction: () => void;
  onMenuOpenAction?: () => void;
};

export const Header = ({ cefrLevel, onSettingsOpenAction, onMenuOpenAction }: HeaderProps) => (
  <header className="flex items-center justify-between border-b border-[#24283b] bg-[#1f2335] px-3 sm:px-6 py-3">
    <div className="flex items-center gap-3">
      {onMenuOpenAction && (
        <button
          type="button"
          onClick={onMenuOpenAction}
          className="flex h-10 w-10 items-center justify-center rounded-full border border-[#24283b] bg-[#16161e] text-[#7aa2f7] transition hover:border-[#7aa2f7] md:hidden"
          aria-label="Open sidebar"
        >
          <span className="sr-only">Open sidebar</span>
          <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M4 7h16M4 12h16M4 17h16" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </button>
      )}
      <div className="text-xs uppercase tracking-[0.6em] text-[#7aa2f7]">
        <span className="hidden sm:inline">Gemini Learning Lab</span>
        <span className="sm:hidden">Gemini Lab</span>
      </div>
    </div>
    <div className="flex items-center gap-3 text-[11px] text-[#a9b1d6]">
      <button
        type="button"
        onClick={onSettingsOpenAction}
        className="rounded-full border border-[#24283b] bg-[#24283b] px-3 py-1 text-xs uppercase tracking-[0.3em] text-[#7aa2f7] transition hover:border-[#7aa2f7]"
      >
        Settings (?)
      </button>
      <span className="flex items-center gap-2 rounded-full border border-[#24283b] bg-[#16161e] px-3 py-1 text-[10px] text-[#9ece6a]">
        CEFR {cefrLevel}
      </span>
    </div>
  </header>
);
