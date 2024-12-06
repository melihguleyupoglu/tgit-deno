import * as path from "@std/path";

export default {
  set(key: string, value: string, configContent: string) {
    const lines = configContent.split("\n");
    const existingIndex = lines.findIndex((line) => line.startsWith(`${key}=`));
    if (existingIndex >= 0) {
      lines[existingIndex] = `${key} = ${value}`;
    } else {
      lines.push(`${key} = ${value}`);
    }
  },
  get(key: string, configContent: string) {},
  list(configContent: string) {},
};
