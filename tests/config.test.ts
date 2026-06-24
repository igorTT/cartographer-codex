import { mkdtempSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { expect, test } from "vitest";
import { DEFAULT_MAP_PATH, loadCartodexConfig } from "../src/config.js";

function fixture(): string {
  return mkdtempSync(join(tmpdir(), "cartodex-config-"));
}

test("returns default config when cartodex.config.json is missing", () => {
  expect(loadCartodexConfig(fixture())).toEqual({
    ignore: [],
    mapPath: DEFAULT_MAP_PATH
  });
});

test("loads ignore patterns and a custom mapPath", () => {
  const root = fixture();
  writeFileSync(join(root, "cartodex.config.json"), JSON.stringify({
    ignore: ["docs/private/", "*.scratch.ts"],
    mapPath: "architecture/CARTODEX.md",
    futureField: true
  }));

  expect(loadCartodexConfig(root)).toEqual({
    ignore: ["docs/private/", "*.scratch.ts"],
    mapPath: "architecture/CARTODEX.md"
  });
});

test("keeps the default mapPath when config omits it", () => {
  const root = fixture();
  writeFileSync(join(root, "cartodex.config.json"), JSON.stringify({
    ignore: ["docs/private/"]
  }));

  expect(loadCartodexConfig(root)).toEqual({
    ignore: ["docs/private/"],
    mapPath: DEFAULT_MAP_PATH
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
