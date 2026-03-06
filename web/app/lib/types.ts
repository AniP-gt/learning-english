export type SpeakVoice = {
  name: string;
  lang: string;
  voiceURI: string;
};

export type WordsTable = {
  headers: string[];
  rows: string[][];
} | null;
