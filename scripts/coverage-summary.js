import { readFileSync } from "fs";
import { join } from "path";

const lcov = readFileSync(join(import.meta.dir, "..", "coverage", "lcov.info"), "utf-8");
const records = lcov.split("\nend_of_record\n").filter(Boolean);

const files = [];
for (const rec of records) {
  const sf = rec.match(/^SF:(.+)$/m)?.[1];
  const fnf = parseInt(rec.match(/^FNF:(\d+)$/m)?.[1] ?? "0");
  const fnh = parseInt(rec.match(/^FNH:(\d+)$/m)?.[1] ?? "0");
  const lf = parseInt(rec.match(/^LF:(\d+)$/m)?.[1] ?? "0");
  const lh = parseInt(rec.match(/^LH:(\d+)$/m)?.[1] ?? "0");
  const brf = parseInt(rec.match(/^BRF:(\d+)$/m)?.[1] ?? "0");
  const brh = parseInt(rec.match(/^BRH:(\d+)$/m)?.[1] ?? "0");
  if (!sf) continue;
  const funcPct = fnf ? ((fnh / fnf) * 100).toFixed(2) : "100.00";
  const linePct = lf ? ((lh / lf) * 100).toFixed(2) : "100.00";
  const brPct = brf ? ((brh / brf) * 100).toFixed(2) : "100.00";
  files.push({
    file: sf.replace(/^src\//, ""),
    funcPct,
    linePct,
    brPct: brf ? brPct : "—",
  });
}

const allFunc = files.filter(f => f.funcPct !== "—");
const allLine = files.filter(f => f.linePct !== "—");
const avgFunc = (allFunc.reduce((s, f) => s + parseFloat(f.funcPct), 0) / allFunc.length).toFixed(2);
const avgLine = (allLine.reduce((s, f) => s + parseFloat(f.linePct), 0) / allLine.length).toFixed(2);

console.log(`| File | Funcs | Lines | Branches |`);
console.log(`|------|-------|-------|----------|`);
for (const f of files) {
  console.log(`| \`${f.file}\` | ${f.funcPct}% | ${f.linePct}% | ${f.brPct}${f.brPct !== "—" ? "%" : ""} |`);
}
console.log(`| **Total** | **${avgFunc}%** | **${avgLine}%** | — |`);
