#!/usr/bin/env node
// cartodex-managed: edit with care; rerun cartodex init --force to reset.

import { createHash } from "node:crypto";
import { spawnSync } from "node:child_process";
import { existsSync, readFileSync, renameSync, writeFileSync } from "node:fs";
import { createRequire } from "node:module";
import { dirname, join } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

const scriptDirectory = dirname(fileURLToPath(import.meta.url));
const toolsDirectory = join(scriptDirectory, "tools");
const packageManifestPath = join(toolsDirectory, "package.json");
const nodeModulesPath = join(toolsDirectory, "node_modules");
const runtimePackagePath = join(nodeModulesPath, "@cartodex", "runtime", "package.json");
const installStampPath = join(toolsDirectory, ".cartodex-install.json");
const requireFromTools = createRequire(join(toolsDirectory, "package.json"));

function packageManifestHash() {
  return createHash("sha256").update(readFileSync(packageManifestPath)).digest("hex");
}

function hasCurrentInstall(expectedHash) {
  if (!existsSync(nodeModulesPath) || !existsSync(runtimePackagePath)) {
    return false;
  }

  try {
    const stamp = JSON.parse(readFileSync(installStampPath, "utf8"));
    return stamp.packageManifestHash === expectedHash;
  } catch {
    return false;
  }
}

function installTools(expectedHash) {
  console.error("Cartodex: installing scanner runtime dependencies...");
  const npmExecutable = process.platform === "win32" ? "npm.cmd" : "npm";
  const result = spawnSync(
    npmExecutable,
    ["install", "--prefix", "tools", "--package-lock=false", "--ignore-scripts", "--no-audit", "--no-fund"],
    {
      cwd: scriptDirectory,
      stdio: ["ignore", "ignore", "inherit"]
    }
  );

  if (result.error) {
    throw new Error(`Failed to start npm install: ${result.error.message}`);
  }
  if (result.status !== 0) {
    throw new Error(`npm install failed with exit code ${result.status ?? "unknown"}`);
  }

  const temporaryStampPath = `${installStampPath}.${process.pid}.tmp`;
  writeFileSync(temporaryStampPath, `${JSON.stringify({ packageManifestHash: expectedHash })}\n`);
  renameSync(temporaryStampPath, installStampPath);
}

async function main() {
  const expectedHash = packageManifestHash();
  if (!hasCurrentInstall(expectedHash)) {
    installTools(expectedHash);
  }

  const runtime = await import(pathToFileURL(requireFromTools.resolve("@cartodex/runtime")).href);
  process.exitCode = runtime.runCli(process.argv.slice(2));
}

main().catch((error) => {
  console.error(`Cartodex scanner failed: ${error instanceof Error ? error.message : String(error)}`);
  process.exitCode = 1;
});
