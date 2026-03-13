export type SpeakVoice = {
  name: string;
  lang: string;
  voiceURI: string;
};

export type WordsTable = {
  headers: string[];
  rows: string[][];
} | null;

export type StorageUnavailableReason = "missing_config" | "missing_directory" | "not_directory";

export type StorageMetadata = {
  available: boolean;
  source: "filesystem" | "localStorage";
  reason?: StorageUnavailableReason;
  path?: string;
};
