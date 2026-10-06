import { readdir } from "node:fs/promises";
import path from "node:path";

const excluded = new Set([
  ".git",
  "node_modules",
  "dist",
  ".wrangler",
  "coverage",
  "playwright-report",
  "test-results",
]);

export async function sourceFiles(directory = ".") {
  const files = [];
  for (const entry of await readdir(directory, { withFileTypes: true })) {
    if (excluded.has(entry.name) || entry.isSymbolicLink()) continue;
    const target = path.join(directory, entry.name);
    if (entry.isDirectory()) files.push(...(await sourceFiles(target)));
    else files.push(target);
  }
  return files;
}
