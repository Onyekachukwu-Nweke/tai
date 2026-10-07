import { access, readFile } from "node:fs/promises";
import path from "node:path";
import { sourceFiles } from "./source-files.mjs";

let checked = 0;
for (const file of await sourceFiles()) {
  if (!file.endsWith(".md")) continue;
  const text = (await readFile(file, "utf8")).replace(/```[\s\S]*?```/g, "");
  for (const match of text.matchAll(/!?\[[^\]]*\]\(([^)]+)\)/g)) {
    const target = match[1].split(/\s+"/)[0].replace(/^<|>$/g, "");
    if (/^(?:[a-z]+:|#|\/)/i.test(target)) continue;
    const pathname = decodeURIComponent(target.split("#")[0]);
    if (!pathname) continue;
    checked++;
    try {
      await access(path.resolve(path.dirname(file), pathname));
    } catch {
      console.error(`${file}: missing local link ${target}`);
      process.exitCode = 1;
    }
  }
}
console.log(
  `Checked ${checked} local Markdown file links (not remote URLs or anchors).`,
);
