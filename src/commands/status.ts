import { inflate } from "https://deno.land/x/compress@v0.5.5/mod.ts";
import { computeFileHash } from "./add.ts";

interface Entry {
  path: string;
  blob: string;
}

interface StagingAreaEntry extends Entry {
  mtime: string;
}

export const untrackedEntries: string[] = [];
export const newEntries: string[] = [];
export const deletedEntriesFromStagingArea: string[] = [];
export const notStagedForCommitEntries: string[] = [];
export let currentBranchName: string = "";

export default async function status(path?: string) {
  try {
    const dirEntries = [];
    for await (const _ of Deno.readDir(".tgit/objects")) {
      dirEntries.push(_);
    }
    if (dirEntries.length > 0) {
      const commitEntries: Entry[] = await checkCommit();
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
            const fileName = entry.name;

            if (
              commitEntries.filter((entry) => entry.path === relativePath)
                .length > 0
            ) {
              try {
                const commitHash = commitEntries.filter(
                  (entry) => entry.path === relativePath
                )[0].blob;
                const workingDirectoryHash = await computeFileHash(
                  relativePath
                );
                if (
                  workingDirectoryHash !== commitHash &&
                  stagingAreaEntries.filter(
                    (entry) => entry.path === relativePath
                  ).length === 0
                ) {
                  notStagedForCommitEntries.push(relativePath);
                }
              } catch (error) {
                console.error(error);
              }
            }
            if (
              commitEntries.filter((entry) => entry.path === relativePath)
                .length === 0 &&
              stagingAreaEntries.filter((entry) => entry.path === relativePath)
                .length === 0
            ) {
              untrackedEntries.push(relativePath);
            } else if (
              commitEntries.filter((entry) => entry.path === relativePath)
                .length === 0 &&
              stagingAreaEntries.filter((entry) => entry.path === relativePath)
                .length === 1
            ) {
              newEntries.push(relativePath);
            } else if (
              commitEntries.filter((entry) => entry.path === relativePath)
                .length === 1 &&
              stagingAreaEntries.filter((entry) => entry.path === relativePath)
                .length === 0
            ) {
              deletedEntriesFromStagingArea.push(relativePath);
            }
            const hash = await computeFileHash(fullPath);
            for (const entry of commitEntries) {
              if (
                entry.path.trim() === relativePath.trim() &&
                entry.blob !== hash
              ) {
                console.log("Changes to be committed:");
                console.log(`modified: ${fileName}`);
              }
            }
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
    } else {
      console.log("No commits yet");
    }
  } catch (error) {
    console.error(error);
  }
}

async function checkForToBeCommitted(
  fileName: string,
  blobParam: string
): Promise<void> {
  // const indexContent = await Deno.readTextFile(".tgit/index");
  // const mtime = (await Deno.lstat(fileName)).mtime ?? 0;
  // const lines = indexContent.split("\n");
  // console.log("Changes to be committed:\n");
  // for (const entry of lines) {
  //   if (entry[2] === fileName && entry[3] !== mtime.toString()) {
  //     console.log(`\tmodified: ${fileName}\n`);
  //   }
  //   // else if()
  // }
}

async function checkCommit(): Promise<Entry[]> {
  currentBranchName = (await Deno.readTextFile(".tgit/HEAD"))
    .split("/")[2]
    .trim();

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
    `.tgit/objects/${rootHash.charAt(0) + rootHash.charAt(1)}/${rootHash.slice(
      2
    )}`
  );
  const commitEntriesArray = rootHashContent.split("\n");
  const commitEntries = [];

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
        // console.log(line);
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
