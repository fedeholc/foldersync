import * as vscode from 'vscode';
import { output, runStartupTasks } from "../extension";
import { DEFAULT_CONFIG_FILE_NAME } from "../types/types";
import { filesEqualByHash } from '../helpers/helpers';

/**
 * Handles the event when a text document is saved. If the saved document is
 * part of the configured files to sync, it copies the content to the 
 * corresponding destination file. If the saved document is a configuration 
 * file or workspace settings file, it triggers a re-run of the startup tasks 
 * to update the synchronization settings. 
 * @param document The saved text document  
 * @param allFilesToSync A Map of source-destination file pairs to sync 
 * @returns {Promise<void>} 
 */
export async function handleOnDidSaveTextDocument(document: vscode.TextDocument, allFilesToSync: Map<string, string>): Promise<void> {

  const documentPath = document.uri.fsPath;
  output.appendLine(`Document saved: ${documentPath}`);

  // if saved file is a config file or workspace file, re-run startup tasks
  if (documentPath.endsWith(`/${DEFAULT_CONFIG_FILE_NAME}`) || documentPath.endsWith(`\\${DEFAULT_CONFIG_FILE_NAME}`) || documentPath.endsWith('.code-workspace')) {
    output.appendLine('Detected save of a config file or workspace settings file. Re-running startup tasks...');
    await runStartupTasks();
    return;
  }

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
}
