import { CEFRLevel } from "../types";
import { WordsTable } from "./types";

export const steps = [
  { id: 1, title: "1. Idea", caption: "日本語ネタ出し" },
  { id: 2, title: "2. Words", caption: "単語帳作成" },
  { id: 3, title: "3. Reading", caption: "WPM計測" },
  { id: 4, title: "4. Listening", caption: "Say / WebTTS" },
  { id: 5, title: "5. Speech", caption: "録音 & STT" },
  { id: 6, title: "6. 3-2-1", caption: "画像想起" },
  { id: 7, title: "7. Roleplay", caption: "Gemini Chat" },
];

export const cefrLevels: CEFRLevel[] = ["A1", "A2", "B1", "B2", "C1", "C2"];
export const indicatorWidth = 100 / steps.length;

export const getCurrentWeekKey = () => {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, "0");
  const weekNumber = Math.ceil(now.getDate() / 7);
  return `${year}/${month}/week${weekNumber}`;
};

export const formatWeekLabel = (week: string) => {
  const [year, month, weekSuffix] = week.split("/");
  if (!year || !month || !weekSuffix) {
    return week;
  }
  return `${year} / ${month} / ${weekSuffix}`;
};

export const parseTopicFromIdea = (text: string) => {
  const match = text.match(/#\s*Topic\s*\n([^\n\r]+)/i);
  if (match && match[1]) {
    return match[1].trim();
  }
  const fallback = text.split(/\r?\n/).find((line) => line.trim().length > 0);
  return fallback ? fallback.trim().slice(0, 40) : "";
};

export const stripReadingHeader = (text: string): string => {
  return text
    .replace(/^#\s+Reading\s*\r?\n/, "")
    .replace(/^CEFR:[^\r\n]*\r?\n/, "")
    .trimStart();
};

export const parseMarkdownTable = (markdown: string): WordsTable => {
  if (!markdown.trim()) {
    return null;
  }

  const rows: string[][] = [];
  markdown.split(/\r?\n/).forEach((line) => {
    const trimmed = line.trim();
    if (!trimmed.startsWith("|")) {
      return;
    }
    const cells = trimmed
      .split("|")
      .map((cell) => cell.trim())
      .filter((cell) => cell.length > 0);
    if (cells.length === 0) {
      return;
    }
    if (cells.every((cell) => /^-+$/.test(cell))) {
      return;
    }
    rows.push(cells);
  });

  if (rows.length < 2) {
    return null;
  }

  const [headers, ...body] = rows;
  return {
    headers,
    rows: body,
  };
};

export const reviewsCopy = {
  loading: "⏳ Words & Reading を生成中...",
  done: "✓ Words & Reading 生成済み",
};
