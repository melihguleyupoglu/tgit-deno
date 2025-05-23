import * as path from "@std/path";

export const indexPath = path.join(Deno.cwd(), ".tgit", "index");

export default async function add(fileOrDirectoryPath: string): Promise<void> {
  checkTgitDirectory();
  await checkPath(fileOrDirectoryPath);

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

function checkIndexForDuplicateEntry(
  entryPath: string,
  lines: string[]
): { exists: boolean; lineIndex: number | null; indexMTime: string | null } {
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const parts = line.split(" ");
    if (parts.length === 4 && parts[2] === entryPath) {
      return { exists: true, lineIndex: i, indexMTime: parts[3] };
    }
  }
  return { exists: false, lineIndex: null, indexMTime: null };
}

async function processEntry(relativePath: string): Promise<void> {
  try {
    let entry = await createIndexEntry(relativePath);
    const indexContent = await Deno.readTextFile(indexPath);
    const lines = indexContent.split("\n");
    const fileSystemMTime =
      (await Deno.lstat(relativePath)).mtime?.valueOf() ?? 0;

    const { exists, lineIndex, indexMTime } = checkIndexForDuplicateEntry(
      relativePath,
      lines
    );

    if (lineIndex && fileSystemMTime.toString() === indexMTime) {
      console.log(`${relativePath} already in staging area`);
    }
    const hash = await computeFileHash(relativePath);
    entry = entry.replace("hash", hash);
    if (!exists) {
      await writeToIndex(entry);
      console.log(`Added: ${relativePath}`);
    } else if (lineIndex && fileSystemMTime.toString() !== indexMTime) {
      console.log(fileSystemMTime, indexMTime);
      await updateIndex(entry, lines, lineIndex);
      console.log(`Updated: ${relativePath}`);
    }
  } catch (error) {
    console.log(`Error processing: ${relativePath} - ${error}`);
  }
}

async function createIndexEntry(relativePath: string): Promise<string> {
  const permissions = getFilePermissions(relativePath);
  const mtime = (await Deno.lstat(relativePath)).mtime?.valueOf() ?? 0;
  const entry = `${permissions} hash ${relativePath} ${mtime}`;
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

export async function computeFileHash(relativePath: string): Promise<string> {
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

async function checkPath(relativePath: string): Promise<void> {
  try {
    await Deno.stat(relativePath);
  } catch (e) {
    if (e instanceof Deno.errors.NotFound) {
      throw new Error(
        `${relativePath} not found in the current working directory`
      );
    }
    throw e;
  }
}

export function checkTgitDirectory(): void {
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

// async function checkIfModified(file: string) {
//   const mtime = (await Deno.lstat(file)).mtime?.valueOf() ?? 0;
//   const lines = (await Deno.readTextFile(indexPath)).split("\n");
//   for (const line of lines) {
//     if (line[2] === file && line[3] === mtime.toString()) {
//       return false;
//     } else if (line[2] === file && line[3] !== mtime.toString()) {
//       return true;
//     } else {
//       continue;
//     }
//   }
// }
