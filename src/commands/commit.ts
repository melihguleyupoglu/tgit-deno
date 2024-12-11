import { indexPath } from "./add.ts";

interface StagingAreaEntry {
  permission: string;
  blob: string;
  path: string;
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
