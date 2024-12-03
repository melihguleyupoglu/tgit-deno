import { cleanupTgitDir } from "./init.test.ts";
import add from "../src/commands/add.ts";
import init from "../src/commands/init.ts";
import { expect } from "jsr:@std/expect";
import * as path from "@std/path";
import { writeFileSync } from "node:fs";
import process from "node:process";

Deno.test(
  "add command - should throw error if no .tgit found in the current dir",
  async () => {
    cleanupTgitDir();

    await expect(add(" ")).rejects.toThrow(
      "fatal: not a tgit repository (or any of the parent directories): .tgit"
    );
  }
);

// directory
Deno.test("add commmand - should add all directory content ", async () => {
  init();

  const originalConsoleLog = console.log;
  const consoleSpy = { messages: [] as string[] };
  console.log = (message: string) => consoleSpy.messages.push(message);

  try {
    Deno.mkdirSync("ex_dir");
    const exampleText = "ex_text.txt";
    const exampleTextTwo = "ex_text_two.txt";

    const exampleDirPath = path.join(process.cwd(), "ex_dir");
    const examplePath = path.join(exampleDirPath, exampleText);
    const examplePathTwo = path.join(exampleDirPath, exampleTextTwo);

    writeFileSync(examplePath, "Hello from add.test.ts");
    writeFileSync(examplePathTwo, "Hello world from tgit project");

    await add(exampleDirPath);

    expect(consoleSpy).toContain(`Added: ${examplePath}`);
    expect(consoleSpy).toContain(`Added: ${examplePathTwo}`);
  } catch (e) {
    console.log(e);
  } finally {
    console.log = originalConsoleLog;

    Deno.removeSync("ex_dir", { recursive: true });
  }
});

// single file
// Deno.test("", () => {});

// same file updated on index

// ensure about index format of each file

// multiple files in single command

// if same file and same content make sure that nothing changed

// if index is read only check if throws an error

// parallel add commands
