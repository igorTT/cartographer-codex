import { mkdir, mkdtemp, readFile, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { tmpdir } from "node:os";
import { describe, expect, it } from "vitest";
import { initCartodex, upsertAgentsSection } from "../src/init/init.js";
import {
  AGENTS_CARTODEX_SECTION,
  CARTODEX_MAP_STRUCTURE_TEMPLATE,
  CARTODEX_SCOUT_AGENT_TEMPLATE,
  CARTODEX_SKILL_TEMPLATE,
  CONFIGURATION_GUIDE_TEMPLATE,
  INIT_TEMPLATES,
  SCAN_CODEBASE_TEMPLATE,
  SUBAGENT_REPORT_FORMAT_TEMPLATE,
  renderAgentsCartodexSection,
  renderCartodexScoutAgentTemplate,
  renderCartodexSkillTemplate
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
  it("installs the generated scanner with its shebang, managed marker, and ESLint disable banner", async () => {
    const repo = await makeRepo();

    const result = await initCartodex({ cwd: repo });
    expect(result.exitCode).toBe(0);

    const scanner = await readFile(join(repo, ".agents/skills/cartodex/scripts/scan-codebase.mjs"), "utf8");
    expect(scanner).toBe(SCAN_CODEBASE_TEMPLATE);
    expect(scanner.split("\n").slice(0, 3)).toEqual([
      "#!/usr/bin/env node",
      "// cartodex-managed: edit with care; rerun cartodex init --force to reset.",
      "/* eslint-disable */"
    ]);
  });

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

  it("renders the default mapPath into prompts when config is missing", async () => {
    const repo = await makeRepo();

    const result = await initCartodex({ cwd: repo });
    expect(result.exitCode).toBe(0);

    await expect(readFile(join(repo, "AGENTS.md"), "utf8")).resolves.toBe(`${AGENTS_CARTODEX_SECTION}\n`);
    await expect(readFile(join(repo, ".agents/skills/cartodex/SKILL.md"), "utf8")).resolves.toBe(
      CARTODEX_SKILL_TEMPLATE
    );
  });

  it("keeps the default mapPath when config omits mapPath", async () => {
    const repo = await makeRepo();
    await writeFile(join(repo, "cartodex.config.json"), JSON.stringify({
      ignore: ["private-notes.md"]
    }));

    const result = await initCartodex({ cwd: repo });
    expect(result.exitCode).toBe(0);

    await expect(readFile(join(repo, "AGENTS.md"), "utf8")).resolves.toBe(`${AGENTS_CARTODEX_SECTION}\n`);
    await expect(readFile(join(repo, ".agents/skills/cartodex/SKILL.md"), "utf8")).resolves.toBe(
      CARTODEX_SKILL_TEMPLATE
    );
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

  it("renders configured mapPath into AGENTS.md", async () => {
    const repo = await makeRepo();
    await writeFile(join(repo, "cartodex.config.json"), JSON.stringify({
      mapPath: "architecture/CARTODEX.md"
    }));

    const result = await initCartodex({ cwd: repo });
    expect(result.exitCode).toBe(0);

    await expect(readFile(join(repo, "AGENTS.md"), "utf8")).resolves.toBe(
      `${renderAgentsCartodexSection("architecture/CARTODEX.md")}\n`
    );
    await expect(readFile(join(repo, ".agents/skills/cartodex/SKILL.md"), "utf8")).resolves.toBe(
      renderCartodexSkillTemplate("architecture/CARTODEX.md")
    );
  });

  it("renders the default scout agent model when config is missing", async () => {
    const repo = await makeRepo();

    const result = await initCartodex({ cwd: repo });
    expect(result.exitCode).toBe(0);

    await expect(readFile(join(repo, ".codex/agents/cartodex-scout.toml"), "utf8")).resolves.toBe(
      CARTODEX_SCOUT_AGENT_TEMPLATE
    );
    await expect(readFile(join(repo, ".codex/agents/cartodex-scout.toml"), "utf8")).resolves.toContain(
      'model = "gpt-5.6-luna"'
    );
    await expect(readFile(join(repo, ".codex/agents/cartodex-scout.toml"), "utf8")).resolves.toContain(
      'model_reasoning_effort = "high"'
    );
  });

  it("renders configured scout agent settings into the installed agent", async () => {
    const repo = await makeRepo();
    await writeFile(join(repo, "cartodex.config.json"), JSON.stringify({
      scoutAgent: {
        model: "gpt-5.3-codex-spark",
        reasoningEffort: "low"
      }
    }));

    const result = await initCartodex({ cwd: repo });
    expect(result.exitCode).toBe(0);

    await expect(readFile(join(repo, ".codex/agents/cartodex-scout.toml"), "utf8")).resolves.toBe(
      renderCartodexScoutAgentTemplate("gpt-5.3-codex-spark", "low")
    );
  });

  it("renders concrete mapPath values throughout the installed skill prompt", async () => {
    const rendered = renderCartodexSkillTemplate("architecture/CARTODEX.md");

    expect(rendered).toContain("writing architecture/CARTODEX.md plus an AGENTS.md pointer");
    expect(rendered).toContain("then synthesizing their reports into `architecture/CARTODEX.md`");
    expect(rendered).toContain("Check whether `architecture/CARTODEX.md` already exists.");
    expect(rendered).toContain("Write or update `architecture/CARTODEX.md`.");
    expect(rendered).toContain("Before writing `architecture/CARTODEX.md`");
    expect(rendered).not.toContain("{{mapPath}}");
  });

  it("requires token table cells to use scanner counts or explicit reasons", () => {
    expect(SUBAGENT_REPORT_FORMAT_TEMPLATE).toContain("use the scanner output provided by the orchestrator");
    expect(SUBAGENT_REPORT_FORMAT_TEMPLATE).toContain("[N or reason]");
    expect(SUBAGENT_REPORT_FORMAT_TEMPLATE).not.toContain("N or unknown");

    expect(CARTODEX_MAP_STRUCTURE_TEMPLATE).toContain("directory_summaries[].tokens");
    expect(CARTODEX_SKILL_TEMPLATE).toContain("Resolve Token Columns");
    expect(CARTODEX_SKILL_TEMPLATE).toContain("unresolved: [reason]");
  });

  it("installs a user-facing configuration guide", () => {
    expect(CONFIGURATION_GUIDE_TEMPLATE).toContain("Cartodex Configuration Guide");
    expect(CONFIGURATION_GUIDE_TEMPLATE).toContain("repository-facing choices");
    expect(CONFIGURATION_GUIDE_TEMPLATE).toContain("npx cartodex init --force");
    expect(CARTODEX_SKILL_TEMPLATE).toContain("resources/configuration-guide.md");
  });

  it("reports AGENTS.md as stale when configured mapPath changes", async () => {
    const repo = await makeRepo();
    await writeFile(join(repo, "cartodex.config.json"), JSON.stringify({
      mapPath: "docs/CARTODEX_MAP.md"
    }));
    await initCartodex({ cwd: repo });
    await writeFile(join(repo, "cartodex.config.json"), JSON.stringify({
      mapPath: "architecture/CARTODEX.md"
    }));

    const result = await initCartodex({ cwd: repo, check: true });

    expect(result.exitCode).toBe(1);
    expect(result.files.find((file) => file.targetPath === "AGENTS.md")?.status).toBe("stale");
    expect(result.files.find((file) => file.targetPath.endsWith("SKILL.md"))?.status).toBe("stale");
  });

  it("reports scout agent as stale when configured scout model changes", async () => {
    const repo = await makeRepo();
    await writeFile(join(repo, "cartodex.config.json"), JSON.stringify({
      scoutAgent: {
        model: "gpt-5.6-luna"
      }
    }));
    await initCartodex({ cwd: repo });
    await writeFile(join(repo, "cartodex.config.json"), JSON.stringify({
      scoutAgent: {
        model: "gpt-5.3-codex-spark"
      }
    }));

    const result = await initCartodex({ cwd: repo, check: true });

    expect(result.exitCode).toBe(1);
    expect(result.files.find((file) => file.targetPath.endsWith("cartodex-scout.toml"))?.status).toBe("stale");
  });

  it("reports scout agent as stale when configured scout reasoning effort changes", async () => {
    const repo = await makeRepo();
    await writeFile(join(repo, "cartodex.config.json"), JSON.stringify({
      scoutAgent: {
        reasoningEffort: "medium"
      }
    }));
    await initCartodex({ cwd: repo });
    await writeFile(join(repo, "cartodex.config.json"), JSON.stringify({
      scoutAgent: {
        reasoningEffort: "high"
      }
    }));

    const result = await initCartodex({ cwd: repo, check: true });

    expect(result.exitCode).toBe(1);
    expect(result.files.find((file) => file.targetPath.endsWith("cartodex-scout.toml"))?.status).toBe("stale");
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

  it("replaces the managed Cartodex marker block with a custom mapPath", () => {
    const existing = `before\n\n${AGENTS_CARTODEX_SECTION}\n\nafter\n`;
    const expectedSection = renderAgentsCartodexSection("architecture/CARTODEX.md");

    expect(upsertAgentsSection(existing, "architecture/CARTODEX.md")).toBe(`before\n\n${expectedSection}\n\nafter\n`);
  });
});
