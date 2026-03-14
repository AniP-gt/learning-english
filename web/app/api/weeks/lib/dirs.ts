import path from "path";

export const resolveWeekDir = (dataDir: string, week: string): string | null => {
  const weekDecoded = decodeURIComponent(week);
  const weekDir = path.resolve(dataDir, weekDecoded);
  if (!weekDir.startsWith(path.resolve(dataDir))) {
    return null;
  }
  return weekDir;
};
