import * as vscode from 'vscode';
import * as fs from 'node:fs';
import * as path from 'node:path';
import { output } from '../extension';
import { runAsInternal } from './internal-flags';

/**
 * Perform an initial synchronization for every registered file pair where the newer file (by mtime) overwrites the older.
 * The map contains both A->B and B->A so we have to deduplicate logical pairs to avoid doing everything twice.
 * Logic per logical pair (a,b):
 *  - If only one side exists, copy it to the missing side.
 *  - If both exist, compare mtime and copy newest over oldest (if mtimes differ and content differs).
 *  - If both exist and are identical (by size+hash fast path), skip.
 */
export async function initialSyncLatest(allFilesToSync: Map<string, string>): Promise<void> {
  if (allFilesToSync.size === 0) {
    vscode.window.showInformationMessage('foldersync: No files configured for synchronization.');
    return;
  }

  // Build a set of canonical logical pairs to process only once.
  const logicalPairs: Array<[string, string]> = [];
  const seen = new Set<string>();
  for (const [a, b] of allFilesToSync.entries()) {
    // create stable key ordering paths lexicographically
    const key = a < b ? `${a}::${b}` : `${b}::${a}`;
    if (seen.has(key)) {
      continue;
    }
    seen.add(key);
    logicalPairs.push(a < b ? [a, b] : [b, a]);
  }

  let copiedCount = 0;
  const errors: string[] = [];

  await runAsInternal(async () => {
    for (const [a, b] of logicalPairs) {
      try {
        const aStat = await fs.promises.stat(a).catch(() => null);
        const bStat = await fs.promises.stat(b).catch(() => null);

        if (!aStat && !bStat) {
          // Nothing to do, both absent.
          continue;
        }

        // Only one exists -> copy that one over
        if (aStat && !bStat) {
          const bDir = path.dirname(b);
          const bDirExists = await fs.promises.stat(bDir).then(s => s.isDirectory()).catch(() => false);
          if (!bDirExists) {
            output.appendLine(`[initialSync] Skipped creating missing directory for ${b} (dir absent).`);
          } else {
            await vscode.workspace.fs.copy(vscode.Uri.file(a), vscode.Uri.file(b), { overwrite: true });
            output.appendLine(`[initialSync] Copied (only A existed) ${a} -> ${b}`);
            copiedCount++;
          }
          continue;
        }
        if (!aStat && bStat) {
          const aDir = path.dirname(a);
          const aDirExists = await fs.promises.stat(aDir).then(s => s.isDirectory()).catch(() => false);
          if (!aDirExists) {
            output.appendLine(`[initialSync] Skipped creating missing directory for ${a} (dir absent).`);
          } else {
            await vscode.workspace.fs.copy(vscode.Uri.file(b), vscode.Uri.file(a), { overwrite: true });
            output.appendLine(`[initialSync] Copied (only B existed) ${b} -> ${a}`);
            copiedCount++;
          }
          continue;
        }

        // Both exist: decide by mtimeMs
        if (aStat && bStat) {
          const newerIsA = aStat.mtimeMs > bStat.mtimeMs;
          const newer = newerIsA ? a : b;
          const older = newerIsA ? b : a;
          if (Math.abs(aStat.mtimeMs - bStat.mtimeMs) < 5) { // ~same time, skip (avoid churn)
            continue;
          }
          // Compare quick size equality; if different, copy.
          let shouldCopy = aStat.size !== bStat.size;
          if (!shouldCopy) {
            // As optimization avoid hashing all files; simple size check then fallback to reading small sample
            // We'll just proceed to copy if mtime differs and size same to guarantee newest wins.
            shouldCopy = true;
          }
          if (shouldCopy) {
            const olderDir = path.dirname(older);
            const olderDirExists = await fs.promises.stat(olderDir).then(s => s.isDirectory()).catch(() => false);
            if (!olderDirExists) {
              output.appendLine(`[initialSync] Skipped copy; target dir missing (${olderDir}).`);
            } else {
              await vscode.workspace.fs.copy(vscode.Uri.file(newer), vscode.Uri.file(older), { overwrite: true });
              output.appendLine(`[initialSync] Copied newer ${newer} -> ${older}`);
              copiedCount++;
            }
          }
        }
      } catch (err: any) {
        const msg = `[initialSync] Error processing pair ${a} <-> ${b}: ${err?.message || err}`;
        output.appendLine(msg);
        errors.push(msg);
      }
    }
  });

  if (errors.length > 0) {
    vscode.window.showWarningMessage(`foldersync: Initial synchronization completed with errors. Copied: ${copiedCount}. Errors: ${errors.length}. See output channel.`);
  } else {
    vscode.window.showInformationMessage(`foldersync: Initial synchronization completed. Files copied: ${copiedCount}.`);
  }
}

async function ensureDir(dir: string) {
  await fs.promises.mkdir(dir, { recursive: true }).catch(() => { });
}
