import { APP_NAME, DEFAULT_CONFIG_FILE_NAME, FsTreeElement, CONFIG_NAMES, FilePairArray, FolderPairArray, ConfigFile } from "../types/types";
import * as vscode from 'vscode';
import * as fs from 'node:fs';
import * as path from 'node:path';
import { createHash } from 'node:crypto';
import { allFilesToSync, fsTree, fsTreeProvider, output, runStartupTasks, } from "../extension";
import { FilePairMap } from "../types/types";


/**
 * Hashes a file using SHA-256.
 * @param filePath Path to the file to hash
 * @returns The hash of the file as a hex string
 */
export function hashFile(filePath: string): Promise<string> {
  return new Promise((resolve, reject) => {
    const hash = createHash('sha256');
    const stream = fs.createReadStream(filePath);
    stream.on('error', (err) => reject(err));
    stream.on('data', (chunk) => hash.update(chunk));
    stream.on('end', () => resolve(hash.digest('hex')));
  });
}

/**
 * Compares two files by their hash.
 * @param aPath Path to the first file
 * @param bPath Path to the second file
 * @returns True if the files are equal, false otherwise
 */
export async function filesEqualByHash(aPath: string, bPath: string): Promise<boolean> {
  try {
    // First check file sizes for a quick inequality check
    const [sa, sb] = await Promise.all([fs.promises.stat(aPath), fs.promises.stat(bPath)]);
    // If sizes are different, files are not equal
    if (sa.size !== sb.size) { return false; };
    // If sizes are the same, compare hashes
    const [ha, hb] = await Promise.all([hashFile(aPath), hashFile(bPath)]);
    return ha === hb;
  } catch (err) {
    // if there was an error (e.g. file not found), consider files not equal
    return false;
  }
}


/**
 * Normalizes an array of file pairs to sync by resolving their paths.
 * Normalization means: if a path is relative, it will be resolved against the
 * config file location.
 * @param files Array of file pairs to sync
 * @param configFileUri The URI of the config file (or workspace file) to resolve relative paths against
 * @returns Normalized array of file pairs
 */
export function normalizeFilesToSync(
  files: FilePairArray,
  configFileUri: vscode.Uri
): FilePairArray {
  const normalized: FilePairArray = [];
  for (const [a, b] of files) {
    const ra = getAbsoluteFilePath(a, configFileUri);
    const rb = getAbsoluteFilePath(b, configFileUri);

    if (!ra || !rb) {
      // Skip invalid entries
      continue;
    }
    normalized.push([ra, rb]);
  }
  return normalized;
}

/**
 * Normalizes an array of folder pairs to sync by resolving their paths.
 * Normalization means: if a path is relative, it will be resolved against the
 * config file location. 
 * @param folders Array of folder pairs to sync 
 * @param configFileUri The URI of the config file (or workspace file) to resolve relative paths against 
 * @returns Normalized array of folder pairs 
 */
export function normalizeFolders(
  folders: FolderPairArray,
  configFileUri: vscode.Uri
): FolderPairArray {
  const normalized: FolderPairArray = [];
  for (const [a, b] of folders) {
    const ra = getAbsoluteFilePath(a, configFileUri);
    const rb = getAbsoluteFilePath(b, configFileUri);
    if (!ra || !rb) {
      // Skip invalid entries
      continue;
    }
    normalized.push([ra, rb]);
  }
  return normalized;
}

/**
 * Gets the absolute file path for a given relative path and config file URI.
 * @param filePath The relative file path
 * @param configFileUri The URI of the config file
 * @returns The absolute file path, or null if it cannot be resolved
 */
function getAbsoluteFilePath(
  filePath: string,
  configFileUri: vscode.Uri
): string | null {

  if (!filePath || !configFileUri) {
    return null;
  }
  // If path is absolute, return as-is
  if (filePath && (filePath.startsWith('/') || filePath.match(/^[A-Za-z]:\\/))) {
    return filePath;
  }

  try {
    const baseDir = path.dirname(configFileUri.fsPath);
    const baseUri = vscode.Uri.file(baseDir);
    const resolved = vscode.Uri.joinPath(baseUri, filePath).fsPath;

    return resolved;
  } catch (err) {
    // ignore and continue to fallback
    return null;
  }
}

/**
 * Gets the list of files to sync from the workspace settings. The file paths
 * are normalized against the workspace file location.
 * @returns The list of files to sync from the workspace settings, or null if none found.
 */
export async function getFilesToSyncFromWorkspace(): Promise<{ filesMap: FilePairMap, fsTree: FsTreeElement | null }> {

  output.appendLine('Retrieving files to sync from workspace settings');

  // Get the workspace file URI
  const workspaceFileUri = vscode.workspace.workspaceFile;

  if (!workspaceFileUri) {
    output.appendLine('No workspace file found. Skipping workspace settings.');
    return { filesMap: new Map, fsTree: null };
  }

  const foldersToSyncFromWorkspace: FolderPairArray = vscode.workspace.getConfiguration(APP_NAME).get(CONFIG_NAMES.folderPairs) || [];

  const fsTreeFromWorkspace: FsTreeElement = {
    name: 'from Workspace',
    type: 'container',
    children: []
  };

  const normalizedFolders = normalizeFolders(
    foldersToSyncFromWorkspace,
    workspaceFileUri
  );

  // For each folder pair, read files and add to filesToSyncFromWorkspace
  const { normalizedFiles, fsTree } = await getNormalizedFilesAndFsTreeFromFolders(normalizedFolders, output);
  fsTreeFromWorkspace.children?.push(...fsTree);

  return { filesMap: normalizedFiles, fsTree: fsTreeFromWorkspace };


}

/**
 *  Given an array of folder pairs, reads the files in each folder and creates a map of file pairs to sync.
 * @param normalizedFolders Array of normalized folder pairs 
 * @param output Output channel for logging 
 * @returns An object containing the map of file pairs to sync and the corresponding fsTree structure 
 */
async function getNormalizedFilesAndFsTreeFromFolders(normalizedFolders: FolderPairArray, output: vscode.OutputChannel) {
  const normalizedFiles: FilePairMap = new Map();
  const fsTree: FsTreeElement[] = [];

  for (const [folderA, folderB] of normalizedFolders) {
    try {
      // Validate both folders exist; if either is missing, register an error node and skip.
      const folderAExists = await fs.promises.stat(folderA).then(s => s.isDirectory()).catch(() => false);
      const folderBExists = await fs.promises.stat(folderB).then(s => s.isDirectory()).catch(() => false);

      if (!folderAExists || !folderBExists) {
        const missing: string[] = [];
        if (!folderAExists) { missing.push(folderA); }
        if (!folderBExists) { missing.push(folderB); }
        const msg = `Skipping pair. Missing folder(s): ${missing.join(', ')}`;
        output.appendLine(`[config] ${msg}`);
        const folderTreeElement: FsTreeElement = {
          name: (folderA) + ' <-> ' + (folderB),
          type: 'folder-error',
          children: [{ name: msg, type: 'pair' }]
        };
        fsTree.push(folderTreeElement);
        continue; // Do not attempt to list / sync this pair
      }

      // Recursively collect relative file paths for both folders
      const relFilesA = await listRelativeFiles(folderA, output);
      const relFilesB = await listRelativeFiles(folderB, output);

      // Union of relative paths
      const allRelPaths = new Set<string>([...relFilesA, ...relFilesB]);

      // Build mappings (both directions) for each relative path
      for (const rel of allRelPaths) {
        const fullA = path.join(folderA, rel);
        const fullB = path.join(folderB, rel);

        // Determine if at least one side is a regular file
        const aIsFile = await isFile(fullA);
        const bIsFile = await isFile(fullB);
        if (!aIsFile && !bIsFile) { continue; }

        // Set pairing even if one side doesn't yet exist (so first save creates counterpart)
        normalizedFiles.set(fullA, fullB);
        normalizedFiles.set(fullB, fullA);
      }

      // Build children list for tree (forward direction only to avoid duplicates)
      const children: FsTreeElement[] = Array.from(allRelPaths)
        .map(rel => {
          const aPath = path.join(folderA, rel);
          const bPath = path.join(folderB, rel);
          // Only show if the forward mapping exists (it will) and at least one side is file
          return { name: `${rel} <-> ${rel}`, type: 'pair' as const };
        });

      if (children.length === 0) {
        children.push({ name: '(empty)', type: 'pair' });
      }

      const folderTreeElement: FsTreeElement = {
        name: (folderA) + ' <-> ' + (folderB),
        type: 'folder',
        children: children
      };
      fsTree.push(folderTreeElement);
    } catch (err) {
      output.appendLine(`Error reading folder ${folderA}: ${err}`);
      const errorElement: FsTreeElement = {
        name: `Error reading folder(s)`,
        type: 'pair'
      };
      const folderTreeElement: FsTreeElement = {
        name: (folderA) + ' <-> ' + (folderB),
        type: 'folder-error',
        children: [errorElement]
      };
      fsTree.push(folderTreeElement);
    }
  }
  return { normalizedFiles: normalizedFiles, fsTree };
}

/**
 * Recursively list all files under a root folder returning their relative paths.
 * If the folder does not exist, returns an empty set.
 */
async function listRelativeFiles(root: string, output: vscode.OutputChannel): Promise<Set<string>> {
  const results = new Set<string>();
  async function walk(current: string) {
    let entries: string[] = [];
    try {
      entries = await fs.promises.readdir(current);
    } catch (err) {
      // Folder may not exist yet; treat as empty
      return;
    }
    for (const entry of entries) {
      const abs = path.join(current, entry);
      let stat: fs.Stats;
      try {
        stat = await fs.promises.stat(abs);
      } catch (err) {
        continue; // skip unreadable
      }
      if (stat.isDirectory()) {
        await walk(abs);
      } else if (stat.isFile()) {
        const rel = path.relative(root, abs) || entry;
        // Normalize separators to forward slash for consistency in tree display
        results.add(rel.split(path.sep).join('/'));
      }
    }
  }
  await walk(root);
  return results;
}

/**
 * Checks whether a path exists and is a regular file.
 */
async function isFile(p: string): Promise<boolean> {
  try {
    const st = await fs.promises.stat(p);
    return st.isFile();
  } catch {
    return false;
  }
}


/**
 * Gets the list of files to sync from the configuration files. FilePaths are
 * normalized against the config file location.
 * @param output Output channel for logging
 * @returns A promise that resolves to the list of files to sync, or null if none found
 */
export async function getFilesToSyncFromConfigFiles(): Promise<{ filesMap: FilePairMap, fsTree: FsTreeElement | null }> {
  const workspaceFolders = vscode.workspace.workspaceFolders;

  if (!workspaceFolders || workspaceFolders.length === 0) {
    // No workspace folders
    return { filesMap: new Map, fsTree: null };
  }
  const configFileName = DEFAULT_CONFIG_FILE_NAME;
  let normalizedFilesToSync: FilePairMap = new Map();
  const fsTreeFromConfigFiles: FsTreeElement = {
    name: 'from config files',
    type: 'container',
    children: []
  };

  // iterate over each workspace folder and see if it has a configuration file
  for (const folder of workspaceFolders) {

    const folderUri = folder.uri;
    const fileUri = vscode.Uri.joinPath(folderUri, configFileName);
    const fileExists = await checkFileExists(fileUri);
    if (!fileExists) {
      output.appendLine(`No ${configFileName} found in folder ${folder.name}`);
      continue;
    }

    try {
      const jsonFileData = await vscode.workspace.fs.readFile(fileUri);
      const fileData: ConfigFile = JSON.parse(jsonFileData.toString());

      // if the configuration file has a folderPairs array, process it
      if (Array.isArray(fileData.folders)) {
        const fsTreeFromFile: FsTreeElement = {
          name: 'from config file: ' + fileUri.fsPath,
          type: 'container',
          children: []
        };

        const normalizedFolders = normalizeFolders(fileData.folders, fileUri);
        const { normalizedFiles: filesFromFolders, fsTree: fsTreeFromFolders } = await getNormalizedFilesAndFsTreeFromFolders(normalizedFolders, output);

        normalizedFilesToSync = new Map([...normalizedFilesToSync, ...filesFromFolders]);
        fsTreeFromFile.children?.push(...fsTreeFromFolders);
        fsTreeFromConfigFiles.children?.push(fsTreeFromFile);

      }

    } catch (err) {
      output.appendLine(`Error reading ${configFileName} in folder ${folder.name}: ${err}`);
    }
  };
  return { filesMap: normalizedFilesToSync, fsTree: fsTreeFromConfigFiles };

}

/**
 * Checks if a file exists at the given URI.
 * @param uri The URI of the file to check
 * @returns True if the file exists, false otherwise 
 */
async function checkFileExists(uri: vscode.Uri): Promise<boolean> {
  try {
    await vscode.workspace.fs.stat(uri);
    return true;
  } catch (error) {
    return false;
  }
}

