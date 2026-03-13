import { NextRequest, NextResponse } from "next/server";
import { promises as fs } from "fs";
import path from "path";
import { describeLearningDataStorage } from "../../../lib/storage";

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

  const storage = await describeLearningDataStorage();
  if (!storage.available || !storage.path) {
    return NextResponse.json(
      { error: "Filesystem storage unavailable", storage },
      { status: 500 }
    );
  }

  const weekDir = resolveWeekDir(storage.path, week);
  if (!weekDir) {
    return NextResponse.json({ error: "Invalid week path", storage }, { status: 400 });
  }

  const [topic, words, reading, feedback] = await Promise.all([
    readFileSafe(path.join(weekDir, "topic.md")),
    readFileSafe(path.join(weekDir, "words.md")),
    readFileSafe(path.join(weekDir, "reading.md")),
    readFileSafe(path.join(weekDir, "feedback.md")),
  ]);

  const result: WeekFiles = { topic, words, reading, feedback };
  return NextResponse.json({ ...result, storage }, { status: 200 });
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ week: string }> }
) {
  const { week } = await params;

  const storage = await describeLearningDataStorage();
  if (!storage.available || !storage.path) {
    return NextResponse.json(
      { error: "Filesystem storage unavailable", storage },
      { status: 500 }
    );
  }

  const weekDir = resolveWeekDir(storage.path, week);
  if (!weekDir) {
    return NextResponse.json({ error: "Invalid week path", storage }, { status: 400 });
  }

  let body: { topic?: string; words?: string; reading?: string };
  try {
    body = (await request.json()) as { topic?: string; words?: string; reading?: string };
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const writes: { field: keyof WeekFiles; fileName: string; content: string }[] = [];
  if (typeof body.topic === "string") {
    writes.push({ field: "topic", fileName: "topic.md", content: body.topic });
  }
  if (typeof body.words === "string") {
    writes.push({ field: "words", fileName: "words.md", content: body.words });
  }
  if (typeof body.reading === "string") {
    writes.push({ field: "reading", fileName: "reading.md", content: body.reading });
  }

  if (writes.length === 0) {
    return NextResponse.json({ error: "No writable fields provided" }, { status: 400 });
  }

  try {
    await fs.mkdir(weekDir, { recursive: true });
  } catch {
    return NextResponse.json({ error: "Failed to prepare week directory" }, { status: 500 });
  }

  for (const write of writes) {
    const target = path.join(weekDir, write.fileName);
    try {
      await fs.writeFile(target, write.content, "utf-8");
    } catch {
      return NextResponse.json(
        { error: `Failed to write ${write.fileName}`, storage },
        { status: 500 }
      );
    }
  }

  return NextResponse.json({ ok: true, storage }, { status: 200 });
}
