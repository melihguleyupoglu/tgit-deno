import init from "../src/commands/init.ts";
import * as fs from "@std/fs";

import { join } from "https://deno.land/std@0.197.0/path/mod.ts";

const tgitDir = join(Deno.cwd(), ".tgit");

Deno.test("init command - should create .tgit directory", () => {
  cleanupTgitDir();

  try {
    init();

    if (!fs.existsSync(tgitDir)) {
      throw new Error(createErrorMessage(".tgit", tgitDir));
    }

    const objectsPath = join(tgitDir, "objects");
    if (!fs.existsSync(objectsPath)) {
      throw new Error(createErrorMessage("directory 'objects'", objectsPath));
    }

    const refsPath = join(tgitDir, "refs");
    if (!fs.existsSync(refsPath)) {
      throw new Error(createErrorMessage("directory 'refs'", refsPath));
    }

    const headPath = join(tgitDir, "HEAD");
    if (!fs.existsSync(headPath)) {
      throw new Error(createErrorMessage("file 'head'", headPath));
    }

    const indexPath = join(tgitDir, "index");
    if (!fs.existsSync(indexPath)) {
      throw new Error(createErrorMessage("file 'index'", indexPath));
    }
  } finally {
    cleanupTgitDir();
  }
});

Deno.test(
  "init command - should not overwrite an existing .tgit directory",
  () => {
    // Cleanup before test
    cleanupTgitDir();

    fs.ensureDirSync(tgitDir);

    const consoleSpy = { messages: [] as string[] };
    const originalConsoleLog = console.log;
    console.log = (message: string) => consoleSpy.messages.push(message);

    try {
      init();

      if (!consoleSpy.messages.includes("Repository already initialized!")) {
        throw new Error(
          "Expected 'Repository already initialized!' log message not found!"
        );
      }
    } finally {
      console.log = originalConsoleLog; // Return console log functionality
    }

    // Cleanup after test
    cleanupTgitDir();
  }
);

function cleanupTgitDir() {
  if (fs.existsSync(tgitDir)) {
    Deno.removeSync(tgitDir, { recursive: true });
  }
}

function createErrorMessage(missingItem: string, location: string) {
  return `Expected ${missingItem} is missing in ${location}`;
}
