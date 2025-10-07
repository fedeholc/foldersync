import * as vscode from 'vscode';
import { output, runStartupTasks } from "../extension";
import { DEFAULT_CONFIG_FILE_NAME } from "../types/types";
import { filesEqualByHash } from '../helpers/helpers';
import * as path from 'node:path';
import * as fs from 'node:fs';
import { flashSyncMessage } from '../helpers/status-bar';

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
    // Destination directory should already exist; if not, report and skip to avoid creating unintended structure
    const destDir = path.dirname(fileDest);
    try {
      const stat = await fs.promises.stat(destDir);
      if (!stat.isDirectory()) {
        output.appendLine(`Destination directory is not a directory: ${destDir}. Skipping sync.`);
        return;
      }
    } catch (err) {
      output.appendLine(`Destination directory missing (${destDir}). Skipping sync to avoid silent creation.`);
      return;
    }

    // Use the documentPath as source, the other as destination
    try {
      const destUri = vscode.Uri.file(fileDest);

      // Check if destination file is already open in editor
      const openDestDoc = vscode.workspace.textDocuments.find(doc => doc.uri.fsPath === fileDest);

      if (openDestDoc) {
        // If file is open, use WorkspaceEdit to update its content
        const edit = new vscode.WorkspaceEdit();
        const fullRange = new vscode.Range(
          openDestDoc.lineAt(0).range.start,
          openDestDoc.lineAt(openDestDoc.lineCount - 1).range.end
        );
        edit.replace(destUri, fullRange, document.getText());
        await vscode.workspace.applyEdit(edit);
        await openDestDoc.save();
        output.appendLine(`Synchronized (open document) ${fileSrc} -> ${fileDest}`);
      } else {
        // If file is not open, use file system copy
        await vscode.workspace.fs.copy(vscode.Uri.file(fileSrc), destUri, { overwrite: true });
        output.appendLine(`Synchronized ${fileSrc} -> ${fileDest}`);
      }

      const fileName = path.basename(fileSrc);
      flashSyncMessage(`Synced ${fileName}`);
    } catch (err) {
      output.appendLine(`Error synchronizing ${fileSrc} -> ${fileDest}: ${err}`);
    }
  } else {
    output.appendLine(`Files are identical by hash. No action taken for ${fileSrc} -> ${fileDest}`);
  }
}
