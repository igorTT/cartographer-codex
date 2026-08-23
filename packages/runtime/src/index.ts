export {
  formatTree,
  isTextFile,
  parseArgs,
  runCli,
  scanDirectory,
  type DirectorySummary,
  type ScanResult,
  type ScannedFile,
  type SkippedFile
} from "./scanner/scan-codebase.js";
export {
  DEFAULT_IGNORE,
  loadIgnorePatterns,
  matchesGitignorePattern,
  parseGitignore,
  shouldIgnore
} from "./scanner/ignore.js";
export { countTokens, loadEncoding, type TokenEncoding } from "./scanner/tokens.js";
