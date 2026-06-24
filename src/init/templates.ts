import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { DEFAULT_MAP_PATH } from "../config.js";

export const MANAGED_FILE_MARKER = "cartodex-managed";
export const MAP_PATH_PLACEHOLDER = "{{mapPath}}";

export const AGENTS_SECTION_START = "<!-- CARTODEX:START -->";
export const AGENTS_SECTION_END = "<!-- CARTODEX:END -->";

export interface InitTemplate {
  targetPath: string;
  contents: string;
  mode?: number;
}

const templateRoot = join(dirname(fileURLToPath(import.meta.url)), "../../src/templates");

function readTemplate(relativePath: string): string {
  return readFileSync(join(templateRoot, relativePath), "utf8");
}

function withManagedMarker(contents: string, marker: string): string {
  return contents.includes(MANAGED_FILE_MARKER) ? contents : `${marker}\n${contents}`;
}

function withSkillManagedMarker(contents: string, marker: string): string {
  if (contents.includes(MANAGED_FILE_MARKER)) {
    return contents;
  }

  const frontmatterEnd = contents.indexOf("\n---\n", 4);
  if (contents.startsWith("---\n") && frontmatterEnd !== -1) {
    const insertAt = frontmatterEnd + "\n---\n".length;
    return `${contents.slice(0, insertAt)}${marker}\n${contents.slice(insertAt)}`;
  }

  return `${marker}\n${contents}`;
}

function withScriptManagedMarker(contents: string): string {
  if (contents.includes(MANAGED_FILE_MARKER)) {
    return contents;
  }

  if (contents.startsWith("#!")) {
    const newline = contents.indexOf("\n");
    if (newline !== -1) {
      return `${contents.slice(0, newline + 1)}// ${MANAGED_FILE_MARKER}: edit with care; rerun cartodex init --force to reset.\n${contents.slice(newline + 1)}`;
    }
  }

  return `// ${MANAGED_FILE_MARKER}: edit with care; rerun cartodex init --force to reset.\n${contents}`;
}

export const CARTODEX_SKILL_TEMPLATE = withSkillManagedMarker(
  readTemplate("skill/SKILL.md"),
  `<!-- ${MANAGED_FILE_MARKER}: edit with care; rerun cartodex init --force to reset. -->`
);

export const CARTODEX_MAP_STRUCTURE_TEMPLATE = withManagedMarker(
  readTemplate("skill/resources/cartodex-map-structure.md"),
  `<!-- ${MANAGED_FILE_MARKER}: edit with care; rerun cartodex init --force to reset. -->`
);

export const SUBAGENT_REPORT_FORMAT_TEMPLATE = withManagedMarker(
  readTemplate("skill/resources/subagent-report-format.md"),
  `<!-- ${MANAGED_FILE_MARKER}: edit with care; rerun cartodex init --force to reset. -->`
);

export const SCAN_CODEBASE_TEMPLATE = withScriptManagedMarker(readTemplate("skill/scripts/scan-codebase.mjs"));

export const CARTODEX_SCOUT_AGENT_TEMPLATE = withManagedMarker(
  readTemplate("codex/cartodex-scout.toml"),
  `# ${MANAGED_FILE_MARKER}: edit with care; rerun cartodex init --force to reset.`
);

export const AGENTS_CARTODEX_SECTION_TEMPLATE = readTemplate("AGENTS.cartodex.md").trimEnd();
export const AGENTS_CARTODEX_SECTION = renderAgentsCartodexSection(DEFAULT_MAP_PATH);

export function renderAgentsCartodexSection(mapPath: string): string {
  return AGENTS_CARTODEX_SECTION_TEMPLATE.replaceAll(MAP_PATH_PLACEHOLDER, mapPath);
}

export const INIT_TEMPLATES: InitTemplate[] = [
  {
    targetPath: ".agents/skills/cartodex/SKILL.md",
    contents: CARTODEX_SKILL_TEMPLATE
  },
  {
    targetPath: ".agents/skills/cartodex/resources/cartodex-map-structure.md",
    contents: CARTODEX_MAP_STRUCTURE_TEMPLATE
  },
  {
    targetPath: ".agents/skills/cartodex/resources/subagent-report-format.md",
    contents: SUBAGENT_REPORT_FORMAT_TEMPLATE
  },
  {
    targetPath: ".agents/skills/cartodex/scripts/scan-codebase.mjs",
    contents: SCAN_CODEBASE_TEMPLATE,
    mode: 0o755
  },
  {
    targetPath: ".codex/agents/cartodex-scout.toml",
    contents: CARTODEX_SCOUT_AGENT_TEMPLATE
  }
];
