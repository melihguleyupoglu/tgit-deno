import { indexPath } from "./add.ts";

interface StagingAreaEntry {
  permission: string;
  blob: string;
  path: string;
}

interface GroupedEntries {
  files: StagingAreaEntry[];
  directories: { [key: string]: GroupedEntries };
}

interface Commit {
  tree: string;
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
    const lines = indexContent.split("\n");

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

function createTree(stagingAreaEntries: StagingAreaEntry[]): GroupedEntries {
  const grouped: GroupedEntries = {
    files: [],
    directories: {},
  };

  for (const entry of stagingAreaEntries) {
    const pathParts = entry.path.split("/");

    if (pathParts.length === 1) {
      grouped.files.push(entry);
    } else {
      const dir = pathParts[0];
      const remainingPath = pathParts.slice(1).join("/");

      if (!grouped.directories[dir]) {
        grouped.directories[dir] = {
          files: [],
          directories: {},
        };
      }

      const subEntry: StagingAreaEntry = {
        permission: entry.permission,
        blob: entry.blob,
        path: remainingPath,
      };
      const subGrouped = createTree([subEntry]);

      grouped.directories[dir].files.push(...subGrouped.files);
      grouped.directories[dir].directories = {
        ...grouped.directories[dir].directories,
        ...subGrouped.directories,
      };
    }
  }
  return grouped;
}
async function createCommit(
  stagingAreaEntries: StagingAreaEntry[],
  author: string,
  message: string,
  parentCommit?: string
): Promise<Commit> {
  const treeGrouped = createTree(stagingAreaEntries);
  const treeContent = JSON.stringify(treeGrouped);
  const treeHash = await createBlob(treeContent);

  const date = Date.now();

  const commit: Commit = {
    tree: treeHash,
    author: author,
    message: message,
    parent: parentCommit,
    date: date,
  };

  return commit;
}

async function createBlob(content: string): Promise<string> {
  const encoder = new TextEncoder();
  const data = encoder.encode(content);
  const hash = await crypto.subtle.digest("SHA-1", data);
  return new TextDecoder().decode(new Uint8Array(hash));
}
