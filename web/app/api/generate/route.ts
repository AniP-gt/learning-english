import { NextRequest, NextResponse } from "next/server";
import { CEFRLevel, GenerateRequestPayload, ChatHistoryEntry } from "../../types";
import {
  defaultGeminiModel,
  geminiModels,
  imageGeminiModel,
} from "../../lib/geminiModels";
const BASE_URL = "https://generativelanguage.googleapis.com/v1beta/models";
const DEFAULT_CEFR: CEFRLevel = "B1";
const VALID_CEFR_LEVELS: CEFRLevel[] = ["A1", "A2", "B1", "B2", "C1", "C2"];

const WORD_COUNT_RANGE: Record<CEFRLevel, string> = {
  A1: "80-100",
  A2: "100-130",
  B1: "150-180",
  B2: "180-220",
  C1: "220-270",
  C2: "270-320",
};

const normalizeCefr = (value?: string): CEFRLevel => {
  if (!value) {
    return DEFAULT_CEFR;
  }
  const upper = value.toUpperCase();
  if (VALID_CEFR_LEVELS.includes(upper as CEFRLevel)) {
    return upper as CEFRLevel;
  }
  return DEFAULT_CEFR;
};

const buildTopicPrompt = (japaneseText: string) => {
  return `以下の日本語テキストから、英語学習に最適なトピックとキーワードを抽出してください。

日本語テキスト:
${japaneseText}

以下の形式で出力してください:
# Topic
[メインのトピック（英語）]

# Keywords
- [キーワード1（英語）]
- [キーワード2（英語）]
- [キーワード3（英語）]

# Summary
[トピックの簡単な説明（日本語）]`;
};

const buildWordsPrompt = (topic: string, cefr: CEFRLevel) => {
  return `以下のトピックに関連する英単語リストを作成してください。

トピック: ${topic}
難易度 (CEFRレベル): ${cefr}

${cefr}レベルの学習者に適した語彙を選び、以下のMarkdownテーブル形式で10-15単語を出力してください:
| Word | Translation | Example |
|------|-------------|---------|
| word | 日本語訳 | Example sentence using the word. |

強調のための ** 太字記法は使わないでください。`;
};

const buildReadingPrompt = (topic: string, cefr: CEFRLevel, contextWords?: string) => {
  const wordCount = WORD_COUNT_RANGE[cefr];
  const contextBlock = contextWords?.trim()
    ? `Use the following weekly vocabulary when writing the passage. Incorporate these terms naturally at least once each:\n${contextWords.trim()}\n\n`
    : "";
  return `以下のトピックに関連する英文を作成してください。WPM計測用の読解テキストです。

トピック: ${topic}

要件:
- CEFRレベル: ${cefr}
- 単語数: ${wordCount}語
- 自然な英語で書く
- 複数の段落に分ける
- ** の太字記法は使わない

${contextBlock}テキストの最初に # Reading と書き、次の行に CEFR: ${cefr} | Words: [実際の単語数] と書いてください。
その後に本文を書いてください。`;
};

const buildSpeechPrompt = (input: string, cefr: CEFRLevel) => {
  return `あなたは英語教師です。以下の学習者のテキスト（CEFR ${cefr} レベル）に対して、文法の間違い、より自然な表現、そしてCEFRに沿ったスコアを丁寧に示してください。

出力形式:
# Grammar Corrections
- 1. 修正例 (理由)

# Natural Phrasing Suggestions
- 1. 自然な言い換え (解説)

# Score
CEFR: ${cefr} | 10点満点での自然さスコア

テキスト:
${input}`;
};

const buildImagePrompt = (input: string) => {
  return `あなたは記憶を助けるイメージトレーナーです。次の英語テキストから、色・光・音・匂いなど五感を使って、記憶に残るような1つの印象的な風景を描写してください。出力は1段落で、現実的かつ詩的なディテールを含めてください。

発話:
${input}`;
};

const formatHistory = (history: ChatHistoryEntry[]) => {
  return history
    .map((entry) => {
      const prefix = entry.role === "user" ? "Learner" : "Assistant";
      return `${prefix}: ${entry.content}`;
    })
    .join("\n");
};

const buildChatPrompt = (history: ChatHistoryEntry[], input: string) => {
  const historyBlock = history.length ? `Conversation so far:\n${formatHistory(history)}\n` : "";
  return `You are a patient English-speaking partner who helps learners practice natural dialogue. Keep your tone encouraging and concise.

${historyBlock}Learner: ${input}
Assistant:`;
};

const buildFeedbackPrompt = (input: string, cefr: CEFRLevel) => {
  return `You are an empathetic English tutor. Review the following learner response with CEFR ${cefr} in mind.

Response:
${input}

Provide:
- Grammar corrections and why.
- More natural paraphrases.
- A brief scoring summary mentioning CEFR and a 1-10 fluency score.`;
};

const buildPrompt = (payload: GenerateRequestPayload, cefr: CEFRLevel) => {
    switch (payload.action) {
      case "topic":
        return buildTopicPrompt(payload.input);
      case "words":
        return buildWordsPrompt(payload.input, cefr);
      case "reading":
        return buildReadingPrompt(payload.input, cefr, payload.contextWords);
    case "speech":
      return buildSpeechPrompt(payload.input, cefr);
    case "image_prompt":
      return buildImagePrompt(payload.input);
    case "chat":
      return buildChatPrompt(payload.history ?? [], payload.input);
    case "feedback":
      return buildFeedbackPrompt(payload.input, cefr);
    default:
      throw new Error("Unsupported action");
  }
};

const createRequestBody = (prompt: string) => ({
  contents: [
    {
      parts: [{ text: prompt }],
    },
  ],
});

async function callGeminiWithFallback(
  modelsToTry: readonly string[],
  prompt: string,
  apiKey: string
): Promise<{ content: string; model: string }> {
  const payload = createRequestBody(prompt);

  for (const model of modelsToTry) {
    const url = `${BASE_URL}/${model}:generateContent?key=${encodeURIComponent(apiKey)}`;
    let response: Response;
    try {
      response = await fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
        cache: "no-store",
      });
    } catch {
      throw new Error("Failed to reach Gemini");
    }

    if (response.status === 429) {
      continue;
    }

    if (!response.ok) {
      const raw = await response.text();
      throw new Error(raw || `Gemini request failed (${response.status})`);
    }

    const raw = await response.text();
    const parsed = JSON.parse(raw);
    const candidate = parsed?.candidates?.[0]?.content?.parts?.[0]?.text;
    if (!candidate) {
      throw new Error("Gemini returned an empty result");
    }
    return { content: candidate, model };
  }

  throw new Error("All Gemini models are rate limited (429). Please try again later.");
}

export async function POST(request: NextRequest) {
  let body: GenerateRequestPayload;
  try {
    body = await request.json();
  } catch (error) {
    return NextResponse.json({ error: "Invalid JSON payload" }, { status: 400 });
  }

  const { action, input, cefrLevel, model } = body;

  if (!action || !input) {
    return NextResponse.json({ error: "action and input are required" }, { status: 400 });
  }

  const sanitizedInput = input.trim();
  if (!sanitizedInput) {
    return NextResponse.json({ error: "Input cannot be empty" }, { status: 400 });
  }

  const cefr = normalizeCefr(cefrLevel);
  let prompt: string;
  try {
    prompt = buildPrompt({ ...body, input: sanitizedInput }, cefr);
  } catch (error) {
    return NextResponse.json({ error: (error as Error).message }, { status: 400 });
  }

  const key = process.env.GEMINI_API_KEY ?? request.headers.get("x-api-key");
  if (!key) {
    return NextResponse.json({ error: "Gemini API key is not configured" }, { status: 401 });
  }

  const candidateModel = model ?? defaultGeminiModel;
  const resolvedModel = geminiModels.includes(candidateModel) ? candidateModel : defaultGeminiModel;
  const modelQueue = [resolvedModel, ...geminiModels.filter((item) => item !== resolvedModel)];
  const modelsToTry = action === "image_prompt" ? [imageGeminiModel] : modelQueue;

  try {
    const { content } = await callGeminiWithFallback(modelsToTry, prompt, key);
    return NextResponse.json({ content });
  } catch (error) {
    const message = (error as Error).message;
    const status = message.includes("rate limited") ? 429 : 502;
    return NextResponse.json({ error: message }, { status });
  }
}
