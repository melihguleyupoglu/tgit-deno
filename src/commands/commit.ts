import { indexPath } from "./add.ts";
import process from "node:process";
import { inflate, deflate } from "https://deno.land/x/compress@v0.5.5/mod.ts";
import { getAuthor } from "../config/configUtils.ts";
import { Author } from "../config/configUtils.ts";

interface StagingAreaEntry {
  fileInfo: string;
  blob: string;
  path: string;
}

interface TreeView {
  [key: string]: {
    files: StagingAreaEntry[];
    directories: string[];
  };
}

interface Commit {
  treeHash: string;
  author: string;
  message: string;
  parent?: string;
  date: number;
}

export async function commit(message: string) {
  if (isIndexEmpty()) {
    console.error("No changes to commit.");
    return;
  }

  const indexEntries = await readIndexEntries();
  const tree = createTree(indexEntries);
  const treeHash = await buildTree(tree, "root");
  const author = await getAuthor();
  console.log(author);
  if (!author) {
    console.error("Author not found");
    return;
  }
  const date = Date.now();
  if ((await getPreviousCommitHash()) !== treeHash) {
    const commit = await hashCommit(treeHash, author, message, date);
    await updateRefWithCommit(
      await createCommit(commit.hash, commit.commitContent)
    );
  } else {
    console.log("No changes detected. Commit not created.");
  }
}

function isIndexEmpty(): boolean {
  try {
    const indexContent = Deno.readTextFileSync(indexPath);
    const lines = indexContent.split("\n").filter((line) => line.trim() !== "");
    return lines.length === 0;
  } catch (e) {
    if (e instanceof Deno.errors.NotFound) {
      console.error("Staging area not found");
    } else {
      console.error("Error reading index file:", e);
    }
    throw e;
  }
}

async function readIndexEntries(): Promise<StagingAreaEntry[]> {
  try {
    const indexEntries: StagingAreaEntry[] = [];
    const indexContent = await Deno.readTextFile(indexPath);
    const lines = indexContent.split("\n").filter((line) => line.trim() !== "");

    for (const line of lines) {
      const parts = line.split(" ");
      if (parts.length !== 4) {
        console.error(`Invalid line format: ${line}`);
        continue;
      }
      const indexEntry: StagingAreaEntry = {
        fileInfo: parts[0],
        blob: parts[1],
        path: parts[2],
      };
      indexEntries.push(indexEntry);
    }
    return indexEntries;
  } catch (e) {
    console.error("Error reading index file:", e);
    return [];
  }
}

function createTree(stageAreaEntries: StagingAreaEntry[]): TreeView {
  const tree: TreeView = {};
  tree["root"] = { files: [], directories: [] };

  try {
    for (const entry of stageAreaEntries) {
      const path = entry.path;
      const pathParts = path.split("/");
      if (pathParts.length === 1) {
        tree["root"].files.push(entry);
        continue;
      }
      for (let i = 0; i < pathParts.length; i++) {
        if (i === pathParts.length - 1) {
          tree[pathParts[i - 1]].files.push(entry);
          continue;
        }
        if (i === 0) {
          if (!tree["root"].directories.includes(pathParts[i]))
            tree["root"].directories.push(pathParts[i]);
        }
        if (!tree[pathParts[i]]) {
          tree[pathParts[i]] = { files: [], directories: [] };
        }
        if (i + 1 !== pathParts.length - 1) {
          tree[pathParts[i]].directories.push(pathParts[i + 1]);
        }
      }
    }
  } catch (e) {
    throw e;
  }
  return tree;
}

async function buildTree(tree: TreeView, key: string): Promise<string> {
  const encoder = new TextEncoder();
  let treeContent = "";

  const currentPath = process.cwd().concat("/.tgit/objects");

  for (const file of tree[key].files) {
    if (treeContent.length !== 0) {
      treeContent += `\n${file.fileInfo} blob ${file.path}\0${file.blob}`;
    } else {
      treeContent += `${file.fileInfo} blob ${file.path}\0${file.blob}`;
    }
    const dir = `${currentPath}/${file.blob.slice(0, 2)}`;
    const filePath = `${dir}/${file.blob.slice(2)}`;
    const content = await Deno.readTextFile(file.path);
    const uint8Array = encoder.encode(content);
    const compressedContent = deflate(uint8Array);
    await Deno.mkdir(dir, { recursive: true });
    await Deno.writeFile(filePath, compressedContent);
  }

  for (const dir of tree[key].directories) {
    const dirHash = await buildTree(tree, dir);
    if (treeContent.length !== 0) {
      treeContent += `\n040000 tree ${dir}\0${dirHash}`;
    } else {
      treeContent += `040000 tree ${dir}\0${dirHash}`;
    }
  }

  const data = encoder.encode(treeContent);
  const hashBuffer = await crypto.subtle.digest("SHA-1", data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  const hash = hashArray.map((b) => b.toString(16).padStart(2, "0")).join("");

  const treeDirPath = `${currentPath}/${hash.slice(0, 2)}`;
  const treeFilePath = `${treeDirPath}/${hash.slice(2)}`;
  await Deno.mkdir(treeDirPath, { recursive: true });
  await Deno.writeTextFile(treeFilePath, treeContent);
  return hash;
}

async function hashCommit(
  treeHash: string,
  author: Author,
  message: string,
  date: number,
  parent?: string
): Promise<{ hash: string; commitContent: string }> {
  const encoder = new TextEncoder();
  const commitContent =
    `tree ${treeHash}\n` +
    (parent ? `parent ${parent}\n` : "") +
    `author ${author.username} <${author.mail}> ${Math.floor(
      date / 1000
    )} +0000\n` +
    `committer ${author.username} <${author.mail}> ${Math.floor(
      date / 1000
    )} +0000\n\n` +
    `${message}\n`;
  console.log(commitContent);
  const data = encoder.encode(commitContent);
  const hashBuffer = await crypto.subtle.digest("SHA-1", data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return {
    hash: hashArray.map((b) => b.toString(16).padStart(2, "0")).join(""),
    commitContent: commitContent,
  };
}

async function createCommit(
  commitString: string,
  commitContent: string
): Promise<string> {
  const encoder = new TextEncoder();

  const objectsPath = process.cwd().concat("/.tgit/objects");
  const dir = `${objectsPath}/${commitString.slice(0, 2)}`;
  const filePath = `${dir}/${commitString.slice(2)}`;
  await Deno.mkdir(dir, { recursive: true });
  const uint8Array = encoder.encode(commitContent);
  const compressedContent = deflate(uint8Array);
  Deno.writeFile(filePath, compressedContent);
  return commitString;
}

async function updateRefWithCommit(commitHash: string): Promise<boolean> {
  const currentBranch = (await Deno.readTextFile(".tgit/HEAD"))
    .split("/")[2]
    .trim();
  if (currentBranch) {
    await Deno.writeTextFile(`.tgit/refs/heads/${currentBranch}`, commitHash);
    return true;
  } else {
    console.log("Couldn't fetch the current branch info");
    return false;
  }
}

async function getPreviousCommitHash(): Promise<string> {
  try {
    const currentBranchName = (await Deno.readTextFile(".tgit/HEAD")).split(
      "/"
    )[2];
    const currentPath = `./.tgit/refs/heads/${currentBranchName}`.trim();
    const previousCommitHash = await Deno.readTextFile(currentPath);
    if (!previousCommitHash) {
      return "";
    }
    const folderPath =
      previousCommitHash.charAt(0) + previousCommitHash.charAt(1);
    const filePath = previousCommitHash.slice(2);
    const encodedCommitContent = await Deno.readFile(
      `./.tgit/objects/${folderPath}/${filePath}`
    );
    const uint8Array = inflate(encodedCommitContent);
    const decodedCommitContent = new TextDecoder().decode(uint8Array);
    const treeHash = decodedCommitContent.split("\n")[0].split(" ")[1];

    return treeHash;
  } catch (error) {
    console.error(error);
    return "";
  }
}
