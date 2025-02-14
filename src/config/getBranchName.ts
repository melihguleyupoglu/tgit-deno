export default async function getBranchName() {
  const configContent = await Deno.readTextFile(".tgit/config");
  const branchName = configContent
    .split("\n")[1]
    .split("=")[1]
    .replace(/'/g, "")
    .trim();
  return branchName;
}
