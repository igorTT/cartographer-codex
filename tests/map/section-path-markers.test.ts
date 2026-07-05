import { expect, test } from "vitest";
import { parseCartodexSectionPathMarkers } from "../../src/map/section-path-markers.js";

test("parses marked sections with file and directory paths", () => {
  const result = parseCartodexSectionPathMarkers(`# Cartodex Map

## System Overview
<!-- cartodex:paths README.md src/cli.ts -->

Overview text.

### Scanner

<!-- cartodex:paths src/scanner/ tests/scanner/scan-codebase.test.ts -->

Scanner text.
`);

  expect(result.markedSections).toEqual([
    {
      heading: "System Overview",
      level: 2,
      line: 3,
      markerLine: 4,
      paths: [
        { path: "README.md", kind: "file" },
        { path: "src/cli.ts", kind: "file" }
      ]
    },
    {
      heading: "Scanner",
      level: 3,
      line: 8,
      markerLine: 10,
      paths: [
        { path: "src/scanner/", kind: "directory" },
        { path: "tests/scanner/scan-codebase.test.ts", kind: "file" }
      ]
    }
  ]);
  expect(result.unmarkedSections).toEqual([]);
});

test("reports unmarked structural sections without throwing", () => {
  const result = parseCartodexSectionPathMarkers(`# Cartodex Map

## Module Guide

Intro without marker.

### CLI
<!-- cartodex:paths src/cli.ts -->

#### Implementation Notes
No marker required for non-structural headings.
`);

  expect(result.markedSections).toEqual([
    {
      heading: "CLI",
      level: 3,
      line: 7,
      markerLine: 8,
      paths: [
        { path: "src/cli.ts", kind: "file" }
      ]
    }
  ]);
  expect(result.unmarkedSections).toEqual([
    {
      heading: "Module Guide",
      level: 2,
      line: 3
    }
  ]);
});
