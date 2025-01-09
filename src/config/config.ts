import { writeConfigFile } from "./configUtils.ts";

export default {
  set(key: string, value: string, configContent: string) {
    const lines = configContent.split("\n");
    const existingIndex = lines.findIndex((line) =>
      line.startsWith(`\t${key}=`)
    );
    if (existingIndex >= 0) {
      lines[existingIndex] = `\t${key}='${value}'`;
    } else {
      console.log(key, value);
      console.log(`Invalid config`);
    }
    writeConfigFile(lines);
  },
  get(key: string, configContent: string) {
    const lines = configContent.split("\n");
    const existingIndex = lines.findIndex((line) => line.startsWith(`${key}:`));
    if (existingIndex >= 0) {
      console.log(lines[existingIndex]);
    } else {
      console.log(`No entry found for ${key}.`);
    }
  },
  list(configContent: string) {
    const lines = configContent.split("\n");
    const userConfigLines = lines.findIndex((line) =>
      line.startsWith("[user]")
    );
    if (userConfigLines >= 0) {
      console.log(lines.splice(userConfigLines + 1));
    } else {
      console.log("No user configs found");
    }
  },
};
