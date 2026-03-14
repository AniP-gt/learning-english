import { NextRequest, NextResponse } from "next/server";
import { promises as fs } from "fs";
import path from "path";
import { describeLearningDataStorage } from "../../../lib/storage";
import { resolveWeekDir } from "../../lib/dirs";

const IMAGE_FILE_NAME = "image.png";

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

  const imagePath = path.join(weekDir, IMAGE_FILE_NAME);
  let imageBuffer: Buffer;
  try {
    imageBuffer = await fs.readFile(imagePath);
  } catch {
    return NextResponse.json({ error: "Image not found" }, { status: 404 });
  }

  const imageArray = imageBuffer.buffer.slice(
    imageBuffer.byteOffset,
    imageBuffer.byteOffset + imageBuffer.byteLength
  ) as ArrayBuffer;

  return new NextResponse(imageArray, {
    status: 200,
    headers: { "Content-Type": "image/png" },
  });
}
