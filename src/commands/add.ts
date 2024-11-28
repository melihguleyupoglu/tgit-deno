import * as path from "@std/path";
import { ensureFile } from "@std/fs/ensure-file";

export default async function add(fileOrDirectoryPath: string): Promise<void> {
  checkTgitDirectory();

  if (fileOrDirectoryPath === "." || isDirectory(fileOrDirectoryPath)) {
    for await (const dirEntry of Deno.readDir(fileOrDirectoryPath)) {
      const fullPath = path.join(fileOrDirectoryPath, dirEntry.name);
      const relativePath = path.relative(Deno.cwd(), fullPath);
      const fileInfo = await Deno.lstat(relativePath);
      const isSymlink = fileInfo.isSymlink;

      if (!isSymlink) {
        if (dirEntry.isFile) {
          await processEntry(relativePath);
        } else if (dirEntry.isDirectory) {
          await add(relativePath);
        }
      }
    }
  } else {
    await processEntry(fileOrDirectoryPath);
  }
}

async function processEntry(relativePath: string): Promise<void> {
  try {
    const entry = await createIndexEntry(relativePath);
    await writeToIndex(entry);
    console.log(`Added: ${relativePath}`);
  } catch (error) {
    console.log(`Error processing: ${relativePath} - ${error}`);
  }
}

async function createIndexEntry(fileOrDirectoryPath: string): Promise<string> {
  const permissions = getFilePermissions(fileOrDirectoryPath);
  const hash = await computeFileHash(fileOrDirectoryPath);
  const entry = `${permissions} ${hash} ${fileOrDirectoryPath}`;
  return entry;
}

async function writeToIndex(entry: string): Promise<void> {
  const indexPath = path.join(Deno.cwd(), ".tgit", "index");
  await ensureFile(indexPath);
  await Deno.writeTextFile(indexPath, entry + "\n", { append: true });
}

function getFilePermissions(fileOrDirectoryPath: string): string {
  try {
    const fileInfo = Deno.lstatSync(fileOrDirectoryPath);
    const permissions = fileInfo.mode?.toString(8).padStart(6, "0");
    return permissions || "000000";
  } catch (error) {
    throw new Error(
      `Failed to get permissions for ${fileOrDirectoryPath}: ${error}`
    );
  }
}

async function computeFileHash(filePath: string): Promise<string> {
  try {
    const fileContent = await Deno.readFile(filePath);
    const hashBuffer = await crypto.subtle.digest("SHA-1", fileContent);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    const hashHex = hashArray
      .map((b) => b.toString(16).padStart(2, "0"))
      .join("");
    return hashHex;
  } catch (error) {
    throw new Error(`Error computing the hash for file ${filePath} -${error}`);
  }
}

function isDirectory(fileOrDirectoryPath: string): boolean {
  try {
    const fileInfo = Deno.lstatSync(fileOrDirectoryPath);
    return fileInfo.isDirectory;
  } catch (error) {
    if (error instanceof Deno.errors.NotFound) {
      throw new Error(`Error: Path not found - ${fileOrDirectoryPath}`);
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
