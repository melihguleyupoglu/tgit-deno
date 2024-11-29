import * as path from "@std/path";

const indexPath = path.join(Deno.cwd(), ".tgit", "index");

export default async function add(fileOrDirectoryPath: string): Promise<void> {
  checkTgitDirectory();

  if (fileOrDirectoryPath === "." || isDirectory(fileOrDirectoryPath)) {
    for await (const dirEntry of Deno.readDir(fileOrDirectoryPath)) {
      const fullPath = path.join(fileOrDirectoryPath, dirEntry.name);
      const fileInfo = await Deno.lstat(fullPath);
      const isSymlink = fileInfo.isSymlink;

      if (!isSymlink) {
        if (dirEntry.isFile) {
          await processEntry(fullPath);
        } else if (dirEntry.isDirectory) {
          await add(fullPath);
        }
      }
    }
  } else {
    await processEntry(fileOrDirectoryPath);
  }
}

// in processEntry check for duplication if have it just call updateIndex function not writeToIndex.

async function updateIndex(
  entry: string,
  lines: string[],
  lineIndex: number
): Promise<void> {
  lines[lineIndex] = entry;
  await Deno.writeTextFile(indexPath, lines.join("\n"));
}

//we can just simply give line parameter to updateIndex and make the process faster.

function checkIndexForDuplicateEntry(
  entryPath: string,
  lines: string[]
): { exists: boolean; lineIndex: number | null } {
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const parts = line.split(" ");
    if (parts.length === 3 && parts[2] === entryPath) {
      return { exists: true, lineIndex: i };
    }
  }
  return { exists: false, lineIndex: null };
}

async function processEntry(relativePath: string): Promise<void> {
  try {
    const entry = await createIndexEntry(relativePath);
    const indexContent = await Deno.readTextFile(indexPath);
    const lines = indexContent.split("\n");

    const { exists, lineIndex } = checkIndexForDuplicateEntry(
      relativePath,
      lines
    );
    if (!exists) {
      await writeToIndex(entry);
      console.log(`Added: ${relativePath}`);
    } else {
      if (lineIndex) await updateIndex(entry, lines, lineIndex);
      console.log(`Updated: ${relativePath}`);
    }
  } catch (error) {
    console.log(`Error processing: ${relativePath} - ${error}`);
  }
}

async function createIndexEntry(relativePath: string): Promise<string> {
  const permissions = getFilePermissions(relativePath);
  const hash = await computeFileHash(relativePath);
  const entry = `${permissions} ${hash} ${relativePath}`;
  return entry;
}

async function writeToIndex(entry: string): Promise<void> {
  const indexPath = path.join(Deno.cwd(), ".tgit", "index");
  await Deno.writeTextFile(indexPath, entry + "\n", { append: true });
}

function getFilePermissions(relativePath: string): string {
  try {
    const fileInfo = Deno.lstatSync(relativePath);
    const permissions = fileInfo.mode?.toString(8).padStart(6, "0");
    return permissions || "000000";
  } catch (error) {
    throw new Error(`Failed to get permissions for ${relativePath}: ${error}`);
  }
}

async function computeFileHash(relativePath: string): Promise<string> {
  try {
    const fileContent = await Deno.readFile(relativePath);
    const hashBuffer = await crypto.subtle.digest("SHA-1", fileContent);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    const hashHex = hashArray
      .map((b) => b.toString(16).padStart(2, "0"))
      .join("");
    return hashHex;
  } catch (error) {
    throw new Error(
      `Error computing the hash for file ${relativePath} -${error}`
    );
  }
}

function isDirectory(relativePath: string): boolean {
  try {
    const fileInfo = Deno.lstatSync(relativePath);
    return fileInfo.isDirectory;
  } catch (error) {
    if (error instanceof Deno.errors.NotFound) {
      throw new Error(`Error: Path not found - ${relativePath}`);
    } else {
      throw new Error(`Error checking path: ${error}`);
    }
  }
}

function checkTgitDirectory(): void {
  const tgitDir = path.join(Deno.cwd(), ".tgit");
  try {
    const fileInfo = Deno.lstatSync(tgitDir);
    if (!fileInfo.isDirectory) {
      throw new Error(`fatal: .tgit exists but is not a directory`);
    }
  } catch (error) {
    if (error instanceof Deno.errors.NotFound) {
      throw new Error(
        "fatal: not a tgit repository (or any of the parent directories): .tgit"
      );
    } else {
      throw new Error(`Error checking .tgit directory: ${error}`);
    }
  }
}
