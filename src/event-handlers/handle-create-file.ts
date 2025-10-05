
import * as vscode from 'vscode';
import { allFilesToSync, output, runStartupTasks } from "../extension";
import { DEFAULT_CONFIG_FILE_NAME } from "../types/types";

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