import { mkdir, readFile, writeFile } from "node:fs/promises";
import { dirname, join } from "node:path";
import {
  AGENTS_SECTION_END,
  AGENTS_SECTION_START,
  MANAGED_FILE_MARKER,
  renderAgentsCartodexSection,
  renderInitTemplates,
  type InitTemplate
} from "./templates.js";
import { findGitRoot } from "./repo.js";
import { DEFAULT_MAP_PATH, loadCartodexConfig } from "../config.js";

type FileStatus = "current" | "missing" | "stale" | "conflict";
type Operation = "checked" | "created" | "updated" | "unchanged" | "blocked";

export interface InitOptions {
  cwd: string;
  force?: boolean;
  check?: boolean;
}

export interface InitFileResult {
  targetPath: string;
  status: FileStatus;
  operation: Operation;
}

export interface InitResult {
  repoRoot: string;
  exitCode: 0 | 1;
  ok: boolean;
  files: InitFileResult[];
  messages: string[];
}

export async function initCartodex(options: InitOptions): Promise<InitResult> {
  const repoRoot = await findGitRoot(options.cwd);
  if (!repoRoot) {
    throw new Error(`Could not find a git repository root from ${options.cwd}`);
  }

  const config = loadCartodexConfig(repoRoot);
  const initTemplates = renderInitTemplates({
    mapPath: config.mapPath,
    scoutAgentModel: config.scoutAgent.model,
    scoutAgentReasoningEffort: config.scoutAgent.reasoningEffort
  });
  const desiredFiles = [
    ...initTemplates.map((template) => analyzeTemplate(repoRoot, template)),
    analyzeAgentsFile(repoRoot, config.mapPath)
  ];
  const analyzed = await Promise.all(desiredFiles);
  const hasBlockingConflict = analyzed.some((file) => file.status === "conflict");
  const hasStaleWithoutForce = analyzed.some((file) => file.status === "stale") && !options.force;
  const checkFailed = options.check && analyzed.some((file) => file.status !== "current");

  if (!options.check) {
    for (const file of analyzed) {
      if (shouldWrite(file.status, Boolean(options.force))) {
        await file.write();
      }
    }
  }

  const blocked = hasBlockingConflict || hasStaleWithoutForce;
  const files = analyzed.map<InitFileResult>((file) => ({
    targetPath: file.targetPath,
    status: file.status,
    operation: operationFor(file.status, {
      check: Boolean(options.check),
      force: Boolean(options.force)
    })
  }));

  const exitCode: 0 | 1 = checkFailed || blocked ? 1 : 0;

  return {
    repoRoot,
    exitCode,
    ok: exitCode === 0,
    files,
    messages: buildMessages({ repoRoot, files, check: Boolean(options.check), blocked })
  };
}

interface AnalyzedFile {
  targetPath: string;
  status: FileStatus;
  write: () => Promise<void>;
}

async function analyzeTemplate(repoRoot: string, template: InitTemplate): Promise<AnalyzedFile> {
  const absolutePath = join(repoRoot, template.targetPath);
  const existing = await readOptional(absolutePath);
  let status: FileStatus;

  if (existing === null) {
    status = "missing";
  } else if (existing === template.contents) {
    status = "current";
  } else if (existing.includes(MANAGED_FILE_MARKER)) {
    status = "stale";
  } else {
    status = "conflict";
  }

  return {
    targetPath: template.targetPath,
    status,
    write: async () => {
      await mkdir(dirname(absolutePath), { recursive: true });
      await writeFile(absolutePath, template.contents, { mode: template.mode });
    }
  };
}

async function analyzeAgentsFile(repoRoot: string, mapPath: string): Promise<AnalyzedFile> {
  const targetPath = "AGENTS.md";
  const absolutePath = join(repoRoot, targetPath);
  const existing = await readOptional(absolutePath);
  const next = upsertAgentsSection(existing ?? "", mapPath);
  let status: FileStatus;

  if (existing === null || !hasAgentsSection(existing)) {
    status = "missing";
  } else if (existing === next) {
    status = "current";
  } else if (hasValidAgentsSection(existing)) {
    status = "stale";
  } else {
    status = "conflict";
  }

  return {
    targetPath,
    status,
    write: async () => {
      await writeFile(absolutePath, next);
    }
  };
}

export function upsertAgentsSection(existing: string, mapPath = DEFAULT_MAP_PATH): string {
  const agentsCartodexSection = renderAgentsCartodexSection(mapPath);

  if (!existing.trim()) {
    return `${agentsCartodexSection}\n`;
  }

  if (hasValidAgentsSection(existing)) {
    const start = existing.indexOf(AGENTS_SECTION_START);
    const end = existing.indexOf(AGENTS_SECTION_END) + AGENTS_SECTION_END.length;
    return `${existing.slice(0, start)}${agentsCartodexSection}${existing.slice(end)}`;
  }

  const separator = existing.endsWith("\n") ? "\n" : "\n\n";
  return `${existing}${separator}${agentsCartodexSection}\n`;
}

function hasAgentsSection(contents: string): boolean {
  return contents.includes(AGENTS_SECTION_START) || contents.includes(AGENTS_SECTION_END);
}

function hasValidAgentsSection(contents: string): boolean {
  const start = contents.indexOf(AGENTS_SECTION_START);
  const end = contents.indexOf(AGENTS_SECTION_END);
  return start !== -1 && end !== -1 && start < end;
}

async function readOptional(path: string): Promise<string | null> {
  try {
    return await readFile(path, "utf8");
  } catch (error) {
    if (error instanceof Error && "code" in error && error.code === "ENOENT") {
      return null;
    }
    throw error;
  }
}

function operationFor(
  status: FileStatus,
  options: { check: boolean; force: boolean }
): Operation {
  if (options.check) {
    return "checked";
  }
  if (status === "current") {
    return "unchanged";
  }
  if (status === "missing") {
    return "created";
  }
  if (status === "stale" && options.force) {
    return "updated";
  }
  return "blocked";
}

function shouldWrite(status: FileStatus, force: boolean): boolean {
  return status === "missing" || (status === "stale" && force);
}

function buildMessages(input: {
  repoRoot: string;
  files: InitFileResult[];
  check: boolean;
  blocked: boolean;
}): string[] {
  const messages = [`Cartodex init ${input.check ? "check" : "target"}: ${input.repoRoot}`];

  for (const file of input.files) {
    messages.push(`${file.status.padEnd(8)} ${file.targetPath}`);
  }

  if (input.check) {
    messages.push(
      input.files.every((file) => file.status === "current")
        ? "Cartodex assets are current."
        : "Cartodex assets are missing, stale, or conflicting."
    );
  } else if (input.blocked) {
    messages.push("Cartodex init stopped. Re-run with --force to reset stale managed files; conflicting unmanaged files are left untouched.");
  } else {
    messages.push("Next: open a fresh Codex thread and ask, \"Use Cartodex to map this codebase.\"");
  }

  return messages;
}
