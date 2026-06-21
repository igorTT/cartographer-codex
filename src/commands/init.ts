import { Command } from "commander";
import { initCartodex } from "../init/init.js";

export interface InitCliOptions {
  force?: boolean;
  check?: boolean;
}

export function registerInitCommand(program: Command): Command {
  return program
    .command("init")
    .description("Install Cartodex Codex assets into the current git repository.")
    .option("--force", "overwrite stale Cartodex-managed files")
    .option("--check", "check whether Cartodex assets are current without writing")
    .action(async (options: InitCliOptions) => {
      let result;
      try {
        result = await initCartodex({
          cwd: process.cwd(),
          force: Boolean(options.force),
          check: Boolean(options.check)
        });
      } catch (error) {
        console.error(error instanceof Error ? error.message : String(error));
        process.exitCode = 1;
        return;
      }

      for (const line of result.messages) {
        console.log(line);
      }

      process.exitCode = result.exitCode;
    });
}
