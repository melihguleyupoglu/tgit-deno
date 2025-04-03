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

export function writeConfigFile(lines: string[]): void {
  Deno.writeTextFileSync(configFilePath, lines.join("\n"));
}

export function getUsername(): string {
  const config = readConfigFile();
  const lines = config.split("\n");
  const usernameLine = lines.find((line) => line.startsWith("username="));
  if (!usernameLine) {
    throw new Error("Username not found");
  }
  return usernameLine.split("=")[1];
}

export function getUserMail(): string {
  const config = readConfigFile();
  const lines = config.split("\n");
  const userMailLine = lines.find((line) => line.startsWith("userMail="));
  if (!userMailLine) {
    throw new Error("User mail not found");
  }
  return userMailLine.split("=")[1];
}
