import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { DEFAULT_MAP_PATH, DEFAULT_SCOUT_AGENT_MODEL, DEFAULT_SCOUT_AGENT_REASONING_EFFORT } from "../config.js";

export const MANAGED_FILE_MARKER = "cartodex-managed";
export const MAP_PATH_PLACEHOLDER = "{{mapPath}}";
export const SCOUT_AGENT_MODEL_PLACEHOLDER = "{{scoutAgentModel}}";
export const SCOUT_AGENT_REASONING_EFFORT_PLACEHOLDER = "{{scoutAgentReasoningEffort}}";

export const AGENTS_SECTION_START = "<!-- CARTODEX:START -->";
export const AGENTS_SECTION_END = "<!-- CARTODEX:END -->";

export const RETIRED_MANAGED_TEMPLATE_PATHS = [
  ".agents/skills/cartodex/scripts/tools/dist/scan-codebase.mjs"
];

export interface InitTemplate {
  targetPath: string;
  contents: string;
  mode?: number;
  managed?: boolean;
}

interface TemplateConstants {
  mapPath: string;
  scoutAgentModel: string;
  scoutAgentReasoningEffort: string;
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
  renderTemplateConstants(readTemplate("skill/SKILL.md"), {
    mapPath: DEFAULT_MAP_PATH,
    scoutAgentModel: DEFAULT_SCOUT_AGENT_MODEL,
    scoutAgentReasoningEffort: DEFAULT_SCOUT_AGENT_REASONING_EFFORT
  }),
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

export const CONFIGURATION_GUIDE_TEMPLATE = withManagedMarker(
  readTemplate("skill/resources/configuration-guide.md"),
  `<!-- ${MANAGED_FILE_MARKER}: edit with care; rerun cartodex init --force to reset. -->`
);

export const SCAN_CODEBASE_TEMPLATE = withScriptManagedMarker(readTemplate("skill/scripts/scan-codebase.mjs"));

export const SCANNER_TOOLS_PACKAGE_TEMPLATE = readTemplate("skill/scripts/tools/package.json");

export const SCANNER_TOOLS_PACKAGE_LOCK_TEMPLATE = readTemplate("skill/scripts/tools/package-lock.json");

export const SCANNER_TOOLS_GITIGNORE_TEMPLATE = withManagedMarker(
  readTemplate("skill/scripts/tools/gitignore"),
  `# ${MANAGED_FILE_MARKER}: edit with care; rerun cartodex init --force to reset.`
);

export const CARTODEX_SCOUT_AGENT_TEMPLATE = withManagedMarker(
  renderTemplateConstants(readTemplate("codex/cartodex-scout.toml"), {
    mapPath: DEFAULT_MAP_PATH,
    scoutAgentModel: DEFAULT_SCOUT_AGENT_MODEL,
    scoutAgentReasoningEffort: DEFAULT_SCOUT_AGENT_REASONING_EFFORT
  }),
  `# ${MANAGED_FILE_MARKER}: edit with care; rerun cartodex init --force to reset.`
);

export const AGENTS_CARTODEX_SECTION_TEMPLATE = readTemplate("AGENTS.cartodex.md").trimEnd();
export const AGENTS_CARTODEX_SECTION = renderAgentsCartodexSection(DEFAULT_MAP_PATH);

export function renderAgentsCartodexSection(mapPath: string): string {
  return AGENTS_CARTODEX_SECTION_TEMPLATE.replaceAll(MAP_PATH_PLACEHOLDER, mapPath);
}

export function renderCartodexSkillTemplate(mapPath: string): string {
  return withSkillManagedMarker(
    renderTemplateConstants(readTemplate("skill/SKILL.md"), {
      mapPath,
      scoutAgentModel: DEFAULT_SCOUT_AGENT_MODEL,
      scoutAgentReasoningEffort: DEFAULT_SCOUT_AGENT_REASONING_EFFORT
    }),
    `<!-- ${MANAGED_FILE_MARKER}: edit with care; rerun cartodex init --force to reset. -->`
  );
}

export function renderCartodexScoutAgentTemplate(
  scoutAgentModel: string,
  scoutAgentReasoningEffort = DEFAULT_SCOUT_AGENT_REASONING_EFFORT
): string {
  return withManagedMarker(
    renderTemplateConstants(readTemplate("codex/cartodex-scout.toml"), {
      mapPath: DEFAULT_MAP_PATH,
      scoutAgentModel,
      scoutAgentReasoningEffort
    }),
    `# ${MANAGED_FILE_MARKER}: edit with care; rerun cartodex init --force to reset.`
  );
}

function renderTemplateConstants(contents: string, constants: TemplateConstants): string {
  return contents
    .replaceAll(MAP_PATH_PLACEHOLDER, constants.mapPath)
    .replaceAll(SCOUT_AGENT_MODEL_PLACEHOLDER, constants.scoutAgentModel)
    .replaceAll(SCOUT_AGENT_REASONING_EFFORT_PLACEHOLDER, constants.scoutAgentReasoningEffort);
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
    targetPath: ".agents/skills/cartodex/resources/configuration-guide.md",
    contents: CONFIGURATION_GUIDE_TEMPLATE
  },
  {
    targetPath: ".agents/skills/cartodex/scripts/scan-codebase.mjs",
    contents: SCAN_CODEBASE_TEMPLATE,
    mode: 0o755
  },
  {
    targetPath: ".agents/skills/cartodex/scripts/tools/package.json",
    contents: SCANNER_TOOLS_PACKAGE_TEMPLATE,
    managed: true
  },
  {
    targetPath: ".agents/skills/cartodex/scripts/tools/package-lock.json",
    contents: SCANNER_TOOLS_PACKAGE_LOCK_TEMPLATE,
    managed: true
  },
  {
    targetPath: ".agents/skills/cartodex/scripts/tools/.gitignore",
    contents: SCANNER_TOOLS_GITIGNORE_TEMPLATE
  },
  {
    targetPath: ".codex/agents/cartodex-scout.toml",
    contents: CARTODEX_SCOUT_AGENT_TEMPLATE
  }
];

export function renderInitTemplates(options: {
  mapPath?: string;
  scoutAgentModel?: string;
  scoutAgentReasoningEffort?: string;
} = {}): InitTemplate[] {
  const mapPath = options.mapPath ?? DEFAULT_MAP_PATH;
  const scoutAgentModel = options.scoutAgentModel ?? DEFAULT_SCOUT_AGENT_MODEL;
  const scoutAgentReasoningEffort = options.scoutAgentReasoningEffort ?? DEFAULT_SCOUT_AGENT_REASONING_EFFORT;

  return INIT_TEMPLATES.map((template) => {
    if (template.targetPath === ".agents/skills/cartodex/SKILL.md") {
      return { ...template, contents: renderCartodexSkillTemplate(mapPath) };
    }

    if (template.targetPath === ".codex/agents/cartodex-scout.toml") {
      return {
        ...template,
        contents: renderCartodexScoutAgentTemplate(scoutAgentModel, scoutAgentReasoningEffort)
      };
    }

    return template;
  });
}
