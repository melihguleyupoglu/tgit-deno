import { inflate } from "https://deno.land/x/compress@v0.5.5/mod.ts";
import { computeFileHash } from "./add.ts";

interface Entry {
  path: string;
  blob: string;
}

interface StagingAreaEntry extends Entry {
  mtime: string;
}

const currentBranchName = (await Deno.readTextFile(".tgit/HEAD"))
  .split("/")[2]
  .trim();

const commitEntries: Entry[] = await checkCommit();
const stagingAreaEntries: StagingAreaEntry[] = await checkStagingArea();
export const untrackedEntries: string[] = [];
export const newEntries: string[] = [];
export const deletedEntriesFromStagingArea: string[] = [];

export default async function status(path?: string) {
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
  const rootContentHash = rootHashContent.split("\0")[1];
  const rootContentHashContent = await Deno.readTextFile(
    `.tgit/objects/${
      rootContentHash.charAt(0) + rootContentHash.charAt(1)
    }/${rootContentHash.slice(2)}`
  );
  const lines = rootContentHashContent.split("\n");
  lines.pop();
  const entries = [];
  for (const line of lines) {
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
    entries.push({ path: path, blob: blob });
  }
  return entries;
}

async function checkStagingArea(): Promise<StagingAreaEntry[]> {
  let stagingAreaEntries: StagingAreaEntry[] = [];
  const stagingAreaContent = await Deno.readTextFile(".tgit/index");
  const entries = stagingAreaContent.split("\n");
  entries.pop();
  for (const entry of entries) {
    const [_, blob, path, mtime] = entry.split(" ");
    stagingAreaEntries.push({ blob: blob, path: path, mtime: mtime });
  }
  return stagingAreaEntries;
}
