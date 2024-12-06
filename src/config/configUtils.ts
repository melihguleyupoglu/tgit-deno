import * as path from "@std/path";
const configFilePath = path.join(Deno.cwd(), ".tgit", "config");

export function ensureConfigFileExists() {
  try {
    Deno.statSync(configFilePath);
  } catch {
    Deno.writeTextFileSync(configFilePath, "");
  }
}

export function readConfigFile(): string {
  return Deno.readTextFileSync(configFilePath);
}
