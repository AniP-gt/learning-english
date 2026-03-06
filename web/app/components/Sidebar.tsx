"use client";

import { formatWeekLabel } from "../lib/constants";

type SidebarProps = {
  weeks: string[];
  weeksLoading: boolean;
  weeksError: string;
  activeWeek: string | null;
  weekFilesLoading: boolean;
  currentWeekKey: string;
  onWeekSelectAction: (week: string) => void;
  isOpen?: boolean;
  onCloseAction?: () => void;
};

export const Sidebar = ({
  weeks,
  weeksLoading,
  weeksError,
  activeWeek,
  weekFilesLoading,
  currentWeekKey,
  onWeekSelectAction,
  isOpen,
  onCloseAction,
}: SidebarProps) => {
  const handleClose = () => {
    onCloseAction?.();
  };

  const renderContent = (showClose: boolean) => (
    <aside className="flex h-full flex-col justify-between overflow-y-auto border-r border-[#24283b] bg-[#16161e] px-4 py-6">
      <div className="space-y-4">
        <div className="flex items-start justify-between gap-4">
          <div>
            <div className="text-xs uppercase text-[#7aa2f7] tracking-[0.3em]">workspace</div>
            <div className="mt-2 text-sm text-[#e0af68]">eng-learning</div>
          </div>
          {showClose && (
            <button
              type="button"
              onClick={handleClose}
              className="h-10 w-10 rounded-full border border-[#24283b] bg-[#1f2335] text-xl text-[#7aa2f7] transition hover:border-[#7aa2f7]"
              aria-label="Close sidebar"
            >
              ×
            </button>
          )}
        </div>
        <div className="flex items-center gap-2 text-sm text-[#9ece6a]">
          <span className="h-2 w-2 rounded-full bg-[#9ece6a]" /> root
          <span className="text-[10px] uppercase tracking-[0.3em] text-[#5b647b]">weekly</span>
        </div>
        <div className="text-[10px] uppercase tracking-[0.3em] text-[#5b647b]">weekly history</div>
        <div className="flex flex-col gap-2 text-sm">
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
                onClick={() => onWeekSelectAction(week)}
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
        {weeksError && <p className="text-[11px] text-[#f7768e]">{weeksError}</p>}
      </div>
      <div>
        <div className="text-[10px] uppercase tracking-[0.3em] text-[#5b647b]">status</div>
        <div className="mt-2 text-[11px] text-[#a9b1d6]">Synced · GPT & TUI</div>
      </div>
    </aside>
  );

  return (
    <>
      <div className="hidden md:flex md:w-72 md:flex-col">{renderContent(false)}</div>
      {isOpen && (
        <>
          <div className="fixed inset-0 z-40 bg-black/60 md:hidden" onClick={handleClose} />
          <div className="fixed left-0 top-0 z-50 h-full w-72 md:hidden">{renderContent(true)}</div>
        </>
      )}
    </>
  );
};
