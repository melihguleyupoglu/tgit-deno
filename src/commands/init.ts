import * as path from "@std/path";
import process from "node:process";
import { writeFileSync, mkdirSync, existsSync } from "node:fs";

export default function init() {
  const tgitDir = path.join(process.cwd(), ".tgit");

  if (existsSync(tgitDir)) {
    console.log("Repository already initialized!");
    return;
  } else {
    mkdirSync(tgitDir);
    mkdirSync(path.join(tgitDir, "objects"));
    mkdirSync(path.join(tgitDir, "refs"));
    mkdirSync(path.join(tgitDir, "refs/heads"));
    mkdirSync(path.join(tgitDir, "refs/tags"));
    mkdirSync(path.join(tgitDir, "refs/remotes"));

    writeFileSync(path.join(tgitDir, "index"), "");
    writeFileSync(path.join(tgitDir, "HEAD"), "ref: refs/heads/main\n");
    writeFileSync(path.join(tgitDir, ".tgitignore"), "");
    writeFileSync(
      path.join(tgitDir, "config"),
      "{\n\tdefaultBranch='main'\n\tusername=''\n\tuserMail=''\n}"
    );
    writeFileSync(path.join(tgitDir, "refs/heads/main"), "");

    console.log("Initialized empty tgit repository");
  }
}
