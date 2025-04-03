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
    const filteredLines = lines.filter((line) => line.startsWith("\t"));
    const keyValuePairs = filteredLines.map((line) => {
      line = line.replace("\t", "");
      const [key, value] = line.split("=");
      return { key, value };
    });
    console.log(keyValuePairs);
  },
};
