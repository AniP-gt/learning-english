"use client";

import { formatWeekLabel } from "../lib/constants";

type SidebarProps = {
  weeks: string[];
  weeksLoading: boolean;
  weeksError: string;
  activeWeek: string | null;
  weekFilesLoading: boolean;
  currentWeekKey: string;
  onWeekSelect: (week: string) => void;
};

export const Sidebar = ({
  weeks,
  weeksLoading,
  weeksError,
  activeWeek,
  weekFilesLoading,
  currentWeekKey,
  onWeekSelect,
}: SidebarProps) => (
  <aside className="w-72 border-r border-[#24283b] bg-[#16161e] px-4 py-6">
    <div className="text-xs uppercase text-[#7aa2f7] tracking-[0.3em]">workspace</div>
    <div className="mt-5 text-sm text-[#e0af68]">eng-learning</div>
    <div className="mt-6 flex items-center gap-2 text-sm text-[#9ece6a]">
      <span className="h-2 w-2 rounded-full bg-[#9ece6a]" /> root
      <span className="text-[10px] uppercase tracking-[0.3em] text-[#5b647b]">weekly</span>
    </div>
    <div className="mt-6 text-[10px] uppercase tracking-[0.3em] text-[#5b647b]">weekly history</div>
    <div className="mt-3 flex flex-col gap-2 text-sm">
      {weeksLoading ? (
        <div className="rounded border border-[#24283b] bg-[#1f2335] px-3 py-2 text-[11px] text-[#5b647b]">LOADING…</div>
      ) : weeks.length === 0 ? (
        <div className="rounded border border-[#24283b] bg-[#1f2335] px-3 py-2 text-[11px] text-[#5b647b]">
          No weeks recorded yet
        </div>
      ) : (
        weeks.map((week) => (
          <button
            key={week}
            type="button"
            onClick={() => onWeekSelect(week)}
            className={`flex items-center justify-between rounded px-3 py-2 text-left text-[13px] uppercase tracking-[0.15em] transition ${
              activeWeek === week
                ? "bg-[#7aa2f7]/20 text-white"
                : "text-[#a9b1d6] hover:bg-[#24283b]"
            }`}
          >
            <div className="flex items-center gap-2">
              <span
                className={`h-2 w-2 rounded-full ${
                  week === currentWeekKey ? "bg-[#9ece6a]" : "bg-[#7aa2f7]"
                }`}
              />
              <span className="text-[12px] font-semibold tracking-[0.3em]">{formatWeekLabel(week)}</span>
            </div>
            {week === currentWeekKey && (
              <span className="rounded-full border border-[#24283b] bg-[#1f2335] px-2 py-0.5 text-[9px] tracking-[0.3em] text-[#9ece6a]">
                This Week
              </span>
            )}
            {activeWeek === week && weekFilesLoading && (
              <span className="h-2 w-2 animate-spin rounded-full border border-[#7aa2f7] border-t-transparent" />
            )}
          </button>
        ))
      )}
    </div>
    {weeksError && <p className="mt-3 text-[11px] text-[#f7768e]">{weeksError}</p>}
    <div className="mt-6 text-[10px] uppercase tracking-[0.3em] text-[#5b647b]">status</div>
    <div className="mt-2 text-[11px] text-[#a9b1d6]">Synced · GPT & TUI</div>
  </aside>
);
