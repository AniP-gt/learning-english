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

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ week: string }> }
) {
  const { week } = await params;

  const dataDir = process.env.LEARNING_DATA_DIR;
  if (!dataDir) {
    return NextResponse.json({ error: "LEARNING_DATA_DIR not configured" }, { status: 500 });
  }

  const weekDecoded = decodeURIComponent(week);
  const weekDir = path.resolve(dataDir, weekDecoded);
  if (!weekDir.startsWith(path.resolve(dataDir))) {
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
