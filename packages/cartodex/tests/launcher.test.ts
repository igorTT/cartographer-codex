import { spawnSync } from "node:child_process";
import { chmod, mkdir, mkdtemp, readFile, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { delimiter, join } from "node:path";
import { describe, expect, it } from "vitest";
import { SCAN_CODEBASE_TEMPLATE, SCANNER_TOOLS_PACKAGE_TEMPLATE } from "../src/init/templates.js";

async function createFakeNpm(binDirectory: string): Promise<void> {
  const fakeNpmPath = join(binDirectory, "fake-npm.mjs");
  await writeFile(fakeNpmPath, `
import { appendFileSync, mkdirSync, writeFileSync } from "node:fs";
import { join, resolve } from "node:path";

const args = process.argv.slice(2);
appendFileSync(process.env.CARTODEX_TEST_NPM_LOG, JSON.stringify(args) + "\\n");
const prefixIndex = args.indexOf("--prefix");
const toolsDirectory = resolve(process.cwd(), args[prefixIndex + 1]);
const runtimeDirectory = join(toolsDirectory, "node_modules", "@cartodex", "runtime");
mkdirSync(runtimeDirectory, { recursive: true });
writeFileSync(join(runtimeDirectory, "package.json"), JSON.stringify({
  name: "@cartodex/runtime",
  type: "module",
  exports: "./index.js"
}));
writeFileSync(join(runtimeDirectory, "index.js"), "export function runCli() { return 0; }\\n");
`);

  if (process.platform === "win32") {
    await writeFile(join(binDirectory, "npm.cmd"), `@echo off\r\n"${process.execPath}" "%~dp0\\fake-npm.mjs" %*\r\n`);
    return;
  }

  const npmPath = join(binDirectory, "npm");
  await writeFile(npmPath, `#!/usr/bin/env node\n${await readFile(fakeNpmPath, "utf8")}`);
  await chmod(npmPath, 0o755);
}

function runLauncher(scriptPath: string, binDirectory: string, logPath: string) {
  return spawnSync(process.execPath, [scriptPath], {
    encoding: "utf8",
    env: {
      ...process.env,
      CARTODEX_TEST_NPM_LOG: logPath,
      PATH: `${binDirectory}${delimiter}${process.env.PATH ?? ""}`
    }
  });
}

describe("scanner launcher", () => {
  it("installs cold, reuses warm, and reinstalls when package.json changes", async () => {
    const skillDirectory = await mkdtemp(join(tmpdir(), "cartodex-launcher-"));
    const scriptDirectory = join(skillDirectory, "scripts");
    const toolsDirectory = join(scriptDirectory, "tools");
    const binDirectory = join(skillDirectory, "bin");
    const scriptPath = join(scriptDirectory, "scan-codebase.mjs");
    const packagePath = join(toolsDirectory, "package.json");
    const legacyLockfilePath = join(toolsDirectory, "package-lock.json");
    const logPath = join(skillDirectory, "npm-calls.jsonl");
    await mkdir(toolsDirectory, { recursive: true });
    await mkdir(binDirectory);
    await writeFile(scriptPath, SCAN_CODEBASE_TEMPLATE);
    await writeFile(packagePath, SCANNER_TOOLS_PACKAGE_TEMPLATE);
    await createFakeNpm(binDirectory);

    const cold = runLauncher(scriptPath, binDirectory, logPath);
    expect(cold.status, cold.stderr).toBe(0);
    expect((await readFile(logPath, "utf8")).trim().split("\n").map(JSON.parse)).toEqual([[
      "install",
      "--prefix",
      "tools",
      "--package-lock=false",
      "--ignore-scripts",
      "--no-audit",
      "--no-fund"
    ]]);
    await expect(readFile(legacyLockfilePath, "utf8")).rejects.toMatchObject({ code: "ENOENT" });
    const stamp = JSON.parse(await readFile(join(toolsDirectory, ".cartodex-install.json"), "utf8"));
    expect(stamp).toEqual({ packageManifestHash: expect.any(String) });

    const warm = runLauncher(scriptPath, binDirectory, logPath);
    expect(warm.status, warm.stderr).toBe(0);
    expect((await readFile(logPath, "utf8")).trim().split("\n")).toHaveLength(1);

    await writeFile(legacyLockfilePath, JSON.stringify({
      name: "cartodex-skill-tools",
      dependencies: { "@cartodex/runtime": "0.1.0" }
    }));
    await writeFile(packagePath, `${SCANNER_TOOLS_PACKAGE_TEMPLATE.trimEnd()}\n `);
    const invalidated = runLauncher(scriptPath, binDirectory, logPath);
    expect(invalidated.status, invalidated.stderr).toBe(0);
    expect((await readFile(logPath, "utf8")).trim().split("\n")).toHaveLength(2);
    await expect(readFile(legacyLockfilePath, "utf8")).resolves.toContain('"@cartodex/runtime":"0.1.0"');
  });
});
