import { NextRequest, NextResponse } from "next/server";

const BASE_URL = "https://generativelanguage.googleapis.com/v1beta/models";
const TRANSCRIPTION_MODEL = "gemini-2.5-flash";

type TranscribeRequestPayload = {
  audio: string;
  mimeType: string;
};

const buildTranscriptionBody = (audio: string, mimeType: string) => ({
  contents: [
    {
      parts: [
        {
          text: "Transcribe this English speech recording verbatim. Return only the transcription text without commentary.",
        },
        {
          inlineData: {
            mimeType,
            data: audio,
          },
        },
      ],
    },
  ],
});

export async function POST(request: NextRequest) {
  let body: TranscribeRequestPayload;
  try {
    body = (await request.json()) as TranscribeRequestPayload;
  } catch {
    return NextResponse.json({ error: "Invalid JSON payload" }, { status: 400 });
  }

  const audio = body.audio?.trim();
  const mimeType = body.mimeType?.trim();

  if (!audio || !mimeType) {
    return NextResponse.json({ error: "audio and mimeType are required" }, { status: 400 });
  }

  const apiKey = process.env.GEMINI_API_KEY ?? request.headers.get("x-api-key");
  if (!apiKey) {
    return NextResponse.json({ error: "Gemini API key is not configured" }, { status: 401 });
  }

  try {
    const response = await fetch(`${BASE_URL}/${TRANSCRIPTION_MODEL}:generateContent?key=${encodeURIComponent(apiKey)}`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(buildTranscriptionBody(audio, mimeType)),
      cache: "no-store",
    });

    if (!response.ok) {
      const message = await response.text();
      throw new Error(message || `Transcription request failed (${response.status})`);
    }

    const data = (await response.json()) as {
      candidates?: Array<{
        content?: {
          parts?: Array<{
            text?: string;
          }>;
        };
      }>;
    };

    const transcript = data.candidates?.[0]?.content?.parts?.map((part) => part.text ?? "").join("").trim();
    if (!transcript) {
      throw new Error("Gemini returned an empty transcription");
    }

    return NextResponse.json({ transcript });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Unable to transcribe audio" },
      { status: 502 }
    );
  }
}
