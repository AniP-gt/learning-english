import { NextRequest, NextResponse } from "next/server";
import { promises as fs, Dirent } from "fs";
import path from "path";
import { describeLearningDataStorage } from "../../../lib/storage";
import { resolveWeekDir } from "../../lib/dirs";

type DailyFiles = {
  reading: string | null;
  feedback: string | null;
  speechTranscript: string | null;
  speechAudioFileName: string | null;
  speechAudioUrl: string | null;
};

type WeekFiles = {
  topic: string | null;
  words: string | null;
  imageUrl: string | null;
  availableDays: string[];
  activeDay: string | null;
  dayFiles: DailyFiles | null;
};

const readFileSafe = async (filePath: string): Promise<string | null> => {
  try {
    return await fs.readFile(filePath, "utf-8");
  } catch {
    return null;
  }
};

const IMAGE_FILE_NAME = "image.png";
const DEFAULT_DAY = "day1";
const DAY_PATTERN = /^day\d+$/i;
const AUDIO_FILE_CANDIDATES = ["speech.wav", "speech.webm", "speech.mp4", "speech.m4a", "speech.ogg"];

const listDayDirs = async (weekDir: string): Promise<string[]> => {
  try {
    const entries = (await fs.readdir(weekDir, { withFileTypes: true })) as Dirent[];
    return entries
      .filter((entry) => entry.isDirectory() && DAY_PATTERN.test(entry.name))
      .map((entry) => entry.name)
      .sort((a, b) => a.localeCompare(b));
  } catch {
    return [];
  }
};

const sanitizeDay = (value?: string | null): string | null => {
  if (!value) {
    return null;
  }
  const trimmed = value.trim();
  if (!trimmed || !DAY_PATTERN.test(trimmed)) {
    return null;
  }
  return path.basename(trimmed);
};

const fileExists = async (target: string): Promise<boolean> => {
  try {
    await fs.stat(target);
    return true;
  } catch {
    return false;
  }
};

const resolveSpeechAudioFileName = async (dayDir: string): Promise<string | null> => {
  for (const fileName of AUDIO_FILE_CANDIDATES) {
    if (await fileExists(path.join(dayDir, fileName))) {
      return fileName;
    }
  }
  return null;
};

const getAudioFileNameFromMimeType = (mimeType?: string): string => {
  const normalized = mimeType?.toLowerCase() ?? "";
  if (normalized.includes("wav")) {
    return "speech.wav";
  }
  if (normalized.includes("mp4") || normalized.includes("aac")) {
    return "speech.m4a";
  }
  if (normalized.includes("ogg")) {
    return "speech.ogg";
  }
  return "speech.webm";
};

const buildDailyFiles = async (weekDir: string, day: string): Promise<DailyFiles> => {
  const dayDir = path.join(weekDir, day);
  const [reading, feedback, speechTranscript, speechAudioFileName] = await Promise.all([
    readFileSafe(path.join(dayDir, "reading.md")),
    readFileSafe(path.join(dayDir, "feedback.md")),
    readFileSafe(path.join(dayDir, "speech_transcript.txt")),
    resolveSpeechAudioFileName(dayDir),
  ]);
  return {
    reading,
    feedback,
    speechTranscript,
    speechAudioFileName,
    speechAudioUrl: null,
  };
};

export async function GET(
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

  const [topic, words] = await Promise.all([
    readFileSafe(path.join(weekDir, "topic.md")),
    readFileSafe(path.join(weekDir, "words.md")),
  ]);

  const dayParam = request.nextUrl.searchParams.get("day");
  const requestedDay = sanitizeDay(dayParam) ?? DEFAULT_DAY;
  const dayDirs = await listDayDirs(weekDir);
  const hasLegacyReading = await fileExists(path.join(weekDir, "reading.md"));
  const hasLegacyFeedback = await fileExists(path.join(weekDir, "feedback.md"));
  const hasLegacyTranscript = await fileExists(path.join(weekDir, "speech_transcript.txt"));
  const legacySpeechAudioFileName = (await resolveSpeechAudioFileName(weekDir)) ?? null;

  const availableDays = dayDirs.length
    ? dayDirs
    : hasLegacyReading || hasLegacyFeedback || hasLegacyTranscript
    ? [DEFAULT_DAY]
    : [];

  const resolvedDay = requestedDay || availableDays[0] || DEFAULT_DAY;
  const usingLegacyFallback = dayDirs.length === 0 && availableDays[0] === DEFAULT_DAY;
  const dayFiles = usingLegacyFallback
    ? {
        reading: hasLegacyReading ? await readFileSafe(path.join(weekDir, "reading.md")) : null,
        feedback: hasLegacyFeedback ? await readFileSafe(path.join(weekDir, "feedback.md")) : null,
        speechTranscript: hasLegacyTranscript
          ? await readFileSafe(path.join(weekDir, "speech_transcript.txt"))
          : null,
        speechAudioFileName: legacySpeechAudioFileName,
        speechAudioUrl: legacySpeechAudioFileName
          ? `/api/weeks/${encodeURIComponent(week)}/audio?file=${encodeURIComponent(legacySpeechAudioFileName)}`
          : null,
      }
    : await buildDailyFiles(weekDir, resolvedDay);

  if (dayFiles && dayFiles.speechAudioFileName && !dayFiles.speechAudioUrl) {
    dayFiles.speechAudioUrl = `/api/weeks/${encodeURIComponent(week)}/audio?day=${encodeURIComponent(resolvedDay)}&file=${encodeURIComponent(dayFiles.speechAudioFileName)}`;
  }

  const imageTarget = path.join(weekDir, IMAGE_FILE_NAME);
  const hasImage = await fileExists(imageTarget);
  const imageUrl = hasImage ? `/api/weeks/${encodeURIComponent(week)}/image` : null;

  const result: WeekFiles = {
    topic,
    words,
    imageUrl,
    availableDays,
    activeDay: resolvedDay,
    dayFiles,
  };
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

  let body: {
    topic?: string;
    words?: string;
    reading?: string;
    feedback?: string;
    speechTranscript?: string;
    speechAudioBase64?: string;
    speechAudioMimeType?: string;
    day?: string;
  };
  try {
    body = (await request.json()) as {
      topic?: string;
      words?: string;
      reading?: string;
      feedback?: string;
      speechTranscript?: string;
      speechAudioBase64?: string;
      speechAudioMimeType?: string;
      day?: string;
    };
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const targetDay = sanitizeDay(body.day) ?? DEFAULT_DAY;
  type WriteEntry = {
    fileName: string;
    content: string;
    target: "week" | "day";
  };
  const writes: WriteEntry[] = [];
  if (typeof body.topic === "string") {
    writes.push({ fileName: "topic.md", content: body.topic, target: "week" });
  }
  if (typeof body.words === "string") {
    writes.push({ fileName: "words.md", content: body.words, target: "week" });
  }
  if (typeof body.reading === "string") {
    writes.push({ fileName: "reading.md", content: body.reading, target: "day" });
  }
  if (typeof body.feedback === "string") {
    writes.push({ fileName: "feedback.md", content: body.feedback, target: "day" });
  }
  if (typeof body.speechTranscript === "string") {
    writes.push({ fileName: "speech_transcript.txt", content: body.speechTranscript, target: "day" });
  }

  if (writes.length === 0) {
    return NextResponse.json({ error: "No writable fields provided" }, { status: 400 });
  }

  try {
    await fs.mkdir(weekDir, { recursive: true });
  } catch {
    return NextResponse.json({ error: "Failed to prepare week directory" }, { status: 500 });
  }
  const needsDayDir = writes.some((entry) => entry.target === "day");
  if (needsDayDir) {
    try {
      await fs.mkdir(path.join(weekDir, targetDay), { recursive: true });
    } catch {
      return NextResponse.json(
        { error: "Failed to prepare day directory", storage },
        { status: 500 }
      );
    }
  }

  for (const write of writes) {
    const baseDir = write.target === "week" ? weekDir : path.join(weekDir, targetDay);
    const target = path.join(baseDir, write.fileName);
    try {
      await fs.writeFile(target, write.content, "utf-8");
    } catch {
      return NextResponse.json(
        { error: `Failed to write ${write.fileName}`, storage },
        { status: 500 }
      );
    }
  }

  if (typeof body.speechAudioBase64 === "string" && body.speechAudioBase64.trim()) {
    const audioFileName = getAudioFileNameFromMimeType(body.speechAudioMimeType);
    const audioTarget = path.join(weekDir, targetDay, audioFileName);
    try {
      await fs.writeFile(audioTarget, Buffer.from(body.speechAudioBase64, "base64"));
    } catch {
      return NextResponse.json(
        { error: `Failed to write ${audioFileName}`, storage },
        { status: 500 }
      );
    }
  }

  return NextResponse.json({ ok: true, storage }, { status: 200 });
}
