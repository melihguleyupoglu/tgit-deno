import { indexPath } from "./add.ts";

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

export async function commit() {
  if (isIndexEmpty()) {
    console.error("No changes to commit.");
    return;
  }

  const indexEntries = await readIndexEntries();
  console.log(await buildTree(createTree(indexEntries)));
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
      if (parts.length !== 3) {
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

async function buildTree(tree: TreeView): Promise<string> {
  const encoder = new TextEncoder();
  let fileHash = "";
  let treeHash = "";
  for (const dir of tree["root"].directories) {
    if (tree[dir].directories.length === 0) {
      for (const file of tree[dir].files) {
        fileHash = fileHash.concat(
          file.fileInfo + " blob " + file.path + "\t" + file.blob
        );
      }
      // console.log(fileHash);
      const data = encoder.encode(fileHash);
      const hashBuffer = await crypto.subtle.digest("SHA-1", data);
      const hashArray = Array.from(new Uint8Array(hashBuffer));
      const hashHex = hashArray
        .map((b) => b.toString(16).padStart(2, "0"))
        .join("");
      treeHash = treeHash.concat(`040000 tree ${dir}\t${hashHex}\n`);
    }
  }
  return treeHash;
}

// function createCommit(
//   treeHash: string,
//   author: string,
//   message: string,
//   date: number,
//   parent?: string
// ): Commit {}
