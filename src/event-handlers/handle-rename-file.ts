import * as vscode from 'vscode';
import * as path from 'node:path';
import * as fs from 'node:fs';
import { output, runStartupTasks } from '../extension';
import { DEFAULT_CONFIG_FILE_NAME } from '../types/types';
import { internalFileOperation, runAsInternal } from './internal-flags';

/**
 * Propagates renames: when a tracked file is renamed, its counterpart is renamed
 * to keep relative names aligned. After processing, mappings are rebuilt.
 */
export async function handleDidRenameFiles(event: vscode.FileRenameEvent, allFilesToSync: Map<string, string>): Promise<void> {
  if (internalFileOperation) { return; }

  let needsRescan = false;

  for (const { oldUri, newUri } of event.files) {
    const oldPath = oldUri.fsPath;
    const newPath = newUri.fsPath;
    output.appendLine(`[rename] Detected rename: ${oldPath} -> ${newPath}`);

    // Config/workspace rename -> rescan only
    if (oldPath.endsWith(`/${DEFAULT_CONFIG_FILE_NAME}`) || oldPath.endsWith(`\\${DEFAULT_CONFIG_FILE_NAME}`) || oldPath.endsWith('.code-workspace')) {
      needsRescan = true;
      continue;
    }

    const counterpartOld = allFilesToSync.get(oldPath);
    if (!counterpartOld) {
      continue; // not tracked
    }

    const newBase = path.basename(newPath);
    const counterpartDir = path.dirname(counterpartOld);
    const counterpartNew = path.join(counterpartDir, newBase);

    if (counterpartOld === counterpartNew) {
      continue; // name unchanged relative to counterpart
    }

    try {
      await runAsInternal(async () => {
        // Ensure directory exists (should, but be safe)
        await fs.promises.mkdir(counterpartDir, { recursive: true }).catch(() => { });
        const stat = await fs.promises.stat(counterpartOld).catch(() => null);
        if (stat && stat.isFile()) {
          await vscode.workspace.fs.rename(vscode.Uri.file(counterpartOld), vscode.Uri.file(counterpartNew), { overwrite: true });
          output.appendLine(`[rename] Propagated rename: ${counterpartOld} -> ${counterpartNew}`);
        } else {
          // If counterpart missing, nothing to rename; optional: create?
        }
      });
    } catch (err) {
      output.appendLine(`[rename] Error propagating rename ${counterpartOld} -> ${counterpartNew}: ${err}`);
    } finally {
      needsRescan = true;
    }
  }

  if (needsRescan) {
    await runStartupTasks();
  }
}
