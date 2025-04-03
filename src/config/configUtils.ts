import * as path from "@std/path";
const configFilePath = path.join(Deno.cwd(), ".tgit", "config");

export interface Author {
  username: string;
  mail: string;
}

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

export async function getAuthor(): Promise<Author> {
  const configPath = ".tgit/config";

  try {
    const configContent = await Deno.readTextFile(configPath);
    const lines = configContent.split("\n");
    let username = "";
    let mail = "";
    for (const line of lines) {
      if (line.trim().startsWith("username")) {
        username = line.split("=")[1].trim();
        username = username.replace(/'/g, "");
      } else if (line.trim().startsWith("userMail")) {
        mail = line.split("=")[1].trim();
        mail = mail.replace(/'/g, "");
      }
    }

    if (username.length > 0 && mail.length > 0) {
      return { username: username, mail: mail };
    } else {
      throw new Error(
        "Config file does not contain required author or mail fields."
      );
    }
  } catch (error) {
    console.error("Error reading config file:", error);
    throw error;
  }
}
