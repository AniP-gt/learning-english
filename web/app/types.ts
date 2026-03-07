import { GeminiModel } from "./lib/geminiModels";

export type CEFRLevel = "A1" | "A2" | "B1" | "B2" | "C1" | "C2";

export type GenerateAction =
  | "topic"
  | "words"
  | "reading"
  | "speech"
  | "image_prompt"
  | "chat"
  | "feedback";

export type ChatHistoryEntry = {
  role: "user" | "assistant";
  content: string;
};

export interface GenerateRequestPayload {
  action: GenerateAction;
  input: string;
  cefrLevel?: CEFRLevel;
  history?: ChatHistoryEntry[];
  model?: GeminiModel;
}

export interface GenerateResponsePayload {
  content: string;
}
