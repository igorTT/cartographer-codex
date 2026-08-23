#!/usr/bin/env node
// cartodex-managed: edit with care; rerun cartodex init --force to reset.

import { createHash } from "node:crypto";
import { spawnSync } from "node:child_process";
import { existsSync, readFileSync, renameSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const scriptDirectory = dirname(fileURLToPath(import.meta.url));
const toolsDirectory = join(scriptDirectory, "tools");
const lockfilePath = join(toolsDirectory, "package-lock.json");
const nodeModulesPath = join(toolsDirectory, "node_modules");
const installStampPath = join(toolsDirectory, ".cartodex-install.json");

function lockfileHash() {
  return createHash("sha256").update(readFileSync(lockfilePath)).digest("hex");
}

function hasCurrentInstall(expectedHash) {
  if (!existsSync(nodeModulesPath)) {
    return false;
  }

  try {
    const stamp = JSON.parse(readFileSync(installStampPath, "utf8"));
    return stamp.lockfileHash === expectedHash;
  } catch {
    return false;
  }
}

function installTools(expectedHash) {
  console.error("Cartodex: installing scanner runtime dependencies...");
  const npmExecutable = process.platform === "win32" ? "npm.cmd" : "npm";
  const result = spawnSync(
    npmExecutable,
    ["ci", "--ignore-scripts", "--no-audit", "--no-fund"],
    {
      cwd: toolsDirectory,
      stdio: ["ignore", "ignore", "inherit"]
    }
  );

  if (result.error) {
    throw new Error(`Failed to start npm ci: ${result.error.message}`);
  }
  if (result.status !== 0) {
    throw new Error(`npm ci failed with exit code ${result.status ?? "unknown"}`);
  }

  const temporaryStampPath = `${installStampPath}.${process.pid}.tmp`;
  writeFileSync(temporaryStampPath, `${JSON.stringify({ lockfileHash: expectedHash })}\n`);
  renameSync(temporaryStampPath, installStampPath);
}

async function main() {
  const expectedHash = lockfileHash();
  if (!hasCurrentInstall(expectedHash)) {
    installTools(expectedHash);
  }

  const scanner = await import("./tools/dist/scan-codebase.mjs");
  process.exitCode = scanner.runCli(process.argv.slice(2));
}

main().catch((error) => {
  console.error(`Cartodex scanner failed: ${error instanceof Error ? error.message : String(error)}`);
  process.exitCode = 1;
});
