import { NextRequest, NextResponse } from "next/server";
import { CEFRLevel, GenerateRequestPayload, GenerateAction } from "../../types";

const MODEL_NAME = "gemini-2.5-flash";
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
| word | 日本語訳 | Example sentence using the word. |`;
};

const buildReadingPrompt = (topic: string, cefr: CEFRLevel) => {
  const wordCount = WORD_COUNT_RANGE[cefr];
  return `以下のトピックに関連する英文を作成してください。WPM計測用の読解テキストです。

トピック: ${topic}

要件:
- CEFRレベル: ${cefr}
- 単語数: ${wordCount}語
- 自然な英語で書く
- 複数の段落に分ける

テキストの最初に # Reading と書き、次の行に CEFR: ${cefr} | Words: [実際の単語数] と書いてください。
その後に本文を書いてください。`;
};

const promptBuilder: Record<GenerateAction, (input: string, cefr: CEFRLevel) => string> = {
  topic: (input) => buildTopicPrompt(input),
  words: (input, cefr) => buildWordsPrompt(input, cefr),
  reading: (input, cefr) => buildReadingPrompt(input, cefr),
};

const createRequestBody = (prompt: string) => ({
  contents: [
    {
      parts: [{ text: prompt }],
    },
  ],
});

export async function POST(request: NextRequest) {
  let body: GenerateRequestPayload;
  try {
    body = await request.json();
  } catch (error) {
    return NextResponse.json({ error: "Invalid JSON payload" }, { status: 400 });
  }

  const { action, input, cefrLevel } = body;

  if (!action || !input) {
    return NextResponse.json({ error: "action and input are required" }, { status: 400 });
  }

  if (!promptBuilder[action]) {
    return NextResponse.json({ error: "Unsupported action" }, { status: 400 });
  }

  const sanitizedInput = input.trim();
  if (!sanitizedInput) {
    return NextResponse.json({ error: "Input cannot be empty" }, { status: 400 });
  }

  const cefr = normalizeCefr(cefrLevel);
  const prompt = promptBuilder[action](sanitizedInput, cefr);

  const key = process.env.GEMINI_API_KEY ?? request.headers.get("x-api-key");
  if (!key) {
    return NextResponse.json({ error: "Gemini API key is not configured" }, { status: 401 });
  }

  const url = `${BASE_URL}/${MODEL_NAME}:generateContent?key=${encodeURIComponent(key)}`;
  const payload = createRequestBody(prompt);

  let response: Response;
  try {
    response = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(payload),
      cache: "no-store",
    });
  } catch (error) {
    return NextResponse.json({ error: "Failed to reach Gemini" }, { status: 502 });
  }

  const raw = await response.text();
  if (!response.ok) {
    return NextResponse.json({ error: raw || "Gemini request failed" }, { status: response.status });
  }

  try {
    const parsed = JSON.parse(raw);
    const candidate = parsed?.candidates?.[0]?.content?.parts?.[0]?.text;
    if (!candidate) {
      return NextResponse.json({ error: "Gemini returned an empty result" }, { status: 502 });
    }
    return NextResponse.json({ content: candidate });
  } catch (error) {
    return NextResponse.json({ error: "Unable to parse Gemini response" }, { status: 502 });
  }
}
