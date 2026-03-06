"use client";

import { CEFRLevel } from "../types";
import { cefrLevels } from "../lib/constants";

type SettingsPanelProps = {
  open: boolean;
  apiKey: string;
  cefrLevel: CEFRLevel;
  settingsMessage: string;
  onClose: () => void;
  onApiKeyChange: (key: string) => void;
  onCefrLevelChange: (level: CEFRLevel) => void;
  onSave: () => void;
};

export const SettingsPanel = ({
  open,
  apiKey,
  cefrLevel,
  settingsMessage,
  onClose,
  onApiKeyChange,
  onCefrLevelChange,
  onSave,
}: SettingsPanelProps) => (
  <>
    {open && <div className="fixed inset-0 z-50 bg-black/60" onClick={onClose} />}
    <div
      className={`fixed inset-y-0 right-0 z-60 w-full max-w-sm sm:w-96 overflow-y-auto border-l border-[#24283b] bg-[#0f111a] px-6 py-8 shadow-[0_0_30px_rgba(5,6,15,0.7)] transition-transform duration-300 ${
        open ? "translate-x-0" : "translate-x-full"
      }`}
    >
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold text-[#7aa2f7]">Settings</h3>
        <button
          type="button"
          onClick={onClose}
          className="text-[11px] uppercase tracking-[0.4em] text-[#5b6477]"
        >
          Close
        </button>
      </div>
      <p className="mt-4 text-[12px] text-[#5b647b]">Gemini API key is stored locally and sent securely via the API route.</p>
      <label className="mt-6 block text-[11px] uppercase tracking-[0.4em] text-[#5b647b]" htmlFor="gemini-key">
        Gemini API Key
      </label>
      <input
        id="gemini-key"
        type="password"
        value={apiKey}
        onChange={(event) => onApiKeyChange(event.target.value)}
        placeholder="sk-xxxx"
        className="mt-2 w-full rounded border border-[#24283b] bg-[#121422] px-3 py-2 text-sm text-[#cdd6f4] focus:border-[#7aa2f7] focus:outline-none"
      />

      <div className="mt-5 text-[11px] uppercase tracking-[0.4em] text-[#5b647b]">CEFR Level</div>
      <div className="mt-2 flex flex-wrap gap-2">
        {cefrLevels.map((level) => (
          <button
            key={level}
            type="button"
            onClick={() => onCefrLevelChange(level)}
            className={`rounded-full px-4 py-1 text-xs uppercase tracking-[0.4em] transition ${
              cefrLevel === level
                ? "border border-[#7aa2f7] bg-[#7aa2f7]/30 text-[#7aa2f7]"
                : "border border-[#24283b] text-[#5b647b]"
            }`}
          >
            {level}
          </button>
        ))}
      </div>

      <button
        type="button"
        onClick={onSave}
        className="mt-6 w-full rounded-full bg-[#7aa2f7] px-4 py-2 text-xs font-bold uppercase tracking-[0.4em] text-[#1a1b26] transition hover:brightness-110"
      >
        Save Settings
      </button>
      {settingsMessage && <p className="mt-2 text-[12px] text-[#9ece6a]">{settingsMessage}</p>}
    </div>
  </>
);
