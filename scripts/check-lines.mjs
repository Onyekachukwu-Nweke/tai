import { readFile } from "node:fs/promises";
import { sourceFiles } from "./source-files.mjs";

const code =
  /\.(?:[cm]?[jt]sx?|sql|css|html|sh|bash|py|rb|go|rs|java|c|h|cpp)$/;
let checked = 0;
for (const file of await sourceFiles()) {
  if (!code.test(file)) continue;
  checked++;
  const text = await readFile(file, "utf8");
  const lines = text
    ? text.split("\n").length - Number(text.endsWith("\n"))
    : 0;
  if (lines > 350) {
    console.error(`${file}: ${lines} lines (maximum 350)`);
    process.exitCode = 1;
  }
}
console.log(
  `Checked ${checked} authored code files against the 350-line limit.`,
);
