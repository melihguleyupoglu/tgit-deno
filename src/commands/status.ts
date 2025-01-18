import { inflate } from "https://deno.land/x/compress@v0.5.5/mod.ts";
import { computeFileHash } from "./add.ts";

const currentBranchName = (await Deno.readTextFile(".tgit/HEAD"))
  .split("/")[2]
  .trim();
export default async function status(path?: string) {
  let currentPath = Deno.cwd();
  if (path) {
    currentPath = `${currentPath}/${path}`;
  }
  console.log(currentPath);
  console.log(`On branch ${currentBranchName}`);

  let ignoreContent = [] as string[];
  try {
    for await (const entry of Deno.readDir(currentPath)) {
      const fullPath = `${currentPath}/${entry.name}`;

      if (entry.isDirectory) {
        console.log(`Directory found: ${entry.name}`);
        await status(entry.name);
      } else {
        const fileName = entry.name;
        console.log(`Processing file: ${fileName}`);

        const hash = await computeFileHash(fullPath);
        await checkForToBeCommitted(fileName, hash);
      }
      const entryName = entry.name;
      console.log(entryName);

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
  console.log("Changes to be committed:");
  for (const line of lines) {
    const pathAndBlob = line.split(" ")[2];
    console.log(pathAndBlob);
    const path = pathAndBlob.split("\0")[0];
    console.log(path);
    const blob = pathAndBlob.split("\0")[1];
    console.log(blob);
    console.log(path, blob);
    if (path === fileName && blob !== blobParam) {
      console.log(`modified: ${fileName}`);
    }
  }
}

async function checkIfStaged(filePath: string): Promise<void> {}
