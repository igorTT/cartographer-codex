import { dirname, join, parse, resolve } from "node:path";
import { lstat } from "node:fs/promises";

export async function findGitRoot(start: string): Promise<string | null> {
  let current = resolve(start);

  while (true) {
    if (await pathExists(join(current, ".git"))) {
      return current;
    }

    const parent = dirname(current);
    if (parent === current || current === parse(current).root) {
      return null;
    }
    current = parent;
  }
}

async function pathExists(path: string): Promise<boolean> {
  try {
    const stat = await lstat(path);
    return stat.isDirectory() || stat.isFile();
  } catch (error) {
    if (isNotFound(error)) {
      return false;
    }
    throw error;
  }
}

function isNotFound(error: unknown): boolean {
  return error instanceof Error && "code" in error && error.code === "ENOENT";
}
