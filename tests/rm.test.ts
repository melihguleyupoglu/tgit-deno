import { expect } from "jsr:@std/expect";
import rm from "../src/commands/rm.ts";
import { cleanupTgitDir } from "./init.test.ts";
import init from "../src/commands/init.ts";
import add from "../src/commands/add.ts";

Deno.test(
  "remove command - should throw error if no .tgit found in the current dir",
  async () => {
    cleanupTgitDir();

    await expect(rm(" ")).rejects.toThrow(
      "fatal: not a tgit repository (or any of the parent directories): .tgit"
    );
  }
);

Deno.test(
  "remove command - should throw error if file or directory not found",
  async () => {
    try {
      init();
      await expect(rm("hello_world.txt")).rejects.toThrow(
        "File or directory: hello_world.txt does not exist."
      );
    } finally {
      cleanupTgitDir();
    }
  }
);

Deno.test(
  "remove command - should throw error if file is not found in staging area",
  async () => {
    try {
      init();
      Deno.writeTextFile("hello_world.txt", "hello world!");
      await expect(rm("hello_world.txt")).rejects.toThrow(
        "hello_world.txt is not found in staging area"
      );
    } finally {
      await Deno.remove("hello_world.txt");
      cleanupTgitDir();
    }
  }
);

Deno.test("remove command - file removal", async () => {
  const originalConsoleLog = console.log;
  const consoleSpy = { messages: [] as string[] };
  console.log = (message: string) => consoleSpy.messages.push(message);
  try {
    cleanupTgitDir();
    init();
    await Deno.writeTextFile("hello_world.txt", "Hello world\n");
    await add("hello_world.txt");
    await rm("hello_world.txt");
    expect(consoleSpy.messages).toContain(
      `hello_world.txt removed from staging area`
    );
  } finally {
    console.log = originalConsoleLog;
    cleanupTgitDir();
    await Deno.remove("hello_world.txt");
  }
});

Deno.test("remove command - directory removal", async () => {
  const originalConsoleLog = console.log;
  const consoleSpy = { messages: [] as string[] };
  console.log = (message: string) => consoleSpy.messages.push(message);
  try {
    cleanupTgitDir();
    init();
    Deno.mkdir("new_dir");
    Deno.writeTextFile("new_dir/hello_world.txt", "Hello world!\n");
    Deno.writeTextFile("new_dir/hello_moon.txt", "Hello Moon!\n");
    await add("new_dir");
    await rm("new_dir", true);
    expect(consoleSpy.messages).toContain(
      "new_dir/hello_world.txt removed from staging area"
    );
    expect(consoleSpy.messages).toContain(
      "new_dir/hello_moon.txt removed from staging area"
    );
  } catch (e) {
    throw e;
  } finally {
    console.log = originalConsoleLog;
    cleanupTgitDir();
    await Deno.remove("new_dir", { recursive: true });
  }
});

Deno.test(
  "remove command - should throw error if trying to remove directory with no recursive flag",
  async () => {
    try {
      init();
      await Deno.mkdir("hello");
      await Deno.writeTextFile("hello/hello_world.txt", "Hello world!\n");
      await add("hello");
      await expect(rm("hello")).rejects.toThrow(
        "Cannot remove directory: hello. Use --recursive option."
      );
    } finally {
      cleanupTgitDir();
      Deno.remove("hello", { recursive: true });
    }
  }
);
