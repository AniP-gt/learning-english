export type CEFRLevel = "A1" | "A2" | "B1" | "B2" | "C1" | "C2";

export type GenerateAction = "topic" | "words" | "reading";

export interface GenerateRequestPayload {
  action: GenerateAction;
  input: string;
  cefrLevel?: CEFRLevel;
}

export interface GenerateResponsePayload {
  content: string;
}
