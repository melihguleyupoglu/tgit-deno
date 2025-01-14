export default async function status() {
  const currentBranchName = (await Deno.readTextFile(".tgit/HEAD")).split(
    "/"
  )[2];
  console.log(`On branch ${currentBranchName}`);
  let ignoreContent = [] as string[];
  if (await Deno.lstat(".tgitignore")) {
    ignoreContent = (await Deno.readTextFile(".tgitignore")).split("\n");
  }
  for await (const file of Deno.readDir("")) {
    if (file.name in ignoreContent) {
      continue;
    } else {
      await checkForToBeCommitted(file.name);
    }
  }
}

async function checkForToBeCommitted(fileName: string): Promise<void> {
  const indexContent = await Deno.readTextFile(".tgit/index");
  const mtime = (await Deno.lstat(fileName)).mtime ?? 0;
  const lines = indexContent.split("\n");
  console.log("Changes to be committed:\n");
  for (const entry of lines) {
    if (entry[2] === fileName && entry[3] !== mtime.toString()) {
      console.log(`\tmodified: ${fileName}\n`);
    }
    // else if()
  }
}

async function checkForNotStaged(fileName: string): Promise<void> {}
