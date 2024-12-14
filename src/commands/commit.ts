import { indexPath } from "./add.ts";

interface StagingAreaEntry {
  permission: string;
  blob: string;
  path: string;
}

interface TreeEntry {
  permission: string;
  type: "blob" | "tree";
  name: string;
  hash: string;
}

interface Commit {
  tree: string;
  author: string;
  message: string;
  parent?: string;
  date: number;
}

interface HashTable {
  [key: string]: {
    files: { permission: string; blob: string; name: string }[];
    directories: string[];
  };
}

export async function commit() {
  if (isIndexEmpty()) {
    console.error("No changes to commit.");
    return;
  }

  const indexEntries = await readIndexEntries();
  const author = "Melih <melih@example.com>";
  const message = "Initial commit";

  const { commit, treeHash } = await createCommit(
    indexEntries,
    author,
    message
  );
  console.log("Commit created:", commit);
  console.log("Tree hash:", treeHash);
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
        permission: parts[0],
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

async function createTree(
  stagingAreaEntries: StagingAreaEntry[]
): Promise<TreeEntry[]> {
  const hashTable: HashTable = {};

  // 1. HashTable'i oluştur
  for (const entry of stagingAreaEntries) {
    const pathParts = entry.path.split("/");
    const fileName = pathParts.pop()!;
    const dirPath = pathParts.join("/");

    // Dizin oluştur
    if (!hashTable[dirPath]) {
      hashTable[dirPath] = { files: [], directories: [] };
    }

    // Dosyayı ekle
    hashTable[dirPath].files.push({
      permission: entry.permission,
      blob: entry.blob,
      name: fileName,
    });

    // Alt dizinleri oluştur
    for (let i = 1; i <= pathParts.length; i++) {
      const subDirPath = pathParts.slice(0, i).join("/");
      if (!hashTable[subDirPath]) {
        hashTable[subDirPath] = { files: [], directories: [] };
      }
      const nextDir = pathParts[i];
      if (nextDir && !hashTable[subDirPath].directories.includes(nextDir)) {
        hashTable[subDirPath].directories.push(nextDir);
      }
    }
  }

  // 2. Rekürsif Tree oluştur
  async function buildTree(dirPath: string): Promise<TreeEntry[]> {
    const entries: TreeEntry[] = [];

    // Dosyalar için TreeEntry oluştur
    for (const file of hashTable[dirPath]?.files || []) {
      entries.push({
        permission: file.permission,
        type: "blob",
        name: file.name,
        hash: file.blob,
      });
    }

    // Dizinler için rekürsif TreeEntry oluştur
    for (const subDir of hashTable[dirPath]?.directories || []) {
      const subDirPath = dirPath ? `${dirPath}/${subDir}` : subDir;
      const subTree = await buildTree(subDirPath);

      const treeContent = subTree
        .map(
          (entry) =>
            `${entry.permission} ${entry.type} ${entry.hash} ${entry.name}\n`
        )
        .join("");
      const treeHash = await createBlob(treeContent);

      entries.push({
        permission: "040000", // Dizin modu
        type: "tree",
        name: subDir,
        hash: treeHash,
      });
    }

    return entries;
  }

  // Root için Tree oluştur
  return buildTree("");
}

async function createCommit(
  stagingAreaEntries: StagingAreaEntry[],
  author: string,
  message: string,
  parentCommit?: string
): Promise<{ commit: Commit; treeHash: string }> {
  const treeGrouped = await createTree(stagingAreaEntries);

  const treeContent = treeGrouped
    .map(
      (entry) => `${entry.permission} ${entry.type} ${entry.hash} ${entry.name}`
    )
    .join("\n");
  const treeHash = await createBlob(treeContent);

  const date = Date.now();

  const commit: Commit = {
    tree: treeHash,
    author: author,
    message: message,
    parent: parentCommit,
    date: date,
  };

  return { commit, treeHash };
}

async function createBlob(content: string): Promise<string> {
  const encoder = new TextEncoder();
  const data = encoder.encode(content);
  const hashBuffer = await crypto.subtle.digest("SHA-1", data);
  return Array.from(new Uint8Array(hashBuffer))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}
