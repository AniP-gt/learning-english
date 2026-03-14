import { NextRequest, NextResponse } from "next/server";
import { promises as fs } from "fs";
import path from "path";
import { describeLearningDataStorage } from "../../../lib/storage";
import { resolveWeekDir } from "../../lib/dirs";

const DAY_PATTERN = /^day\d+$/i;
const AUDIO_FILE_PATTERN = /^speech\.(wav|webm|mp4|m4a|ogg)$/i;

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

const sanitizeFileName = (value?: string | null): string | null => {
  if (!value) {
    return null;
  }
  const trimmed = path.basename(value.trim());
  if (!trimmed || !AUDIO_FILE_PATTERN.test(trimmed)) {
    return null;
  }
  return trimmed;
};

const contentTypeForFile = (fileName: string): string => {
  const extension = path.extname(fileName).toLowerCase();
  switch (extension) {
    case ".wav":
      return "audio/wav";
    case ".mp4":
    case ".m4a":
      return "audio/mp4";
    case ".ogg":
      return "audio/ogg";
    default:
      return "audio/webm";
  }
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

  const fileName = sanitizeFileName(request.nextUrl.searchParams.get("file"));
  if (!fileName) {
    return NextResponse.json({ error: "Invalid audio file" }, { status: 400 });
  }

  const day = sanitizeDay(request.nextUrl.searchParams.get("day"));
  const targetPath = day ? path.join(weekDir, day, fileName) : path.join(weekDir, fileName);

  let audioBuffer: Buffer;
  try {
    audioBuffer = await fs.readFile(targetPath);
  } catch {
    return NextResponse.json({ error: "Audio not found" }, { status: 404 });
  }

  const audioArray = audioBuffer.buffer.slice(
    audioBuffer.byteOffset,
    audioBuffer.byteOffset + audioBuffer.byteLength
  ) as ArrayBuffer;

  return new NextResponse(audioArray, {
    status: 200,
    headers: { "Content-Type": contentTypeForFile(fileName) },
  });
}
