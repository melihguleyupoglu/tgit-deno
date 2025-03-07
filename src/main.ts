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
import {
  listLocalBranches,
  removeBranch,
  createBranch,
} from "./utils/branchUtils.ts";
import status, {
  modifiedEntriesOnWorkingSpace,
  modifiedEntriesOnStagingArea,
  deletedEntriesFromStagingArea,
  deletedEntriesFromWorkingDir,
  newEntries,
  untrackedEntries,
  notStagedForCommitEntries,
} from "./commands/status.ts";
import getBranchName from "./config/getBranchName.ts";
import path from "node:path";
import { listBranches } from "./utils/branchUtils.ts";

// interface BranchOptions {
//   list?: string;
// }

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

// program
//   .command("branch [branch]", "List, create, or delete branches")
//   .option(
//     "-l --list",
//     "List the branches. Optionally specify 'remote' for remote branches."
//   )
//   .option(
//     "-d --delete",
//     "Delete a branch. Optionally specify 'force' for force deletion."
//   )

//   .action(async (branch: { branch: string }) => {
//     if (program.list) {
//       await listLocalBranches();
//     } else if (program.delete) {
//       await removeBranch(branch.branch);
//     } else {
//       await createBranch(branch.branch);
//     }
//   });

program
  .command("switch [branch]", "Switch to a specified branch")
  .action(async (branch: { branch?: string }) => {
    try {
      if (!branch.branch) {
        console.log("Please specifiy the branch to switch");
        return;
      }
      const branchPath = `.tgit/refs/heads/${branch.branch}`;
      await Deno.stat(branchPath);

      await Deno.writeTextFile(
        ".tgit/HEAD",
        `ref: refs/heads/${branch.branch}`
      );
      console.log(`Switched to branch ${branch.branch}`);
    } catch (error) {
      if (error instanceof Deno.errors.NotFound) {
        console.error(
          `No branch named ${branch.branch}. Switch operation failed.`
        );
      } else {
        console.error("An unexpected error occured:", error);
      }
    }
  });

program.command("status", "Show the working tree status").action(async () => {
  const currentBranchName = await getBranchName();
  console.log(`On branch ${currentBranchName}`);
  await status();
  if (
    modifiedEntriesOnStagingArea.length > 0 ||
    newEntries.length > 0 ||
    deletedEntriesFromStagingArea.length > 0
  ) {
    console.log("Changes to be committed:");
    if (newEntries.length > 0) {
      console.log("new files:");
      console.log(newEntries);
    }
    if (modifiedEntriesOnStagingArea.length > 0) {
      console.log("modified:");
      console.log(modifiedEntriesOnStagingArea);
    }
    if (deletedEntriesFromStagingArea.length > 0) {
      console.log("deleted:");
      console.log(deletedEntriesFromStagingArea);
    }
  }
  if (
    notStagedForCommitEntries.length > 0 ||
    deletedEntriesFromWorkingDir.length > 0 ||
    modifiedEntriesOnWorkingSpace.length > 0
  ) {
    console.log("Changes not staged for commit:");
    if (notStagedForCommitEntries.length > 0) {
      console.log(notStagedForCommitEntries);
    }
    if (modifiedEntriesOnWorkingSpace.length > 0) {
      console.log("modified:");
      console.log(modifiedEntriesOnWorkingSpace);
    }
    if (deletedEntriesFromWorkingDir.length > 0) {
      console.log("deleted:");
      console.log(deletedEntriesFromWorkingDir);
    }
  }
  if (untrackedEntries.length > 0) {
    console.log("untracked files:");
    console.log(untrackedEntries);
  } else {
    console.log("nothing to commit, working tree clean");
  }
});

program
  .command("branch")
  .option("-l --list", "List branches in current repository")
  .option("-d --delete", "Remove a branch in current repository")
  .option("-D --Delete", "Remove a branch forcefully in current repository.")
  .action(async () => {
    try {
      if (program.list) {
        const branchNames = await listBranches(();
        console.log(branchNames);
      }
      if (program.delete) {
        // TODO: add branch remover function
      }
    } catch (err) {
      console.error(err);
    }
  });

program
  .command("branch-create [branchName]")
  .action(async (args: { branchName: string }) => {
    try {
      createBranch(args.branchName);
    } catch (err) {
      console.error(err);
    }
  });

program.parse(Deno.args);
