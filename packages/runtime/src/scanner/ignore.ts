import { readFileSync } from "node:fs";
import { basename, relative, sep } from "node:path";
import { minimatch } from "minimatch";
import { CARTODEX_CONFIG_FILE, loadCartodexConfig } from "../config.js";

export const DEFAULT_IGNORE = new Set([
  ".git",
  ".svn",
  ".hg",
  "node_modules",
  "__pycache__",
  ".pytest_cache",
  ".mypy_cache",
  ".ruff_cache",
  "venv",
  ".venv",
  "env",
  ".env",
  "dist",
  "build",
  ".next",
  ".nuxt",
  ".output",
  "coverage",
  ".coverage",
  ".nyc_output",
  "target",
  "vendor",
  ".bundle",
  ".cargo",
  ".DS_Store",
  "Thumbs.db",
  "*.pyc",
  "*.pyo",
  "*.so",
  "*.dylib",
  "*.dll",
  "*.exe",
  "*.o",
  "*.a",
  "*.lib",
  "*.class",
  "*.jar",
  "*.war",
  "*.egg",
  "*.whl",
  "*.lock",
  "package-lock.json",
  "yarn.lock",
  "pnpm-lock.yaml",
  "bun.lockb",
  "Cargo.lock",
  "poetry.lock",
  "Gemfile.lock",
  "composer.lock",
  "*.png",
  "*.jpg",
  "*.jpeg",
  "*.gif",
  "*.ico",
  "*.svg",
  "*.webp",
  "*.mp3",
  "*.mp4",
  "*.wav",
  "*.avi",
  "*.mov",
  "*.pdf",
  "*.zip",
  "*.tar",
  "*.gz",
  "*.rar",
  "*.7z",
  "*.woff",
  "*.woff2",
  "*.ttf",
  "*.eot",
  "*.otf",
  "*.min.js",
  "*.min.css",
  "*.map",
  "*.chunk.js",
  "*.bundle.js",
]);

const DEFAULT_IGNORE_PATHS = new Set([
  ".agents/skills/cartodex/scripts/scan-codebase.mjs",
  ".agents/skills/cartodex/scripts/tools",
  CARTODEX_CONFIG_FILE,
]);

export function parseGitignore(root: string): string[] {
  try {
    return readFileSync(`${root}/.gitignore`, "utf8")
      .split(/\r?\n/)
      .map((line) => line.trim())
      .filter((line) => line.length > 0 && !line.startsWith("#"));
  } catch {
    return [];
  }
}

export function loadIgnorePatterns(root: string): string[] {
  return [...parseGitignore(root), ...loadCartodexConfig(root).ignore];
}

export function matchesGitignorePattern(
  path: string,
  pattern: string,
  root: string,
  isDirectory: boolean,
): boolean {
  let normalizedPattern = pattern;
  if (normalizedPattern.startsWith("!")) {
    normalizedPattern = normalizedPattern.slice(1);
  }

  if (normalizedPattern.endsWith("/")) {
    if (!isDirectory) {
      return false;
    }
    normalizedPattern = normalizedPattern.slice(0, -1);
  }

  let relPath = relative(root, path).split(sep).join("/");
  if (relPath === "") {
    relPath = ".";
  }

  if (normalizedPattern.includes("/")) {
    if (normalizedPattern.startsWith("/")) {
      normalizedPattern = normalizedPattern.slice(1);
    }

    return (
      minimatch(relPath, normalizedPattern, { dot: true }) ||
      minimatch(relPath, `${normalizedPattern}/**`, { dot: true })
    );
  }

  return minimatch(basename(path), normalizedPattern, { dot: true });
}

export function shouldIgnore(
  path: string,
  root: string,
  ignorePatterns: string[],
  isDirectory: boolean,
): boolean {
  const name = basename(path);
  const relPath = relative(root, path).split(sep).join("/");

  if (DEFAULT_IGNORE_PATHS.has(relPath)) {
    return true;
  }

  for (const pattern of DEFAULT_IGNORE) {
    if (pattern.includes("*")) {
      if (minimatch(name, pattern, { dot: true })) {
        return true;
      }
    } else if (name === pattern) {
      return true;
    }
  }

  let ignoredByPattern = false;
  for (const pattern of ignorePatterns) {
    if (matchesGitignorePattern(path, pattern, root, isDirectory)) {
      ignoredByPattern = !pattern.startsWith("!");
    }
  }

  return ignoredByPattern;
}
