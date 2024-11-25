import init from "../src/commands/init.ts";
import * as fs from "@std/fs";

import { join } from "https://deno.land/std@0.197.0/path/mod.ts";

const tgitDir = join(Deno.cwd(), ".tgit");

Deno.test("init command - should create .tgit directory", () => {
  if (fs.existsSync(tgitDir)) {
    Deno.removeSync(tgitDir, { recursive: true });
  }

  // Init fonksiyonunu çalıştır
  init();

  // Kontroller
  if (!fs.existsSync(tgitDir)) throw new Error(".tgit directory not created!");
  if (!fs.existsSync(join(tgitDir, "HEAD")))
    throw new Error("HEAD file missing!");
  if (!fs.existsSync(join(tgitDir, "index")))
    throw new Error("index file missing!");
});

Deno.test(
  "init command - should not overwrite an existing .tgit directory",
  () => {
    // Mevcut bir `.tgit` klasörü oluştur
    fs.ensureDirSync(tgitDir);

    // Konsol çıktısını izlemek için
    const consoleSpy = { messages: [] as string[] };
    const originalConsoleLog = console.log;
    console.log = (message: string) => consoleSpy.messages.push(message);

    // Init fonksiyonunu çalıştır
    init();

    // Test: "Repository already initialized!" mesajını kontrol et
    if (!consoleSpy.messages.includes("Repository already initialized!")) {
      throw new Error(
        "Expected 'Repository already initialized!' log message not found!"
      );
    }

    // Konsolu eski haline döndür
    console.log = originalConsoleLog;
  }
);
