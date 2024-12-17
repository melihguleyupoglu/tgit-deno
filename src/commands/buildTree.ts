interface StagingAreaEntry {
  fileInfo: string;
  blob: string;
  path: string;
}

interface TreeView {
  [key: string]: {
    files: StagingAreaEntry[];
    directories: string[];
  };
}

async function buildTree(tree: TreeView, key: string): Promise<string> {
  const encoder = new TextEncoder();
  let fileHash = "";
  let treeHash = "";
  if (tree[key].directories.length === 0) {
    if (tree[key].files.length === 0) {
      return "";
    }
    for (const file of tree[key].files) {
      fileHash = fileHash.concat(
        file.fileInfo + " blob " + file.path + "\0" + file.blob
      );
    }
    const data = encoder.encode(fileHash);
    const hashBuffer = await crypto.subtle.digest("SHA-1", data);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    const hashHex = hashArray
      .map((b) => b.toString(16).padStart(2, "0"))
      .join("");
    treeHash = treeHash.concat(`040000 tree ${key}\0${hashHex}\n`);
    return treeHash;
  } else {
    // need to update key on treeHash entry in here
    for (const dir of tree[key].directories) {
      treeHash = treeHash + (await buildTree(tree, dir));
    }
  }

  const commitHash = encoder.encode(treeHash);
  const hashBuffer = await crypto.subtle.digest("SHA-1", commitHash);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  const hashHex = hashArray
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
  return hashHex;
}
