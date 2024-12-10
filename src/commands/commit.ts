import { indexPath } from "./add.ts";

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

function getDirectories(indexContent: string): string[] {
  const directories: string[] = [];
  try {
    const lines = indexContent.split("\n");
    for (const line of lines) {
      const parts = line.split(" ");
      if (parts.length < 3) continue;

      const path = parts[2];
      const dirs = path.split("/").slice(0, -1);

      let currentPath = "";
      for (const dir of dirs) {
        currentPath = currentPath ? `${currentPath}/${dir}` : dir;
        if (!directories.includes(currentPath)) {
          directories.push(currentPath);
        }
      }
    }
  } catch (e) {
    console.error(e);
  }
  return directories;
}
