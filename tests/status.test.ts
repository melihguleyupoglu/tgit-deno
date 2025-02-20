import { expect } from "jsr:@std/expect/expect";
import init from "../src/commands/init.ts";
import status from "../src/commands/status.ts";
import { cleanupTgitDir } from "./init.test.ts";
Deno.test("status command - empty staging area and commit", async () => {
  const consoleSpy = { messages: [] as string[] };
  const originalConsoleLog = console.log;
  console.log = (message: string) => consoleSpy.messages.push(message);

  cleanupTgitDir();
  try {
    init();
    await status();

    expect(consoleSpy.messages).toContain("No commits yet");
  } finally {
    console.log = originalConsoleLog;
    cleanupTgitDir();
  }
});

Deno.test("status command - changes to be committed", () => {});

Deno.test("status command - modified entries on working area", () => {});

Deno.test("status command - modified entries on staging area", () => {});
