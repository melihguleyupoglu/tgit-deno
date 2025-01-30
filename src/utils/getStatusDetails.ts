export async function getStatusDetails() {
  let untrackedEntries: string[] = [];
  let newEntries: string[] = [];
  let deletedEntriesFromStagingArea: string[] = [];

  try {
    if (!Deno.statSync(".tgit").isDirectory) {
      return { untrackedEntries, newEntries, deletedEntriesFromStagingArea };
    }
    const commitEntries: Entry[] = await checkCommit();
  } catch (error) {
    return { untrackedEntries, newEntries, deletedEntriesFromStagingArea };
  }

  return { untrackedEntries, newEntries, deletedEntriesFromStagingArea };
}
