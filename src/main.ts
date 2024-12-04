import Denomander from "https://deno.land/x/denomander@0.9.3/mod.ts";
import init from "./commands/init.ts";
import add from "./commands/add.ts";
import rm from "./commands/rm.ts";
import { existsSync, lstatSync } from "node:fs";

const program = new Denomander({
  app_name: "Tgit",
  app_description: "Git implementation with TS",
  app_version: "1.0.1",
});

program.command("init", "Initializes a repository").action(() => {
  init();
});

program
  .command("add", "Adds file/files to staging area")
  .option("-p --path", "Path to file or directory")
  .action(() => {
    const path = program.path || ".";
    if (typeof path !== "string" || path.trim() === "") {
      throw new Error("Invalid path provided.");
    }
    add(path);
  });

program
  .command("rm", "Removes file/files from staging area")
  .option("-p --path", "Path to file or directory")
  .option("-r --recursive", "Required for recursive removal on directories")
  .action(() => {
    const path = program.path || ".";
    if (typeof path !== "string" || path.trim() === "") {
      throw new Error("Invalid path provided.");
    }
    if (existsSync(path) && lstatSync(path).isDirectory()) {
      if (!program.recursive) {
        throw new Error(
          "The specified path is a directory. Use the --recursive option to remove it."
        );
      }
    }
    rm(path, program.recursive);
  });

program.parse(Deno.args);
