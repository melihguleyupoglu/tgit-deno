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
