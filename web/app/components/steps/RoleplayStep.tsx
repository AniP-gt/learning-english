"use client";

import { ChatHistoryEntry } from "../../types";

type RoleplayStepProps = {
  chatHistory: ChatHistoryEntry[];
  chatError: string;
  chatInput: string;
  onChatInputChange: (value: string) => void;
  handleSendChat: () => void;
  chatLoading: boolean;
  handleRequestFeedback: () => void;
  feedbackLoading: boolean;
  feedbackError: string;
  feedbackMessage: string;
  hasUserMessage: boolean;
};

export const RoleplayStep = ({
  chatHistory,
  chatError,
  chatInput,
  onChatInputChange,
  handleSendChat,
  chatLoading,
  handleRequestFeedback,
  feedbackLoading,
  feedbackError,
  feedbackMessage,
  hasUserMessage,
}: RoleplayStepProps) => (
  <section className="space-y-6 step-section">
    <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
      <div className="space-y-1">
        <p className="text-xs uppercase tracking-[0.4em] text-[#5b647b]">Step 7 · Roleplay</p>
        <h2 className="text-2xl font-bold text-[#bb9af7] sm:text-3xl">Gemini chat lab</h2>
      </div>
      <span className="rounded-full border border-[#24283b] bg-[#1f2335] px-3 py-1 text-[11px] text-[#bb9af7]">Live talk</span>
    </div>
    <div className="h-48 sm:h-72 overflow-y-auto rounded border border-[#24283b] bg-[#141724] p-4 text-sm">
      {chatHistory.length === 0 ? (
        <p className="text-[12px] text-[#5b647b]">Send a message to start the roleplay.</p>
      ) : (
        chatHistory.map((message, index) => (
          <div key={`${message.role}-${index}`} className="mb-3">
            <div
              className={`text-[10px] uppercase tracking-[0.3em] ${
                message.role === "user" ? "text-[#9ece6a]" : "text-[#bb9af7]"
              }`}
            >
              {message.role === "user" ? "You" : "Gemini"}
            </div>
            <div
              className={`mt-1 rounded-2xl px-3 py-2 text-[13px] leading-relaxed ${
                message.role === "user" ? "bg-[#1f2c1f] text-[#9ece6a]" : "bg-[#241c3a] text-[#bb9af7]"
              }`}
            >
              {message.content}
            </div>
          </div>
        ))
      )}
    </div>
    {chatError && <p className="text-[12px] text-[#f7768e]">{chatError}</p>}
    <div className="space-y-3">
      <textarea
        rows={3}
        value={chatInput}
        onChange={(event) => onChatInputChange(event.target.value)}
        placeholder="Chat with Gemini and ask for guidance."
        className="w-full rounded border border-[#24283b] bg-[#0f111a] px-3 py-2 text-sm text-[#cdd6f4] focus:border-[#7aa2f7] focus:outline-none"
      />
      <div className="flex flex-wrap items-center gap-3">
        <button
          type="button"
          onClick={handleSendChat}
          disabled={chatLoading}
          className="flex items-center gap-2 rounded-full bg-[#bb9af7] px-6 py-2 text-xs font-bold uppercase tracking-[0.4em] text-[#1a1b26] transition hover:brightness-110 disabled:opacity-40"
        >
          {chatLoading ? (
            <>
              <span className="spinner" />
              Sending…
            </>
          ) : (
            "Send"
          )}
        </button>
        <button
          type="button"
          onClick={handleRequestFeedback}
          disabled={feedbackLoading || !hasUserMessage}
          className="flex items-center gap-2 rounded-full border border-[#24283b] px-4 py-2 text-xs uppercase tracking-[0.3em] text-[#9ece6a] disabled:opacity-40"
        >
          {feedbackLoading ? (
            <>
              <span className="spinner" />
              Feedback
            </>
          ) : (
            "Get Feedback"
          )}
        </button>
        <span className="text-[11px] text-[#5b647b]">Feedback on your latest reply.</span>
      </div>
      {feedbackError && <p className="text-[12px] text-[#f7768e]">{feedbackError}</p>}
      {feedbackMessage && (
        <div className="rounded border border-[#24283b] bg-[#1f2335] p-3 text-[13px] leading-relaxed text-[#cdd6f4]">
          <div className="text-[10px] uppercase tracking-[0.4em] text-[#7aa2f7]">Feedback</div>
          <p className="mt-2 whitespace-pre-wrap">{feedbackMessage}</p>
        </div>
      )}
    </div>
  </section>
);
