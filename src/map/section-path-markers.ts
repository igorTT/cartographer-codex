export type CartodexMarkerPathKind = "directory" | "file";

export interface CartodexMarkerPath {
  path: string;
  kind: CartodexMarkerPathKind;
}

export interface CartodexSectionMarker {
  heading: string;
  level: number;
  line: number;
  markerLine: number;
  paths: CartodexMarkerPath[];
}

export interface CartodexUnmarkedSection {
  heading: string;
  level: number;
  line: number;
}

export interface ParsedCartodexSectionPathMarkers {
  markedSections: CartodexSectionMarker[];
  unmarkedSections: CartodexUnmarkedSection[];
}

export interface ParseCartodexSectionPathMarkersOptions {
  structuralHeadingLevels?: number[];
}

const DEFAULT_STRUCTURAL_HEADING_LEVELS = new Set([2, 3]);
const HEADING_PATTERN = /^(#{1,6})\s+(.+?)\s*#*\s*$/;
const PATH_MARKER_PATTERN = /^<!--\s*cartodex:paths\s+(.+?)\s*-->$/;

export function parseCartodexSectionPathMarkers(
  markdown: string,
  options: ParseCartodexSectionPathMarkersOptions = {}
): ParsedCartodexSectionPathMarkers {
  const structuralHeadingLevels = options.structuralHeadingLevels
    ? new Set(options.structuralHeadingLevels)
    : DEFAULT_STRUCTURAL_HEADING_LEVELS;
  const lines = markdown.split(/\r?\n/);
  const markedSections: CartodexSectionMarker[] = [];
  const unmarkedSections: CartodexUnmarkedSection[] = [];

  for (let index = 0; index < lines.length; index += 1) {
    const heading = parseHeading(lines[index]);

    if (!heading || !structuralHeadingLevels.has(heading.level)) {
      continue;
    }

    const contentLineIndex = findFirstNonBlankLine(lines, index + 1);
    const marker = contentLineIndex === null ? null : parsePathMarker(lines[contentLineIndex]);

    if (marker && contentLineIndex !== null) {
      markedSections.push({
        heading: heading.text,
        level: heading.level,
        line: index + 1,
        markerLine: contentLineIndex + 1,
        paths: marker
      });
    } else {
      unmarkedSections.push({
        heading: heading.text,
        level: heading.level,
        line: index + 1
      });
    }
  }

  return {
    markedSections,
    unmarkedSections
  };
}

function parseHeading(line: string): { level: number; text: string } | null {
  const match = HEADING_PATTERN.exec(line);

  if (!match) {
    return null;
  }

  return {
    level: match[1].length,
    text: match[2].trim()
  };
}

function findFirstNonBlankLine(lines: string[], startIndex: number): number | null {
  for (let index = startIndex; index < lines.length; index += 1) {
    if (lines[index].trim() !== "") {
      return index;
    }
  }

  return null;
}

function parsePathMarker(line: string): CartodexMarkerPath[] | null {
  const match = PATH_MARKER_PATTERN.exec(line.trim());

  if (!match) {
    return null;
  }

  return match[1].trim().split(/\s+/).map((path) => ({
    path,
    kind: path.endsWith("/") ? "directory" : "file"
  }));
}
