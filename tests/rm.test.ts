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

Deno.test("remove command - file removal", async () => {
  const originalConsoleLog = console.log;
  const consoleSpy = { messages: [] as string[] };
  console.log = (message: string) => consoleSpy.messages.push(message);
  try {
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
