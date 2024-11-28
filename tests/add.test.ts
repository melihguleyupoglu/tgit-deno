import { cleanupTgitDir } from "./init.test.ts";
import add from "../src/commands/add.ts";
import { expect } from "jsr:@std/expect";

Deno.test(
  "add command - should throw error if no .tgit found in the current dir",
  async () => {
    cleanupTgitDir();

    await expect(add(" ")).rejects.toThrow(
      "fatal: not a tgit repository (or any of the parent directories): .tgit"
    );
  }
);
