import { readFileSync } from "node:fs";
import { isAbsolute, join, posix } from "node:path";

export const CARTODEX_CONFIG_FILE = "cartodex.config.json";
export const DEFAULT_MAP_PATH = "docs/CARTODEX_MAP.md";
export const DEFAULT_SCOUT_AGENT_MODEL = "gpt-5.6-luna";
export const DEFAULT_SCOUT_AGENT_REASONING_EFFORT = "high";

export interface CartodexConfig {
  ignore: string[];
  mapPath: string;
  scoutAgent: {
    model: string;
    reasoningEffort: string;
  };
}

export function loadCartodexConfig(root: string): CartodexConfig {
  const configPath = join(root, CARTODEX_CONFIG_FILE);
  let rawConfig;

  try {
    rawConfig = readFileSync(configPath, "utf8");
  } catch (error) {
    if (error && typeof error === "object" && "code" in error && error.code === "ENOENT") {
      return defaultConfig();
    }
    throw new Error(`Failed to read ${CARTODEX_CONFIG_FILE}: ${error instanceof Error ? error.message : String(error)}`);
  }

  let parsed: unknown;
  try {
    parsed = JSON.parse(rawConfig);
  } catch (error) {
    throw new Error(`Failed to parse ${CARTODEX_CONFIG_FILE}: ${error instanceof Error ? error.message : String(error)}`);
  }

  if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) {
    throw new Error(`${CARTODEX_CONFIG_FILE}: expected a JSON object`);
  }

  const maybeConfig = parsed as { ignore?: unknown; mapPath?: unknown; scoutAgent?: unknown };
  const config = defaultConfig();

  if (maybeConfig.ignore !== undefined) {
    if (!Array.isArray(maybeConfig.ignore) || maybeConfig.ignore.some((pattern) => typeof pattern !== "string")) {
      throw new Error(`${CARTODEX_CONFIG_FILE}: expected "ignore" to be an array of strings`);
    }
    config.ignore = maybeConfig.ignore;
  }

  if (maybeConfig.mapPath !== undefined) {
    if (typeof maybeConfig.mapPath !== "string") {
      throw new Error(`${CARTODEX_CONFIG_FILE}: expected "mapPath" to be a repo-relative Markdown path`);
    }
    config.mapPath = validateMapPath(maybeConfig.mapPath);
  }

  if (maybeConfig.scoutAgent !== undefined) {
    if (!maybeConfig.scoutAgent || typeof maybeConfig.scoutAgent !== "object" || Array.isArray(maybeConfig.scoutAgent)) {
      throw new Error(`${CARTODEX_CONFIG_FILE}: expected "scoutAgent" to be an object`);
    }

    const scoutAgent = maybeConfig.scoutAgent as { model?: unknown; reasoningEffort?: unknown };
    if (scoutAgent.model !== undefined) {
      if (typeof scoutAgent.model !== "string" || !scoutAgent.model.trim()) {
        throw new Error(`${CARTODEX_CONFIG_FILE}: expected "scoutAgent.model" to be a non-empty string`);
      }
      config.scoutAgent.model = scoutAgent.model;
    }
    if (scoutAgent.reasoningEffort !== undefined) {
      if (typeof scoutAgent.reasoningEffort !== "string" || !scoutAgent.reasoningEffort.trim()) {
        throw new Error(`${CARTODEX_CONFIG_FILE}: expected "scoutAgent.reasoningEffort" to be a non-empty string`);
      }
      config.scoutAgent.reasoningEffort = scoutAgent.reasoningEffort;
    }
  }

  return config;
}

function defaultConfig(): CartodexConfig {
  return {
    ignore: [],
    mapPath: DEFAULT_MAP_PATH,
    scoutAgent: {
      model: DEFAULT_SCOUT_AGENT_MODEL,
      reasoningEffort: DEFAULT_SCOUT_AGENT_REASONING_EFFORT
    }
  };
}

function validateMapPath(mapPath: string): string {
  if (!mapPath.trim() || mapPath.endsWith("/") || mapPath.endsWith("\\")) {
    throw new Error(`${CARTODEX_CONFIG_FILE}: expected "mapPath" to be a repo-relative Markdown path`);
  }

  const slashPath = mapPath.replace(/\\/g, "/");

  if (isAbsolute(mapPath) || slashPath.startsWith("/") || /^[A-Za-z]:\//.test(slashPath)) {
    throw new Error(`${CARTODEX_CONFIG_FILE}: expected "mapPath" to be relative, not absolute`);
  }

  if (slashPath.split("/").includes("..")) {
    throw new Error(`${CARTODEX_CONFIG_FILE}: expected "mapPath" not to contain parent traversal`);
  }

  const normalized = posix.normalize(slashPath);
  if (normalized === "." || normalized.startsWith("../") || normalized === "..") {
    throw new Error(`${CARTODEX_CONFIG_FILE}: expected "mapPath" to stay inside the repository`);
  }

  if (!normalized.endsWith(".md")) {
    throw new Error(`${CARTODEX_CONFIG_FILE}: expected "mapPath" to end with .md`);
  }

  return normalized;
}
