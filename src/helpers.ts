import { APP_NAME, DEFAULT_CONFIG_FILE_NAME, SETTINGS_NAMES, SettingsFilesToSync } from "./types";
import * as vscode from 'vscode';
import * as fs from 'node:fs';
import * as path from 'node:path';
import { createHash } from 'node:crypto';

export async function handleOnDidSaveTextDocument(document: vscode.TextDocument, output: vscode.OutputChannel, allFilesToSync: SettingsFilesToSync) {

  const documentPath = document.uri.fsPath;
  output.appendLine(`Document saved: ${documentPath}`);

  for (const [fileA, fileB] of allFilesToSync) {
    // check if the saved document is one of the files to sync
    if (documentPath !== fileA && documentPath !== fileB) {
      continue;
    }

    // Check if files are different by hash. It's important to avoid
    // infinite loops of synchronization.
    const isSameHash = await filesEqualByHash(fileA, fileB);

    if (!isSameHash) {
      //Use the documentPath as source, the other as destination
      const fileSrc = documentPath === fileA ? fileA : fileB;
      const fileDest = documentPath === fileA ? fileB : fileA;

      try {
        await vscode.workspace.fs.copy(vscode.Uri.file(fileSrc), vscode.Uri.file(fileDest), { overwrite: true });

        output.appendLine(`Synchronized ${fileSrc} -> ${fileDest}`);
      } catch (err) {
        output.appendLine(`Error al sincronizar ${fileA} -> ${fileB}: ${err}`);
      }
    }
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
 * @param configFileUri The URI of the config file (or workspace file)
 * @returns Normalized array of file pairs
 */
export function normalizeFilesToSync(
  files: SettingsFilesToSync,
  configFileUri: vscode.Uri
): SettingsFilesToSync {
  const normalized: SettingsFilesToSync = [];
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
    return null;
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
export async function getFilesToSyncFromWorkspaceSettings(): Promise<SettingsFilesToSync | null> {
  const filesToSyncFromWorkspace: SettingsFilesToSync = vscode.workspace.getConfiguration(APP_NAME).get(SETTINGS_NAMES.filesToSync) || [];

  const workspaceFileUri = vscode.workspace.workspaceFile;

  // normalize files 
  if (workspaceFileUri) {
    const normalizedFiles = normalizeFilesToSync(
      filesToSyncFromWorkspace,
      workspaceFileUri
    );
    return normalizedFiles;
  }

  return null;
}

/**
 * Gets the list of files to sync from the configuration files. FilePaths are
 * normalized against the config file location.
 * @param output Output channel for logging
 * @returns A promise that resolves to the list of files to sync, or null if none found
 */
export async function getFilesToSyncFromConfigFiles(output: vscode.OutputChannel): Promise<SettingsFilesToSync | null> {
  const workspaceFolders = vscode.workspace.workspaceFolders;

  if (!workspaceFolders || workspaceFolders.length === 0) {
    // No workspace folders
    return null;
  }
  const configFileName = DEFAULT_CONFIG_FILE_NAME;
  const normalizedFilesToSync: SettingsFilesToSync = [];

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

      output.appendLine(`filesync config file found in folder ${folder.name}`);
      output.appendLine(`Content: ${jsonFileData.toString()}`);

      const fileData = JSON.parse(jsonFileData.toString());

      if (Array.isArray(fileData.filesToSync)) {
        // normalize and add to allFilesToSync
        normalizedFilesToSync.push(...normalizeFilesToSync(fileData.filesToSync, fileUri));
      }

    } catch (err) {
      output.appendLine(`Error reading ${configFileName} in folder ${folder.name}: ${err}`);
    }
  };
  return normalizedFilesToSync;

}

async function checkFileExists(uri: vscode.Uri): Promise<boolean> {
  try {
    await vscode.workspace.fs.stat(uri);
    return true;
  } catch (error) {
    return false;
  }
}
