import * as vscode from 'vscode';
import { statusBarItem } from '../extension';

let flashTimeout: NodeJS.Timeout | undefined;

/**
 * Flash a temporary message in the status bar next to the base label.
 * After delay it reverts to the base text.
 */
export function flashSyncMessage(message: string, durationMs = 3000) {
  if (!statusBarItem) { return; }
  const base = 'foldersync $(sync)';
  statusBarItem.text = `${base} - ${message}`;
  if (flashTimeout) {
    clearTimeout(flashTimeout);
  }
  flashTimeout = setTimeout(() => {
    if (statusBarItem) {
      statusBarItem.text = base;
    }
  }, durationMs);
}
