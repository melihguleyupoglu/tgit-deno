import * as path from "@std/path";

const configFilePath = path.join(Deno.cwd(), ".tgit", "config");

function ensureConfigFileExists() {
  try {
    Deno.statSync(configFilePath);
  } catch {
    Deno.writeTextFileSync(configFilePath, "");
  }
}

export default {
  set(key: string, value: string) {
    ensureConfigFileExists();
    const configContent = Deno.readTextFileSync(configFilePath);
    const lines = configContent.split("\n");
    const existingIndex = lines.findIndex((line) => line.startsWith(`${key}=`));
    if (existingIndex >= 0) {
      lines[existingIndex] = `${key} = ${value}`;
    } else {
      lines.push(`${key} = ${value}`);
    }
  },
  get(key: string) {},
  list() {},
};
