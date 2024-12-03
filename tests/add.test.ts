import { cleanupTgitDir } from "./init.test.ts";
import add from "../src/commands/add.ts";
import init from "../src/commands/init.ts";
import { expect } from "jsr:@std/expect";
import * as path from "@std/path";
import { writeFileSync } from "node:fs";
import process from "node:process";

const tgitPath = path.join(Deno.cwd(), ".tgit");

Deno.test(
  "add command - should throw error if no .tgit found in the current dir",
  async () => {
    cleanupTgitDir();

    await expect(add(" ")).rejects.toThrow(
      "fatal: not a tgit repository (or any of the parent directories): .tgit"
    );
  }
);

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

    expect(consoleSpy.messages).toContain(`Added: ${examplePath}`);
    expect(consoleSpy.messages).toContain(`Added: ${examplePathTwo}`);
  } catch (e) {
    console.error(e);
  } finally {
    console.log = originalConsoleLog;

    Deno.removeSync("ex_dir", { recursive: true });
    Deno.removeSync(tgitPath, { recursive: true });
  }
});

Deno.test("add command - should add file to index", async () => {
  init();

  const originalConsoleLog = console.log;
  const consoleSpy = { messages: [] as string[] };
  console.log = (message: string) => consoleSpy.messages.push(message);

  try {
    const exampleFilePath = path.join(process.cwd(), "example_file.txt");
    writeFileSync(exampleFilePath, "Hello world from test module");
    await add(exampleFilePath);

    expect(consoleSpy.messages).toContain(`Added: ${exampleFilePath}`);
  } catch (e) {
    console.error(e);
  } finally {
    console.log = originalConsoleLog;

    Deno.removeSync("example_file.txt");
    Deno.removeSync(tgitPath, { recursive: true });
  }
});

Deno.test("add command - should update changed files in index", () => {
  init();

  const originalConsoleLog = console.log;
  const consoleSpy = { messages: [] as string[] };
  console.log = (message: string) => consoleSpy.messages.push(message);
  try {
    const filePath = path.join(process.cwd(), "example_file.txt");
    writeFileSync(filePath, "hello");
    add(filePath);
    writeFileSync(filePath, "hello world");
    add(filePath);
    expect(consoleSpy.messages).toContain(`Updated: ${filePath}`);
  } catch (e) {
    console.error(e);
  } finally {
    console.log = originalConsoleLog;

    Deno.removeSync("example_file.txt");
    Deno.removeSync(tgitPath, { recursive: true });
  }
});

Deno.test("add command - should handle binary files", async () => {
  init();

  const originalConsoleLog = console.log;
  const consoleSpy = { messages: [] as string[] };
  console.log = (message: string) => consoleSpy.messages.push(message);

  try {
    const binaryFilePath = path.join(Deno.cwd(), "image.png");
    const binaryContent = new Uint8Array([0x89, 0x50, 0x4e, 0x48]);
    Deno.writeFileSync(binaryFilePath, binaryContent);

    await add(binaryFilePath);

    expect(consoleSpy.messages).toContain(`Added: ${binaryFilePath}`);
  } catch (e) {
    console.error(e);
  } finally {
    console.log = originalConsoleLog;
    Deno.removeSync("image.png");
    Deno.removeSync(tgitPath, { recursive: true });
  }
});

// ensure about index format of each file

// multiple files in single command

// if same file and same content make sure that nothing changed

// if index is read only check if throws an error

// parallel add commands
