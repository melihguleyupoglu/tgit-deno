import Denomander from "https://deno.land/x/denomander@0.9.3/mod.ts";
import init from "./commands/init.ts";
import add from "./commands/add.ts";
import rm from "./commands/rm.ts";
import { existsSync, lstatSync } from "node:fs";
import config from "./config/config.ts";
import {
  ensureConfigFileExists,
  readConfigFile,
} from "./config/configUtils.ts";
import { commit } from "./commands/commit.ts";

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

program
  .command("config", "Sets or retrieves configuration")
  .option("-s --set", "Set a configuration value")
  .option("-g --get", "Get a configuration value")
  .option("-l --list", "List all configuration values")
  .action(() => {
    ensureConfigFileExists();
    const configContent = readConfigFile();

    if (program.set) {
      const [key, value] = program.set.split("=");
      if (!key || !value) {
        throw new Error("Invalid format for --set. Use: --set key=value");
      }
      config.set(key, value, configContent);
    } else if (program.get) {
      const value = config.get(program.get, configContent);
      console.log(typeof value === "string" ? `${value}` : `value not found`);
    } else if (program.list) {
      config.list(configContent);
    } else {
      throw new Error("Please provide a valid option: --set, --get, or --list");
    }
  });

program
  .command("commit", "Commits the content on staging area")
  .option("-m --message", "Set a message for commit object")
  .action(() => {
    if (program.message) {
      commit(program.message);
    } else {
      throw new Error(
        "Invalid message format. Use -m or --message option. use: --message: example message"
      );
    }
  });

program
  .command("branch", "List, create, or delete branches")
  .option("-l --list", "List the branches")
  .option("-d --delete", "Delete a branch")
  .option("-D --delete --force", "Force delete a branch")
  .action(() => {
    if (!program.option) {
      //Create a branch
    } else if (program.list) {
      //Log the branches
    } else if (program.delete) {
      //Remove the branch
    }
  });

program
  .command("switch", "Switch to a specified branch")
  .option("-b --branch", "branch to be switched to")
  .action(() => {
    if (program.branch) {
      //switch to branch
    } else {
      console.log("Please specifiy the branch to switch");
    }
  });

program.parse(Deno.args);
