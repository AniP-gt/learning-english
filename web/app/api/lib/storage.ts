import { promises as fs } from "fs";
import path from "path";
import { StorageMetadata } from "../../lib/types";

const resolveConfiguredDir = (): string | null => {
  const configured = process.env.LEARNING_DATA_DIR;
  if (!configured) {
    return null;
  }
  return path.resolve(configured);
};

export const describeLearningDataStorage = async (): Promise<StorageMetadata> => {
  const resolved = resolveConfiguredDir();
  if (!resolved) {
    return {
      available: false,
      source: "localStorage",
      reason: "missing_config",
    };
  }

  try {
    const stats = await fs.stat(resolved);
    if (!stats.isDirectory()) {
      return {
        available: false,
        source: "localStorage",
        reason: "not_directory",
        path: resolved,
      };
    }
  } catch {
    try {
      await fs.mkdir(resolved, { recursive: true });
    } catch {
      return {
        available: false,
        source: "localStorage",
        reason: "missing_directory",
        path: resolved,
      };
    }
  }

  return {
    available: true,
    source: "filesystem",
    path: resolved,
  };
};
