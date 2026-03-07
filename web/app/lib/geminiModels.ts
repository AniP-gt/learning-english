export const geminiModels = [
  "gemini-3-flash",
  "gemini-2.5-flash-lite",
  "gemini-3.1-flash-lite",
  "gemini-2.5-flash",
  "gemini-2.5-pro",
] as const;

export type GeminiModel = (typeof geminiModels)[number];

export const defaultGeminiModel: GeminiModel = "gemini-2.5-flash";

export const imageGeminiModel = "gemini-2.5-flash-image";
