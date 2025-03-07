import { readConfigFile } from "../config/configUtils.ts";

export async function createBranch(branchName: string | undefined) {
  const decoder = new TextDecoder("utf-8");

  const currentBranchName = (await Deno.readTextFile(".tgit/HEAD"))
    .split("/")[2]
    .trim();
  const currentBranchCommit = await Deno.readTextFile(
    `.tgit/refs/heads/${currentBranchName}`
  );
  Deno.writeTextFile(`.tgit/refs/heads/${branchName}`, currentBranchCommit);
}

export async function removeBranch(branchName: string) {
  for await (const file of Deno.readDir(".tgit/refs/heads")) {
    if (file.name === branchName) {
      try {
        await Deno.remove(`.tgit/refs/heads/${file.name}`);
        if (
          (await Deno.readTextFile(".tgit/HEAD")) ===
          `ref: refs/heads/${branchName}`
        ) {
          const defaultBranch = getDefaultBranch();
          if (defaultBranch !== undefined) {
            Deno.writeTextFile(
              ".tgit/HEAD",
              `ref: refs/heads/${defaultBranch.replace(/['"]/g, "")}`
            );
          }
        }
      } catch (e) {
        throw e;
      }
    }
  }
}

function getDefaultBranch(): string | undefined {
  const configContent = readConfigFile();
  const lines = configContent.split("\n");
  for (const line of lines) {
    console.log(line);
    if (line.startsWith("\tdefaultBranch")) {
      return line.split("=")[1].trim();
    }
  }
  //TODO tell user how-to set default branch
  console.log("Please specify default branch in config file.");
  return undefined;
}

export async function listBranches(): Promise<string[] | undefined> {
  const branchNames: string[] = [];
  for await (const file of await Deno.readDir(".tgit/refs/heads")) {
    branchNames.push(file.name);
  }
  return branchNames;
}
