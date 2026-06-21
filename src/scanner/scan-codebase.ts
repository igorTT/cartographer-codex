import { existsSync, readdirSync, readFileSync, realpathSync, statSync } from "node:fs";
import { basename, relative, resolve, sep } from "node:path";
import { fileURLToPath } from "node:url";
import { parseGitignore, shouldIgnore } from "./ignore.js";
import { countTokens, loadEncoding, type TokenEncoding } from "./tokens.js";

const MAX_FILE_BYTES = 1_000_000;

const TEXT_EXTENSIONS = new Set([
  ".py",
  ".js",
  ".ts",
  ".jsx",
  ".tsx",
  ".vue",
  ".svelte",
  ".html",
  ".htm",
  ".css",
  ".scss",
  ".sass",
  ".less",
  ".json",
  ".yaml",
  ".yml",
  ".toml",
  ".xml",
  ".md",
  ".mdx",
  ".txt",
  ".rst",
  ".sh",
  ".bash",
  ".zsh",
  ".fish",
  ".ps1",
  ".bat",
  ".cmd",
  ".sql",
  ".graphql",
  ".gql",
  ".proto",
  ".go",
  ".rs",
  ".rb",
  ".php",
  ".java",
  ".kt",
  ".kts",
  ".scala",
  ".clj",
  ".cljs",
  ".edn",
  ".ex",
  ".exs",
  ".erl",
  ".hrl",
  ".hs",
  ".lhs",
  ".ml",
  ".mli",
  ".fs",
  ".fsx",
  ".fsi",
  ".cs",
  ".vb",
  ".swift",
  ".m",
  ".mm",
  ".h",
  ".hpp",
  ".c",
  ".cpp",
  ".cc",
  ".cxx",
  ".r",
  ".R",
  ".jl",
  ".lua",
  ".vim",
  ".el",
  ".lisp",
  ".scm",
  ".rkt",
  ".zig",
  ".nim",
  ".d",
  ".dart",
  ".v",
  ".sv",
  ".vhd",
  ".vhdl",
  ".tf",
  ".hcl",
  ".dockerfile",
  ".containerfile",
  ".makefile",
  ".cmake",
  ".gradle",
  ".groovy",
  ".rake",
  ".gemspec",
  ".podspec",
  ".cabal",
  ".nix",
  ".dhall",
  ".jsonc",
  ".json5",
  ".cson",
  ".ini",
  ".cfg",
  ".conf",
  ".config",
  ".env",
  ".env.example",
  ".env.local",
  ".env.development",
  ".env.production",
  ".gitignore",
  ".gitattributes",
  ".editorconfig",
  ".prettierrc",
  ".eslintrc",
  ".stylelintrc",
  ".babelrc",
  ".nvmrc",
  ".ruby-version",
  ".python-version",
  ".node-version",
  ".tool-versions",
]);

const TEXT_NAMES = new Set([
  "readme",
  "license",
  "licence",
  "changelog",
  "authors",
  "contributors",
  "copying",
  "dockerfile",
  "containerfile",
  "makefile",
  "rakefile",
  "gemfile",
  "procfile",
  "brewfile",
  "vagrantfile",
  "justfile",
  "taskfile",
]);

export interface ScannedFile {
  path: string;
  tokens: number;
  size_bytes: number;
}

export type SkippedFile =
  | { path: string; reason: "permission_denied" }
  | { path: string; reason: "too_large"; size_bytes: number }
  | { path: string; reason: "binary" }
  | { path: string; reason: "too_many_tokens"; tokens: number }
  | { path: string; reason: `read_error: ${string}` };

export interface ScanResult {
  root: string;
  files: ScannedFile[];
  directories: string[];
  total_tokens: number;
  total_files: number;
  skipped: SkippedFile[];
}

export function isTextFile(path: string): boolean {
  const lowerPath = path.toLowerCase();
  const dot = basename(lowerPath).lastIndexOf(".");
  const suffix = dot === -1 ? "" : basename(lowerPath).slice(dot);

  if (TEXT_EXTENSIONS.has(suffix)) {
    return true;
  }

  if (TEXT_NAMES.has(basename(lowerPath))) {
    return true;
  }

  try {
    const chunk = readFileSync(path).subarray(0, 8192);
    if (chunk.includes(0)) {
      return false;
    }
    new TextDecoder("utf-8", { fatal: true }).decode(chunk);
    return true;
  } catch {
    return false;
  }
}

function relativePath(root: string, path: string): string {
  return relative(root, path).split(sep).join("/");
}

export function scanDirectory(
  rootPath: string,
  encoding: TokenEncoding,
  maxFileTokens = 50_000,
): ScanResult {
  const root = resolve(rootPath);
  const gitignorePatterns = parseGitignore(root);
  const files: ScannedFile[] = [];
  const directories: string[] = [];
  const skipped: SkippedFile[] = [];
  let totalTokens = 0;

  function walk(current: string): void {
    let stat;
    try {
      stat = statSync(current);
    } catch (error) {
      skipped.push({
        path: relativePath(root, current),
        reason: `read_error: ${error instanceof Error ? error.message : String(error)}`,
      });
      return;
    }

    if (shouldIgnore(current, root, gitignorePatterns, stat.isDirectory())) {
      return;
    }

    if (stat.isDirectory()) {
      const relPath = relativePath(root, current);
      if (relPath !== "") {
        directories.push(relPath);
      }

      try {
        const entries = readdirSync(current, { withFileTypes: true })
          .map((entry) => ({
            name: entry.name,
            path: `${current}/${entry.name}`,
            isDirectory: entry.isDirectory(),
          }))
          .sort((a, b) => {
            if (a.isDirectory !== b.isDirectory) {
              return a.isDirectory ? -1 : 1;
            }
            return a.name.toLowerCase().localeCompare(b.name.toLowerCase());
          });

        for (const entry of entries) {
          walk(entry.path);
        }
      } catch {
        skipped.push({ path: relPath, reason: "permission_denied" });
      }

      return;
    }

    if (!stat.isFile()) {
      return;
    }

    const relPath = relativePath(root, current);
    const sizeBytes = stat.size;

    if (sizeBytes > MAX_FILE_BYTES) {
      skipped.push({ path: relPath, reason: "too_large", size_bytes: sizeBytes });
      return;
    }

    if (!isTextFile(current)) {
      skipped.push({ path: relPath, reason: "binary" });
      return;
    }

    try {
      const content = readFileSync(current, "utf8");
      const tokens = countTokens(content, encoding);

      if (tokens > maxFileTokens) {
        skipped.push({ path: relPath, reason: "too_many_tokens", tokens });
        return;
      }

      files.push({ path: relPath, tokens, size_bytes: sizeBytes });
      totalTokens += tokens;
    } catch (error) {
      skipped.push({
        path: relPath,
        reason: `read_error: ${error instanceof Error ? error.message : String(error)}`,
      });
    }
  }

  walk(root);

  return {
    root,
    files,
    directories,
    total_tokens: totalTokens,
    total_files: files.length,
    skipped,
  };
}

export function formatTree(scanResult: ScanResult, showTokens = true): string {
  const lines: string[] = [];
  const rootName = basename(scanResult.root);
  lines.push(`${rootName}/`);
  lines.push(`Total: ${scanResult.total_files} files, ${scanResult.total_tokens.toLocaleString("en-US")} tokens`);
  lines.push("");

  interface TreeDirectory {
    [name: string]: TreeDirectory | ScannedFile;
  }

  function isScannedFile(value: TreeDirectory | ScannedFile): value is ScannedFile {
    return "tokens" in value;
  }

  const tree: TreeDirectory = {};

  for (const file of scanResult.files) {
    const parts = file.path.split("/");
    let current: TreeDirectory = tree;
    for (const part of parts.slice(0, -1)) {
      const next = current[part];
      if (!next || isScannedFile(next)) {
        current[part] = {};
      }
      current = current[part] as TreeDirectory;
    }
    current[parts[parts.length - 1] ?? file.path] = file;
  }

  function printTree(node: TreeDirectory, prefix = ""): void {
    const items = Object.entries(node).sort(([aName, aValue], [bName, bValue]) => {
      const aIsFile = isScannedFile(aValue);
      const bIsFile = isScannedFile(bValue);
      if (aIsFile !== bIsFile) {
        return aIsFile ? 1 : -1;
      }
      return aName.toLowerCase().localeCompare(bName.toLowerCase());
    });

    items.forEach(([name, value], index) => {
      const isLastItem = index === items.length - 1;
      const connector = isLastItem ? "└── " : "├── ";

      if (!isScannedFile(value)) {
        lines.push(`${prefix}${connector}${name}/`);
        printTree(value, prefix + (isLastItem ? "    " : "│   "));
      } else if (showTokens) {
        lines.push(`${prefix}${connector}${name} (${value.tokens.toLocaleString("en-US")} tokens)`);
      } else {
        lines.push(`${prefix}${connector}${name}`);
      }
    });
  }

  printTree(tree);
  return lines.join("\n");
}

function printUsage(): void {
  console.error("usage: scan-codebase.mjs [path] [--format json|tree|compact] [--max-tokens N] [--encoding NAME]");
}

interface CliArgs {
  path: string;
  format: "json" | "tree" | "compact";
  maxTokens: number;
  encoding: string;
}

export function parseArgs(argv: string[]): CliArgs {
  const args: CliArgs = {
    path: ".",
    format: "json",
    maxTokens: 50_000,
    encoding: "cl100k_base",
  };
  let pathSeen = false;

  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index];
    if (arg === "--format") {
      const value = argv[++index];
      if (value !== "json" && value !== "tree" && value !== "compact") {
        throw new Error(`argument --format: invalid choice: '${value ?? ""}' (choose from 'json', 'tree', 'compact')`);
      }
      args.format = value;
    } else if (arg === "--max-tokens") {
      const value = argv[++index];
      const parsed = Number.parseInt(value ?? "", 10);
      if (!value || !Number.isFinite(parsed)) {
        throw new Error(`argument --max-tokens: invalid int value: '${value ?? ""}'`);
      }
      args.maxTokens = parsed;
    } else if (arg === "--encoding") {
      const value = argv[++index];
      if (!value) {
        throw new Error("argument --encoding: expected one argument");
      }
      args.encoding = value;
    } else if (arg === "-h" || arg === "--help") {
      printUsage();
      process.exit(0);
    } else if (arg.startsWith("-")) {
      throw new Error(`unrecognized arguments: ${arg}`);
    } else if (!pathSeen) {
      args.path = arg;
      pathSeen = true;
    } else {
      throw new Error(`unrecognized arguments: ${arg}`);
    }
  }

  return args;
}

export function runCli(argv = process.argv.slice(2)): number {
  let args: CliArgs;
  try {
    args = parseArgs(argv);
  } catch (error) {
    printUsage();
    console.error(`scan-codebase.mjs: error: ${error instanceof Error ? error.message : String(error)}`);
    return 2;
  }

  const path = resolve(args.path);
  if (!existsSync(path)) {
    console.error(`ERROR: Path does not exist: ${path}`);
    return 1;
  }

  try {
    if (!statSync(path).isDirectory()) {
      console.error(`ERROR: Path is not a directory: ${path}`);
      return 1;
    }
  } catch (error) {
    console.error(`ERROR: Path is not a directory: ${path}`);
    return 1;
  }

  let encoding;
  try {
    encoding = loadEncoding(args.encoding);
  } catch (error) {
    console.error(`ERROR: Failed to load encoding '${args.encoding}': ${error instanceof Error ? error.message : String(error)}`);
    return 1;
  }

  const result = scanDirectory(path, encoding, args.maxTokens);

  if (args.format === "json") {
    console.log(JSON.stringify(result, null, 2));
  } else if (args.format === "tree") {
    console.log(formatTree(result, true));
  } else {
    const filesSorted = [...result.files].sort((a, b) => b.tokens - a.tokens);
    console.log(`# ${result.root}`);
    console.log(`# Total: ${result.total_files} files, ${result.total_tokens.toLocaleString("en-US")} tokens`);
    console.log("");
    for (const file of filesSorted) {
      console.log(`${file.tokens.toString().padStart(8)} ${file.path}`);
    }
  }

  return 0;
}

function isEntrypoint(): boolean {
  const scriptPath = process.argv[1];
  if (!scriptPath) {
    return false;
  }

  try {
    return realpathSync(fileURLToPath(import.meta.url)) === realpathSync(scriptPath);
  } catch {
    return false;
  }
}

if (isEntrypoint()) {
  process.exitCode = runCli();
}
