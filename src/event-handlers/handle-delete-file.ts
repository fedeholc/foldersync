import * as vscode from 'vscode';
import * as fs from 'node:fs';
import { output, runStartupTasks } from '../extension';
import { DEFAULT_CONFIG_FILE_NAME } from '../types/types';
import { internalFileOperation, runAsInternal } from './internal-flags';

/**
 * Propagates deletions: when a file that participates in a sync pair is deleted,
 * its counterpart is also deleted (if it exists). Then mappings are rebuilt.
 */
export async function handleDidDeleteFiles(event: vscode.FileDeleteEvent, allFilesToSync: Map<string, string>): Promise<void> {
  if (internalFileOperation) { return; }

  let needsRescan = false;

  for (const uri of event.files) {
    const deletedPath = uri.fsPath;
    output.appendLine(`[delete] Detected deletion: ${deletedPath}`);

    // Config or workspace file -> just rescan
    if (deletedPath.endsWith(`/${DEFAULT_CONFIG_FILE_NAME}`) || deletedPath.endsWith(`\\${DEFAULT_CONFIG_FILE_NAME}`) || deletedPath.endsWith('.code-workspace')) {
      needsRescan = true;
      continue;
    }

    const counterpart = allFilesToSync.get(deletedPath);
    if (!counterpart) {
      continue; // not tracked
    }

    try {
      await runAsInternal(async () => {
        try {
          // If counterpart exists and is a file, delete it
          const stat = await fs.promises.stat(counterpart).catch(() => null);
          if (stat && stat.isFile()) {
            await vscode.workspace.fs.delete(vscode.Uri.file(counterpart), { recursive: false, useTrash: false });
            output.appendLine(`[delete] Propagated deletion to counterpart: ${counterpart}`);
          }
        } catch (err) {
          output.appendLine(`[delete] Error deleting counterpart ${counterpart}: ${err}`);
        }
      });
    } finally {
      needsRescan = true;
    }
  }

  if (needsRescan) {
    await runStartupTasks();
  }
}
