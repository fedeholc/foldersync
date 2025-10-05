import { APP_NAME, DEFAULT_CONFIG_FILE_NAME, FsTreeElement, SETTINGS_NAMES, FilePairArray, FolderPairArray } from "./types";
import * as vscode from 'vscode';
import * as fs from 'node:fs';
import * as path from 'node:path';
import { createHash } from 'node:crypto';
import { allFilesToSync, FilePairMap, fsTree, fsTreeProvider, output, runStartupTasks, } from "./extension";

export async function handleOnDidSaveTextDocument(document: vscode.TextDocument, allFilesToSync: Map<string, string>) {

  const documentPath = document.uri.fsPath;
  output.appendLine(`Document saved: ${documentPath}`);

  if (allFilesToSync.size === 0) {
    output.appendLine('No files to sync configured. Skipping.');
    return;
  }
  if (!allFilesToSync.get(documentPath)) {
    output.appendLine('Saved document is not in the sync list. Skipping.');
    return;
  }

  const fileSrc = documentPath;
  const fileDest = allFilesToSync.get(documentPath)!;


  // Check if files are different by hash. It's important to avoid
  // infinite loops of synchronization.
  const isSameHash = await filesEqualByHash(fileSrc, fileDest);

  if (!isSameHash) {
    //Use the documentPath as source, the other as destination

    try {
      await vscode.workspace.fs.copy(vscode.Uri.file(fileSrc), vscode.Uri.file(fileDest), { overwrite: true });

      output.appendLine(`Synchronized ${fileSrc} -> ${fileDest}`);
    } catch (err) {
      output.appendLine(`Error al sincronizar ${fileSrc} -> ${fileDest}: ${err}`);
    }
  } else {
    output.appendLine(`Files are identical by hash. No action taken for ${fileSrc} -> ${fileDest}`);
  }

  // esto funciona para que si se modifica alguno de los archivos de configuración vuelva procesarlos, pero probablemente sea poco eficiente y convenga tener una lista con los archivos de configuración y ver si el que se guardó está en esa lista

  // if saved file is a config file or workspace file, re-run startup tasks
  if (documentPath.endsWith(`/${DEFAULT_CONFIG_FILE_NAME}`) || documentPath.endsWith(`\\${DEFAULT_CONFIG_FILE_NAME}`) || documentPath.endsWith('.code-workspace')) {
    output.appendLine('Detected save of a config file or workspace settings file. Re-running startup tasks...');
    await runStartupTasks();

  }
}

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

    //TODO: acá hay un problema, si no está el par de archivos no toma nada, pero estaría bien que si hay uno lo tome y cree el otro, habría que ver si acá o al momento de sincronizar
    if (!ra || !rb) {
      // Skip invalid entries
      continue;
    }
    normalized.push([ra, rb]);
  }
  return normalized;
}

export function normalizeFoldersToSync(
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
    if (fs.existsSync(resolved)) {
      return resolved;
    }
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
export async function getFilesToSyncFromWorkspaceSettings(): Promise<{ allFilesToSync: FilePairMap, fsTree: FsTreeElement | null }> {

  output.appendLine('Retrieving files to sync from workspace settings');

  if (!vscode.workspace.workspaceFile) {
    output.appendLine('No workspace file found. Skipping workspace settings.');
    return { allFilesToSync: new Map, fsTree: null };
  }

  const foldersToSyncFromWorkspace: FolderPairArray = vscode.workspace.getConfiguration(APP_NAME).get(SETTINGS_NAMES.folderPairs) || [];


  const workspaceFileUri = vscode.workspace.workspaceFile;

  const fsTreeFromWorkspace: FsTreeElement = {
    name: 'from Workspace',
    type: 'container',
    children: []
  };

  if (workspaceFileUri) {
    const normalizedFolders = normalizeFoldersToSync(
      foldersToSyncFromWorkspace,
      workspaceFileUri
    );

    // For each folder pair, read files and add to filesToSyncFromWorkspace
    const { normalizedFilesToSync: filesFromFolders, fsTree: fsTreeFromFolders } = await getNormalizedFilesAndFsTreeFromFolders(normalizedFolders, output);
    fsTreeFromWorkspace.children?.push(...fsTreeFromFolders);

    return { allFilesToSync: filesFromFolders, fsTree: fsTreeFromWorkspace };
  }
  return { allFilesToSync: new Map, fsTree: null };

}

async function getNormalizedFilesAndFsTreeFromFolders(normalizedFolders: FolderPairArray, output: vscode.OutputChannel) {
  const normalizedFilesToSync: FilePairMap = new Map();
  const fsTree: FsTreeElement[] = [];
  for (const [folderA, folderB] of normalizedFolders) {
    try {
      const filesInA = await fs.promises.readdir(folderA);
      for (const fileName of filesInA) {
        const fileAPath = path.join(folderA, fileName);
        const fileBPath = path.join(folderB, fileName);
        // Check if it's a file (not a directory)
        const stat = await fs.promises.stat(fileAPath);
        if (stat.isFile()) {
          normalizedFilesToSync.set(fileAPath, fileBPath);
          normalizedFilesToSync.set(fileBPath, fileAPath);
        }
      }
      const filesInB = await fs.promises.readdir(folderB);
      for (const fileName of filesInB) {
        const fileAPath = path.join(folderA, fileName);
        const fileBPath = path.join(folderB, fileName);
        // Check if it's a file (not a directory)
        const stat = await fs.promises.stat(fileBPath);
        if (stat.isFile()) {

          normalizedFilesToSync.set(fileAPath, fileBPath);
          normalizedFilesToSync.set(fileBPath, fileAPath);

        }

      }
      // Add to fsTree
      const children: FsTreeElement[] = Array.from(normalizedFilesToSync.entries())
        .filter(([key, value]) => key.startsWith(folderA) && value.startsWith(folderB))
        .map(([key, value]) => ({ name: `${path.basename(key)} <-> ${path.basename(value)}`, type: 'pair' }));
      // if children is empty, add a placeholder
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
      // Add an error element to the fsTree
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
  return { normalizedFilesToSync, fsTree };
}


/**
 * Gets the list of files to sync from the configuration files. FilePaths are
 * normalized against the config file location.
 * @param output Output channel for logging
 * @returns A promise that resolves to the list of files to sync, or null if none found
 */
export async function getFilesToSyncFromConfigFiles(): Promise<{ allFilesToSync: FilePairMap, fsTree: FsTreeElement | null }> {
  const workspaceFolders = vscode.workspace.workspaceFolders;

  if (!workspaceFolders || workspaceFolders.length === 0) {
    // No workspace folders
    return { allFilesToSync: new Map, fsTree: null };
  }
  const configFileName = DEFAULT_CONFIG_FILE_NAME;
  let normalizedFilesToSync: FilePairMap = new Map();
  const fsTreeFromConfigFiles: FsTreeElement = {
    name: 'from config files',
    type: 'container',
    children: []
  };

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



      const fileData = JSON.parse(jsonFileData.toString());

      if (Array.isArray(fileData.foldersToSync)) {
        const fsTreeFromFile: FsTreeElement = {
          name: 'from config file: ' + fileUri.fsPath,
          type: 'container',
          children: []
        };

        const normalizedFolders = normalizeFoldersToSync(fileData.foldersToSync, fileUri);
        const { normalizedFilesToSync: filesFromFolders, fsTree: fsTreeFromFolders } = await getNormalizedFilesAndFsTreeFromFolders(normalizedFolders, output);

        normalizedFilesToSync = new Map([...normalizedFilesToSync, ...filesFromFolders]);
        fsTreeFromFile.children?.push(...fsTreeFromFolders);
        fsTreeFromConfigFiles.children?.push(fsTreeFromFile);

      }

    } catch (err) {
      output.appendLine(`Error reading ${configFileName} in folder ${folder.name}: ${err}`);
    }
  };
  return { allFilesToSync: normalizedFilesToSync, fsTree: fsTreeFromConfigFiles };

}

async function checkFileExists(uri: vscode.Uri): Promise<boolean> {
  try {
    await vscode.workspace.fs.stat(uri);
    return true;
  } catch (error) {
    return false;
  }
}

export async function handleDidCreateFiles(event: vscode.FileCreateEvent) {

  // Check if any of the created files is a config file
  if (event.files.some(file => file.path.endsWith(`/${DEFAULT_CONFIG_FILE_NAME}`) || file.path.endsWith(`\\${DEFAULT_CONFIG_FILE_NAME}`))) {
    output.appendLine('Detected creation of a new config file. Re-running startup tasks...');
    await runStartupTasks();


  }

  // Check if any of the created files is a workspace settings file
  if (event.files.some(file => file.path.endsWith('.code-workspace'))) {
    output.appendLine('Detected creation of a new workspace settings file. Re-running startup tasks...');
    await runStartupTasks();


  }

  // check if any of the created files is in a folder that is being synced
  const foldersToSync = Array.from(allFilesToSync).map(pair => pair[0].substring(0, pair[0].lastIndexOf('/')));
  if (event.files.some(file => foldersToSync.some(folder => file.path.startsWith(folder)))) {
    output.appendLine('Detected creation of a new file in a synced folder. Re-running startup tasks...');
    await runStartupTasks();


  }
}