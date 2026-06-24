import { mkdirSync, mkdtempSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { expect, test } from "vitest";
import { shouldIgnore } from "../../src/scanner/ignore.js";
import { formatTree, isTextFile, parseArgs, scanDirectory } from "../../src/scanner/scan-codebase.js";

const fakeEncoding = {
  encode(text: string) {
    return text.trim() ? text.trim().split(/\s+/) : [];
  },
};

function fixture(): string {
  return mkdtempSync(join(tmpdir(), "cartodex-scanner-"));
}

test("scans text files while preserving default ignores and root .gitignore rules", () => {
  const root = fixture();
  mkdirSync(join(root, "src"));
  mkdirSync(join(root, "node_modules"));
  mkdirSync(join(root, "ignored-dir"));
  mkdirSync(join(root, "kept"));
  writeFileSync(join(root, ".gitignore"), "ignored-dir/\n*.tmp\n!important.tmp\n/anchored.txt\n");
  writeFileSync(join(root, "src", "index.ts"), "export const answer = 42\n");
  writeFileSync(join(root, "node_modules", "left-pad.js"), "ignored\n");
  writeFileSync(join(root, "ignored-dir", "file.ts"), "ignored\n");
  writeFileSync(join(root, "scratch.tmp"), "ignored\n");
  writeFileSync(join(root, "important.tmp"), "negation is supported\n");
  writeFileSync(join(root, "anchored.txt"), "ignored\n");
  writeFileSync(join(root, "kept", "anchored.txt"), "kept\n");

  const result = scanDirectory(root, fakeEncoding, 50_000);

  expect(result.files.map((file) => file.path)).toEqual([
    "kept/anchored.txt",
    "src/index.ts",
    ".gitignore",
    "important.tmp",
  ]);
  expect(result.total_files).toBe(4);
  expect(result.directories).toContain("kept");
  expect(result.directories).toContain("src");
});

test("uses root cartodex config ignore patterns after gitignore rules", () => {
  const root = fixture();
  mkdirSync(join(root, "docs"));
  mkdirSync(join(root, "docs", "private"));
  mkdirSync(join(root, "docs", "kept"));
  writeFileSync(join(root, ".gitignore"), "*.tmp\n");
  writeFileSync(join(root, "cartodex.config.json"), JSON.stringify({
    ignore: [
      "docs/private/",
      "*.scratch.ts",
      "/root-only.md",
      "!important.tmp",
    ],
  }));
  writeFileSync(join(root, "docs", "private", "secret.md"), "ignored\n");
  writeFileSync(join(root, "docs", "kept", "notes.md"), "kept\n");
  writeFileSync(join(root, "draft.scratch.ts"), "ignored\n");
  writeFileSync(join(root, "root-only.md"), "ignored\n");
  writeFileSync(join(root, "important.tmp"), "config negation keeps this\n");
  writeFileSync(join(root, "other.tmp"), "ignored by gitignore\n");

  const result = scanDirectory(root, fakeEncoding, 50_000);

  expect(result.files.map((file) => file.path)).toEqual([
    "docs/kept/notes.md",
    ".gitignore",
    "cartodex.config.json",
    "important.tmp",
  ]);
});

test("reports invalid cartodex config files clearly", () => {
  const invalidJsonRoot = fixture();
  writeFileSync(join(invalidJsonRoot, "cartodex.config.json"), "{ invalid json");

  expect(() => scanDirectory(invalidJsonRoot, fakeEncoding)).toThrow(/Failed to parse cartodex\.config\.json/);

  const invalidIgnoreRoot = fixture();
  writeFileSync(join(invalidIgnoreRoot, "cartodex.config.json"), JSON.stringify({ ignore: "notes.md" }));

  expect(() => scanDirectory(invalidIgnoreRoot, fakeEncoding)).toThrow(/expected "ignore" to be an array of strings/);
});

test("skips binary, large, and token-heavy files", () => {
  const root = fixture();
  writeFileSync(join(root, "binary.bin"), Buffer.from([0, 1, 2, 3]));
  writeFileSync(join(root, "large.txt"), "x".repeat(1_000_001));
  writeFileSync(join(root, "verbose.md"), "one two three four");
  writeFileSync(join(root, "ok.md"), "one two");

  const result = scanDirectory(root, fakeEncoding, 3);

  expect(result.files.map((file) => file.path)).toEqual(["ok.md"]);
  expect(result.skipped.map((file) => file.reason)).toEqual(["binary", "too_large", "too_many_tokens"]);
});

test("omits the installed Cartodex scanner script from scan output", () => {
  const root = fixture();
  mkdirSync(join(root, ".agents", "skills", "cartodex", "scripts"), { recursive: true });
  writeFileSync(join(root, ".agents", "skills", "cartodex", "scripts", "scan-codebase.mjs"), "one two three");
  writeFileSync(join(root, "app.ts"), "export const app = true");

  const result = scanDirectory(root, fakeEncoding);

  expect(result.files.map((file) => file.path)).toEqual(["app.ts"]);
  expect(result.skipped.map((file) => file.path)).not.toContain(".agents/skills/cartodex/scripts/scan-codebase.mjs");
});

test("does not ignore unrelated scanner scripts with the same basename", () => {
  const root = fixture();
  mkdirSync(join(root, "tools"), { recursive: true });
  writeFileSync(join(root, "tools", "scan-codebase.mjs"), "one two three");

  const result = scanDirectory(root, fakeEncoding);

  expect(result.files.map((file) => file.path)).toEqual(["tools/scan-codebase.mjs"]);
});

test("formats tree and compact-compatible token ordering data", () => {
  const root = fixture();
  mkdirSync(join(root, "src"));
  writeFileSync(join(root, "README.md"), "hello world");
  writeFileSync(join(root, "src", "index.ts"), "one two three");

  const result = scanDirectory(root, fakeEncoding);
  const tree = formatTree(result);

  expect(tree).toMatch(
    /^cartodex-scanner-.+\/\nTotal: 2 files, 5 tokens\n\n├── src\/\n│   └── index.ts \(3 tokens\)\n└── README.md \(2 tokens\)$/
  );
});

test("detects text files by known names, extensions, and utf-8 fallback", () => {
  const root = fixture();
  writeFileSync(join(root, "Dockerfile"), "FROM node:20\n");
  writeFileSync(join(root, "notes.custom"), "plain utf8\n");
  writeFileSync(join(root, "image.dat"), Buffer.from([0, 12, 44]));

  expect(isTextFile(join(root, "Dockerfile"))).toBe(true);
  expect(isTextFile(join(root, "notes.custom"))).toBe(true);
  expect(isTextFile(join(root, "image.dat"))).toBe(false);
});

test("parses cli arguments and reports invalid choices", () => {
  expect(parseArgs(["repo", "--format", "compact", "--max-tokens", "12", "--encoding", "o200k_base"])).toEqual({
    path: "repo",
    format: "compact",
    maxTokens: 12,
    encoding: "o200k_base",
  });

  expect(() => parseArgs(["--format", "xml"])).toThrow(/invalid choice/);
  expect(() => parseArgs(["--max-tokens", "0"])).toThrow(/invalid int value/);
  expect(() => parseArgs(["--max-tokens", "-1"])).toThrow(/invalid int value/);
  expect(() => parseArgs(["--max-tokens", "12abc"])).toThrow(/invalid int value/);
});

test("matches default ignore patterns by basename", () => {
  const root = fixture();
  expect(shouldIgnore(join(root, "src", "bundle.min.js"), root, [], false)).toBe(true);
  expect(shouldIgnore(join(root, "src", "normal.js"), root, [], false)).toBe(false);
});
