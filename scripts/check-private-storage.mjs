#!/usr/bin/env node
// Rejects newly added or modified files under private-storage (uploaded CVs, photos, documents).
// Deletions are allowed, and files that are already tracked and untouched are never examined,
// so the existing baseline does not fail the check.
//   node scripts/check-private-storage.mjs --staged            (pre-commit)
//   node scripts/check-private-storage.mjs --range <a>...<b>   (CI / pull requests)
import { execFileSync } from "node:child_process";

const PROTECTED = /(^|\/)private-storage\//;
const args = process.argv.slice(2);
const mode = args[0];

let diffArgs;
if (mode === "--staged") diffArgs = ["diff", "--cached", "--name-status", "--no-renames"];
else if (mode === "--range" && args[1]) diffArgs = ["diff", "--name-status", "--no-renames", args[1]];
else {
  console.error("usage: check-private-storage.mjs --staged | --range <base>...<head>");
  process.exit(2);
}

const out = execFileSync("git", diffArgs, { encoding: "utf8" });
const offenders = out
  .split("\n")
  .filter(Boolean)
  .map((line) => line.split("\t"))
  .filter(([status, file]) => status !== "D" && PROTECTED.test(file))
  .map(([status, file]) => `${status}  ${file}`);

if (offenders.length > 0) {
  console.error("Blocked: private-storage files must never be committed (they hold uploaded CVs, photos and documents):");
  for (const o of offenders) console.error("  " + o);
  console.error("Remove them from the commit (git restore --staged <path>). Deleting tracked files is allowed.");
  process.exit(1);
}
console.log("private-storage check passed.");
