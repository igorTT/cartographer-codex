import { mkdtempSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { expect, test } from "vitest";
import {
  DEFAULT_MAP_PATH,
  DEFAULT_SCOUT_AGENT_MODEL,
  DEFAULT_SCOUT_AGENT_REASONING_EFFORT,
  loadCartodexConfig
} from "../src/config.js";

function fixture(): string {
  return mkdtempSync(join(tmpdir(), "cartodex-config-"));
}

test("returns default config when cartodex.config.json is missing", () => {
  expect(loadCartodexConfig(fixture())).toEqual({
    ignore: [],
    mapPath: DEFAULT_MAP_PATH,
    scoutAgent: {
      model: DEFAULT_SCOUT_AGENT_MODEL,
      reasoningEffort: DEFAULT_SCOUT_AGENT_REASONING_EFFORT
    }
  });
});

test("loads ignore patterns, a custom mapPath, and scout agent settings", () => {
  const root = fixture();
  writeFileSync(join(root, "cartodex.config.json"), JSON.stringify({
    ignore: ["docs/private/", "*.scratch.ts"],
    mapPath: "architecture/CARTODEX.md",
    scoutAgent: {
      model: "gpt-5.3-codex-spark",
      reasoningEffort: "low"
    },
    futureField: true
  }));

  expect(loadCartodexConfig(root)).toEqual({
    ignore: ["docs/private/", "*.scratch.ts"],
    mapPath: "architecture/CARTODEX.md",
    scoutAgent: {
      model: "gpt-5.3-codex-spark",
      reasoningEffort: "low"
    }
  });
});

test("keeps the default mapPath when config omits it", () => {
  const root = fixture();
  writeFileSync(join(root, "cartodex.config.json"), JSON.stringify({
    ignore: ["docs/private/"]
  }));

  expect(loadCartodexConfig(root)).toEqual({
    ignore: ["docs/private/"],
    mapPath: DEFAULT_MAP_PATH,
    scoutAgent: {
      model: DEFAULT_SCOUT_AGENT_MODEL,
      reasoningEffort: DEFAULT_SCOUT_AGENT_REASONING_EFFORT
    }
  });
});

test("keeps default scout agent fields when config omits them", () => {
  const root = fixture();
  writeFileSync(join(root, "cartodex.config.json"), JSON.stringify({
    scoutAgent: {}
  }));

  expect(loadCartodexConfig(root)).toEqual({
    ignore: [],
    mapPath: DEFAULT_MAP_PATH,
    scoutAgent: {
      model: DEFAULT_SCOUT_AGENT_MODEL,
      reasoningEffort: DEFAULT_SCOUT_AGENT_REASONING_EFFORT
    }
  });
});

test("reports invalid mapPath values clearly", () => {
  const invalidValues = [
    "/tmp/CARTODEX.md",
    "../CARTODEX.md",
    "docs/../CARTODEX.md",
    "..\\CARTODEX.md",
    "C:\\tmp\\CARTODEX.md",
    "docs/CARTODEX.txt",
    "",
    "docs/",
    42
  ];

  for (const value of invalidValues) {
    const root = fixture();
    writeFileSync(join(root, "cartodex.config.json"), JSON.stringify({ mapPath: value }));

    expect(() => loadCartodexConfig(root)).toThrow(/mapPath/);
  }
});

test("reports invalid scoutAgent values clearly", () => {
  const invalidValues = [
    null,
    [],
    "gpt-5.3-codex-spark",
    { model: "" },
    { model: "   " },
    { model: 42 },
    { reasoningEffort: "" },
    { reasoningEffort: "   " },
    { reasoningEffort: 42 }
  ];

  for (const value of invalidValues) {
    const root = fixture();
    writeFileSync(join(root, "cartodex.config.json"), JSON.stringify({ scoutAgent: value }));

    expect(() => loadCartodexConfig(root)).toThrow(/scoutAgent/);
  }
});
