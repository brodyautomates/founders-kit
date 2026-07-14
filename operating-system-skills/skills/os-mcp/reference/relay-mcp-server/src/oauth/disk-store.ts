// Tiny helper for reading/writing plain-JSON files on the persistent volume.
// Writes go through a temp file + rename so a crash mid-write can never leave a
// half-serialised document behind.

import fs from "node:fs";
import path from "node:path";

export function readJsonFile<T>(filePath: string, whenMissing: T): T {
  try {
    if (!fs.existsSync(filePath)) return whenMissing;
    const text = fs.readFileSync(filePath, "utf8");
    if (text.trim().length === 0) return whenMissing;
    return JSON.parse(text) as T;
  } catch (error: any) {
    console.error(
      `[disk-store] could not read ${filePath} (${error.message}); falling back to default`,
    );
    return whenMissing;
  }
}

export function writeJsonFile(filePath: string, value: unknown): void {
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
  const staging = `${filePath}.tmp`;
  fs.writeFileSync(staging, JSON.stringify(value, null, 2));
  fs.renameSync(staging, filePath);
}
