import { NextRequest, NextResponse } from "next/server";
import { promises as fs } from "fs";
import path from "path";

type WeekFiles = {
  topic: string | null;
  words: string | null;
  reading: string | null;
  feedback: string | null;
};

const readFileSafe = async (filePath: string): Promise<string | null> => {
  try {
    return await fs.readFile(filePath, "utf-8");
  } catch {
    return null;
  }
};

const resolveWeekDir = (dataDir: string, week: string): string | null => {
  const weekDecoded = decodeURIComponent(week);
  const weekDir = path.resolve(dataDir, weekDecoded);
  if (!weekDir.startsWith(path.resolve(dataDir))) {
    return null;
  }
  return weekDir;
};

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ week: string }> }
) {
  const { week } = await params;

  const dataDir = process.env.LEARNING_DATA_DIR;
  if (!dataDir) {
    return NextResponse.json({ error: "LEARNING_DATA_DIR not configured" }, { status: 500 });
  }

  const weekDir = resolveWeekDir(dataDir, week);
  if (!weekDir) {
    return NextResponse.json({ error: "Invalid week path" }, { status: 400 });
  }

  const [topic, words, reading, feedback] = await Promise.all([
    readFileSafe(path.join(weekDir, "topic.md")),
    readFileSafe(path.join(weekDir, "words.md")),
    readFileSafe(path.join(weekDir, "reading.md")),
    readFileSafe(path.join(weekDir, "feedback.md")),
  ]);

  const result: WeekFiles = { topic, words, reading, feedback };
  return NextResponse.json(result, { status: 200 });
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ week: string }> }
) {
  const { week } = await params;

  const dataDir = process.env.LEARNING_DATA_DIR;
  if (!dataDir) {
    return NextResponse.json({ error: "LEARNING_DATA_DIR not configured" }, { status: 500 });
  }

  const weekDir = resolveWeekDir(dataDir, week);
  if (!weekDir) {
    return NextResponse.json({ error: "Invalid week path" }, { status: 400 });
  }

  let body: { words?: string };
  try {
    body = (await request.json()) as { words?: string };
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  if (typeof body.words !== "string") {
    return NextResponse.json({ error: "Missing 'words' field" }, { status: 400 });
  }

  const wordsPath = path.join(weekDir, "words.md");
  try {
    await fs.writeFile(wordsPath, body.words, "utf-8");
  } catch {
    return NextResponse.json({ error: "Failed to write words.md" }, { status: 500 });
  }

  return NextResponse.json({ ok: true }, { status: 200 });
}
