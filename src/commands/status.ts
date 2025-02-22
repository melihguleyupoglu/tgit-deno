import { inflate } from "https://deno.land/x/compress@v0.5.5/mod.ts";
import { computeFileHash } from "./add.ts";
import getBranchName from "../config/getBranchName.ts";

interface Entry {
  path: string;
  blob: string;
}

interface StagingAreaEntry extends Entry {
  mtime: string;
}

interface WorkingDirEntries extends Entry {
  mtime: string;
}

export const untrackedEntries: string[] = [];
export const workingDirEntries: WorkingDirEntries[] = [];
export const newEntries: string[] = [];
export const deletedEntriesFromStagingArea: string[] = [];
export const notStagedForCommitEntries: string[] = [];
export const modifiedEntriesOnWorkingSpace: string[] = [];
export const modifiedEntriesOnStagingArea: string[] = [];
export const deletedEntriesFromWorkingDir: string[] = [];
export let commitEntries: Entry[] = [];

export default async function status(path?: string) {
  try {
    const dirEntries = [];
    for await (const _ of Deno.readDir(".tgit/objects")) {
      dirEntries.push(_);
    }
    if (dirEntries.length > 0) {
      commitEntries = await checkCommit();
    }
    const stagingAreaEntries: StagingAreaEntry[] = await checkStagingArea();
    let currentPath = Deno.cwd();
    const tgitPath = Deno.cwd();
    if (path) {
      currentPath = `${path}`;
    }

    // let ignoreContent = [] as string[];
    try {
      for await (const entry of Deno.readDir(currentPath)) {
        const fullPath = `${currentPath}/${entry.name}`;
        const relativePath = fullPath.replace(`${tgitPath}/`, "");

        if (entry.isDirectory) {
          await status(fullPath);
        } else {
          const stagedEntry = stagingAreaEntries.find(
            (entry) => entry.path === relativePath
          );
          const commitEntry = commitEntries.find(
            (entry) => entry.path === relativePath
          );
          const fileName = entry.name;
          const mtime =
            (await Deno.lstat(fullPath)).mtime?.valueOf().toString() ?? "0";
          workingDirEntries.push({
            blob: "",
            path: relativePath,
            mtime: mtime,
          });
          const workingAreaEntry = workingDirEntries.find(
            (entry) => entry.path === relativePath
          );

          if (
            commitEntries.filter((entry) => entry.path === relativePath)
              .length > 0
          ) {
            try {
              const commitBlob = commitEntry?.blob;
              const workingDirectoryHash = await computeFileHash(relativePath);
              // TODO: Change the modifiedEntriesOnWorkingSpace push below
              if (
                commitEntry &&
                stagedEntry &&
                stagedEntry.mtime !== workingAreaEntry?.mtime
              ) {
                modifiedEntriesOnWorkingSpace.push(relativePath);
              }
            } catch (error) {
              console.error(error);
            }
          }
          if (!commitEntry && !stagedEntry) {
            untrackedEntries.push(relativePath);
          } else if (!commitEntry && stagedEntry) {
            newEntries.push(relativePath);
          } else if (commitEntry && !stagedEntry) {
            deletedEntriesFromStagingArea.push(relativePath);
          } else if (
            commitEntry &&
            stagedEntry &&
            commitEntry.blob !== stagedEntry.blob
          ) {
            modifiedEntriesOnStagingArea.push(relativePath);
          } else if (commitEntry && !workingAreaEntry) {
            deletedEntriesFromWorkingDir.push(relativePath);
          }
          // const hash = await computeFileHash(fullPath);
          // for (const entry of commitEntries) {
          //   if (
          //     entry.path.trim() === relativePath.trim() &&
          //     entry.blob !== hash
          //   ) {
          //     modifiedEntriesOnWorkingSpace.push(fileName);
          //   }
          // }
        }

        // if (fileName in ignoreContent) {
        //   continue;
        // } else {
        //   const hash = await computeFileHash(fileName);

        //   await checkForToBeCommitted(fileName, hash);
        // }
      }
    } catch (error) {
      console.error("Error:", error);
    }
  } catch (error) {
    console.error(error);
  }
}

async function checkCommit(): Promise<Entry[]> {
  const commitEntries = [];

  try {
    const currentBranchName = await getBranchName();
    const commitHash = await Deno.readTextFile(
      `.tgit/refs/heads/${currentBranchName}`
    );
    const commitObjectCompressed = await Deno.readFile(
      `.tgit/objects/${
        commitHash.charAt(0) + commitHash.charAt(1)
      }/${commitHash.slice(2)}`
    );
    const uint8Array = inflate(commitObjectCompressed);
    const decodedCommitObject = new TextDecoder().decode(uint8Array);
    const rootHash = decodedCommitObject.split("\n")[0].split(" ")[1];
    const rootHashContent = await Deno.readTextFile(
      `.tgit/objects/${
        rootHash.charAt(0) + rootHash.charAt(1)
      }/${rootHash.slice(2)}`
    );
    const commitEntriesArray = rootHashContent.split("\n");

    for (const commitEntry of commitEntriesArray) {
      const type = commitEntry.split(" ")[1];
      const path = commitEntry.split("\0")[0].split(" ")[2];
      const blob = commitEntry.split("\0")[1];
      if (type === "blob") {
        commitEntries.push({ path: path, blob: blob });
      } else {
        const commitEntryHash = commitEntry.split("\0")[1];

        const commitEntryContent = await Deno.readTextFile(
          `.tgit/objects/${
            commitEntryHash.charAt(0) + commitEntryHash.charAt(1)
          }/${commitEntryHash.slice(2)}`
        );
        const commitEntryLines = commitEntryContent.split("\n");

        for (const line of commitEntryLines) {
          const parts = line.split(" ");

          if (parts.length < 3) {
            console.error("Invalid line format:", line);
            continue;
          }

          const pathAndBlob = parts[2];
          if (!pathAndBlob.includes("\0")) {
            console.error("Invalid pathAndBlob format:", pathAndBlob);
            continue;
          }
          const [path, blob] = pathAndBlob.split("\0");
          commitEntries.push({ path: path, blob: blob });
        }
      }
    }
  } catch (e) {
    console.error(e);
  }

  return commitEntries;
}

async function checkStagingArea(): Promise<StagingAreaEntry[]> {
  const stagingAreaEntries: StagingAreaEntry[] = [];
  const stagingAreaContent = await Deno.readTextFile(".tgit/index");
  const entries = stagingAreaContent.split("\n");
  entries.pop();
  for (const entry of entries) {
    const [_, blob, path, mtime] = entry.split(" ");
    stagingAreaEntries.push({ blob: blob, path: path, mtime: mtime });
  }
  return stagingAreaEntries;
}
