import { expect } from "jsr:@std/expect";
import rm from "../src/commands/rm.ts";
import { cleanupTgitDir } from "./init.test.ts";
Deno.test(
  "remove command - should throw error if no .tgit found in the current dir",
  async () => {
    cleanupTgitDir();

    await expect(rm(" ")).rejects.toThrow(
      "fatal: not a tgit repository (or any of the parent directories): .tgit"
    );
  }
);
