import { getCurrentBranchName } from "./branchUtils.ts";

export async function getParentCommitHash() {
  const currentBranch = await getCurrentBranchName();
  const path = `.tgit/refs/heads/${currentBranch}`.trim();
  const previousCommitHash = await Deno.readTextFile(path);

  console.log(previousCommitHash);
}
