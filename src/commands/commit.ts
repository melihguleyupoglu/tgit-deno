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

// async function createTree(
//   stagingAreaEntries: StagingAreaEntry[]
// ): Promise<string> {
//   let treeContent = "";

//   for (const { permission, blob, path } of stagingAreaEntries) {
//     const entry = `${permission} ${blob}`;
//   }
// }

function groupEntriesByDirectory(
  stagingAreaEntries: StagingAreaEntry[]
): GroupedEntries {
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
      const subGrouped = groupEntriesByDirectory([subEntry]);

      grouped.directories[dir].files.push(...subGrouped.files);
      grouped.directories[dir].directories = {
        ...grouped.directories[dir].directories,
        ...subGrouped.directories,
      };
    }
  }
  return grouped;
}
