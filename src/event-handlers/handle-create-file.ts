
import * as vscode from 'vscode';
import { allFilesToSync, output, runStartupTasks } from "../extension";
import { DEFAULT_CONFIG_FILE_NAME } from "../types/types";

/**
 * Handles the event when new files are created in the workspace. If any of the
 * created files is a configuration file or is located in a folder that is 
 * being synced, it triggers a re-run of the startup tasks to update the 
 * synchronization settings. 
 * @param event The file creation event containing details of the created files
 * @returns {Promise<void>}  
 */
export async function handleDidCreateFiles(event: vscode.FileCreateEvent): Promise<void> {

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