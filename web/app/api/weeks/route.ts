import { NextResponse } from "next/server";
import { promises as fs, Dirent } from "fs";
import path from "path";

type WeekEntry = {
  key: string;
  year: number;
  month: number;
  week: number;
};

const parseWeekEntry = (key: string): WeekEntry => {
  const [yearPart, monthPart, weekPart] = key.split("/");
  const year = Number(yearPart) || 0;
  const month = Number(monthPart) || 0;
  const week = Number(weekPart.replace(/[^0-9]/g, "")) || 0;
  return { key, year, month, week };
};

const sortWeeksDescending = (keys: string[]) => {
  return keys
    .map(parseWeekEntry)
    .sort((a, b) => {
      if (a.year !== b.year) return b.year - a.year;
      if (a.month !== b.month) return b.month - a.month;
      return b.week - a.week;
    })
    .map((entry) => entry.key);
};

const readDirSafe = async (dir: string): Promise<Dirent[]> => {
  try {
    return await fs.readdir(dir, { withFileTypes: true });
  } catch (error) {
    return [];
  }
};

export async function GET() {
  const dataDir = process.env.LEARNING_DATA_DIR;
  if (!dataDir) {
    return NextResponse.json({ weeks: [] });
  }

  const years = await readDirSafe(dataDir);
  const collected: string[] = [];

  for (const yearDir of years) {
    if (!yearDir.isDirectory() || yearDir.name.startsWith(".")) {
      continue;
    }
    const yearPath = path.join(dataDir, yearDir.name);
    const months = await readDirSafe(yearPath);
    for (const monthDir of months) {
      if (!monthDir.isDirectory()) {
        continue;
      }
      const monthPath = path.join(yearPath, monthDir.name);
      const weeks = await readDirSafe(monthPath);
      for (const weekDir of weeks) {
        if (!weekDir.isDirectory()) {
          continue;
        }
        collected.push(`${yearDir.name}/${monthDir.name}/${weekDir.name}`);
      }
    }
  }

  const sorted = sortWeeksDescending(collected);
  return NextResponse.json({ weeks: sorted }, { status: 200 });
}
