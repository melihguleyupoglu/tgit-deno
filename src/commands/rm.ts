import * as path from "@std/path";
import { checkTgitDirectory } from "./add.ts";
import { indexPath } from "./add.ts";

export default async function rm(
  relativePath: string,
  recursiveOption: boolean = false
): Promise<void> {
  checkTgitDirectory();
  const normalizedPath = path.normalize(relativePath);
  const fileInfo = await checkPath(normalizedPath);

  if (fileInfo.isFile) {
    const indexContent = await Deno.readTextFile(indexPath);
    const lines = indexContent.split("\n");
    const { exists, lineNumber } = checkEntryOnIndex(lines, relativePath);
    if (exists && lineNumber !== null) {
      removeFileFromStaging(lineNumber, lines);
    }
  }
  if (fileInfo.isDirectory) {
    if (!recursiveOption) {
      throw new Error(
        `Cannot remove directory: ${relativePath}. Use --recursive option.`
      );
    }
    try {
      for await (const file of Deno.readDir(relativePath)) {
        const fullPath = path.join(relativePath, file.name);
        await rm(fullPath, true);
      }
    } catch (e) {
      if (e instanceof Deno.errors.NotFound) {
        console.error(`Error: ${relativePath} does not exist.`);
      }
    }
  }
}

async function removeFileFromStaging(lineNumber: number, lines: string[]) {
  try {
    const removedLine = lines.splice(lineNumber, 1);
    const file = removedLine[0].split(" ")[2];
    console.log(file);
    if (file.length > 0) {
      console.log(`${file} removed from staging area`);
    }
    await Deno.writeTextFile(indexPath, lines.join("\n"));
  } catch (e) {
    console.error(e);
  }
}

function checkEntryOnIndex(
  lines: string[],
  entry: string
): { exists: boolean; lineNumber: number | null } {
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const parts = line.split(" ");
    if (parts.length === 3 && parts[2] === entry) {
      return { exists: true, lineNumber: i };
    }
  }
  return { exists: false, lineNumber: null };
}

async function checkPath(relPath: string): Promise<Deno.FileInfo> {
  try {
    const fileInfo = await Deno.lstat(relPath);
    return fileInfo;
  } catch (e) {
    if (e instanceof Deno.errors.NotFound) {
      throw new Error(`File or directory: ${relPath} does not exist.`);
    } else {
      throw e;
    }
  }
}
