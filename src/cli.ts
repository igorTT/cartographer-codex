#!/usr/bin/env node
import { Command } from "commander";
import { registerInitCommand } from "./commands/init.js";

const program = new Command();

program
  .name("cartodex")
  .description("Cartodex repository initializer for Codex.")
  .version("0.3.2");

registerInitCommand(program);

await program.parseAsync(process.argv);
