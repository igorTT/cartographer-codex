import { mkdir, mkdtemp, readFile, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { tmpdir } from "node:os";
import { describe, expect, it } from "vitest";
import { initCartodex, upsertAgentsSection } from "../src/init/init.js";
import {
  AGENTS_CARTODEX_SECTION,
  CARTODEX_SKILL_TEMPLATE,
  INIT_TEMPLATES
} from "../src/init/templates.js";
import { findGitRoot } from "../src/init/repo.js";

async function makeRepo(gitAsFile = false): Promise<string> {
  const repo = await mkdtemp(join(tmpdir(), "cartodex-init-"));
  if (gitAsFile) {
    await writeFile(join(repo, ".git"), "gitdir: ../actual.git\n");
  } else {
    await mkdir(join(repo, ".git"));
  }
  return repo;
}

describe("findGitRoot", () => {
  it("walks upward and accepts .git directories", async () => {
    const repo = await makeRepo();
    const nested = join(repo, "packages", "one", "src");
    await mkdir(nested, { recursive: true });

    await expect(findGitRoot(nested)).resolves.toBe(repo);
  });

  it("accepts .git files from linked worktrees", async () => {
    const repo = await makeRepo(true);
    const nested = join(repo, "src");
    await mkdir(nested);

    await expect(findGitRoot(nested)).resolves.toBe(repo);
  });

  it("returns null outside a git repository", async () => {
    const directory = await mkdtemp(join(tmpdir(), "cartodex-no-git-"));

    await expect(findGitRoot(directory)).resolves.toBeNull();
  });
});

describe("initCartodex", () => {
  it("keeps installed skill frontmatter at the start of SKILL.md", () => {
    const frontmatterEnd = CARTODEX_SKILL_TEMPLATE.indexOf("\n---\n", 4) + "\n---\n".length;

    expect(CARTODEX_SKILL_TEMPLATE.startsWith("---\n")).toBe(true);
    expect(CARTODEX_SKILL_TEMPLATE.slice(0, frontmatterEnd)).toContain("name: cartodex");
    expect(CARTODEX_SKILL_TEMPLATE.indexOf("cartodex-managed")).toBeGreaterThanOrEqual(frontmatterEnd);
  });

  it("installs all init templates and is idempotent", async () => {
    const repo = await makeRepo();

    const first = await initCartodex({ cwd: repo });
    expect(first.exitCode).toBe(0);
    expect(first.files.every((file) => file.operation === "created")).toBe(true);

    for (const template of INIT_TEMPLATES) {
      await expect(readFile(join(repo, template.targetPath), "utf8")).resolves.toBe(template.contents);
    }
    await expect(readFile(join(repo, "AGENTS.md"), "utf8")).resolves.toBe(`${AGENTS_CARTODEX_SECTION}\n`);

    const second = await initCartodex({ cwd: repo });
    expect(second.exitCode).toBe(0);
    expect(second.files.every((file) => file.status === "current")).toBe(true);
    expect(second.files.every((file) => file.operation === "unchanged")).toBe(true);
  });

  it("preserves existing AGENTS.md content while adding the managed section", async () => {
    const repo = await makeRepo();
    await writeFile(join(repo, "AGENTS.md"), "# Project Agents\n\nKeep this text.\n");

    const result = await initCartodex({ cwd: repo });
    expect(result.exitCode).toBe(0);

    const agents = await readFile(join(repo, "AGENTS.md"), "utf8");
    expect(agents).toContain("# Project Agents");
    expect(agents).toContain("Keep this text.");
    expect(agents).toContain(AGENTS_CARTODEX_SECTION);
  });

  it("does not write during --check and exits 1 when assets are missing", async () => {
    const repo = await makeRepo();

    const result = await initCartodex({ cwd: repo, check: true });
    expect(result.exitCode).toBe(1);
    expect(result.files.every((file) => file.operation === "checked")).toBe(true);

    await expect(readFile(join(repo, "AGENTS.md"), "utf8")).rejects.toMatchObject({ code: "ENOENT" });
  });

  it("blocks stale managed files unless --force is provided", async () => {
    const repo = await makeRepo();
    await mkdir(join(repo, ".agents/skills/cartodex"), { recursive: true });
    await writeFile(
      join(repo, ".agents/skills/cartodex/SKILL.md"),
      CARTODEX_SKILL_TEMPLATE.replace("# Cartodex", "# Old Cartodex")
    );

    const blocked = await initCartodex({ cwd: repo });
    expect(blocked.exitCode).toBe(1);
    await expect(readFile(join(repo, ".agents/skills/cartodex/SKILL.md"), "utf8")).resolves.toContain(
      "# Old Cartodex"
    );

    const forced = await initCartodex({ cwd: repo, force: true });
    expect(forced.exitCode).toBe(0);
    await expect(readFile(join(repo, ".agents/skills/cartodex/SKILL.md"), "utf8")).resolves.toBe(
      CARTODEX_SKILL_TEMPLATE
    );
  });

  it("repairs missing files while leaving stale managed files untouched", async () => {
    const repo = await makeRepo();
    await mkdir(join(repo, ".agents/skills/cartodex"), { recursive: true });
    await writeFile(
      join(repo, ".agents/skills/cartodex/SKILL.md"),
      CARTODEX_SKILL_TEMPLATE.replace("# Cartodex", "# Old Cartodex")
    );

    const result = await initCartodex({ cwd: repo });
    expect(result.exitCode).toBe(1);
    expect(result.files.find((file) => file.targetPath.endsWith("SKILL.md"))?.operation).toBe("blocked");
    expect(result.files.find((file) => file.targetPath.endsWith("cartodex-scout.toml"))?.operation).toBe("created");

    await expect(readFile(join(repo, ".agents/skills/cartodex/SKILL.md"), "utf8")).resolves.toContain(
      "# Old Cartodex"
    );
    await expect(readFile(join(repo, ".codex/agents/cartodex-scout.toml"), "utf8")).resolves.toContain(
      'name = "cartodex-scout"'
    );
  });

  it("treats unmanaged existing template paths as conflicts even with --force", async () => {
    const repo = await makeRepo();
    await mkdir(join(repo, ".codex/agents"), { recursive: true });
    await writeFile(join(repo, ".codex/agents/cartodex-scout.toml"), "name = \"mine\"\n");

    const result = await initCartodex({ cwd: repo, force: true });
    expect(result.exitCode).toBe(1);
    expect(result.files.find((file) => file.targetPath.endsWith("cartodex-scout.toml"))?.status).toBe("conflict");
    await expect(readFile(join(repo, ".codex/agents/cartodex-scout.toml"), "utf8")).resolves.toBe(
      "name = \"mine\"\n"
    );
  });
});

describe("upsertAgentsSection", () => {
  it("replaces only the managed Cartodex marker block", () => {
    const existing = `before\n\n${AGENTS_CARTODEX_SECTION.replace("Cartodex assets", "Old assets")}\n\nafter\n`;

    expect(upsertAgentsSection(existing)).toBe(`before\n\n${AGENTS_CARTODEX_SECTION}\n\nafter\n`);
  });
});
