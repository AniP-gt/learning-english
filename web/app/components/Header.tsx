"use client";

import { CEFRLevel } from "../types";

type HeaderProps = {
  cefrLevel: CEFRLevel;
  onSettingsOpen: () => void;
};

export const Header = ({ cefrLevel, onSettingsOpen }: HeaderProps) => (
  <header className="flex items-center justify-between border-b border-[#24283b] bg-[#1f2335] px-6 py-3">
    <div className="text-xs uppercase tracking-[0.6em] text-[#7aa2f7]">Gemini Learning Lab</div>
    <div className="flex items-center gap-3 text-[11px] text-[#a9b1d6]">
      <button
        type="button"
        onClick={onSettingsOpen}
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
