import * as vscode from 'vscode';
import { getFilesToSyncFromConfigFiles, getFilesToSyncFromWorkspace, } from './helpers/helpers';
import { FsTreeProvider, } from './fs-tree/fs-tree';
import { APP_NAME, FsTreeElement, FilePairArray, FolderPairArray, FilePairMap } from './types/types';
import { handleOnDidSaveTextDocument } from './event-handlers/handle-save-doc';
import { handleDidCreateFiles } from './event-handlers/handle-create-file';

export let fsTree: FsTreeElement[] = [];
export let allFilesToSync: FilePairMap = new Map();
export let fsTreeProvider: FsTreeProvider = new FsTreeProvider(fsTree);
export const CONFIG_FOLDER_PAIRS_NAME = "folderPairs";

export const output = vscode.window.createOutputChannel(APP_NAME);

export async function activate(context: vscode.ExtensionContext) {

	output.appendLine('foldersync extension activated');
	context.subscriptions.push(output);

	// Run startup tasks immediately when extension activates
	await runStartupTasks();

	// Register tree view provider and create a TreeView so we can react to visibility changes
	const treeView = vscode.window.createTreeView('foldersync.syncView', { treeDataProvider: fsTreeProvider });
	context.subscriptions.push(treeView);

	// Register command to refresh the tree view
	context.subscriptions.push(vscode.commands.registerCommand('foldersync.refreshView', async () => {
		await runStartupTasks();
		fsTreeProvider?.refresh();
	}));

	// Register command to open the foldersync tree view
	context.subscriptions.push(vscode.commands.registerCommand('foldersync.openView', () => {
		// Open the view container registered in package.json (id: foldersync_container)
		vscode.commands.executeCommand('workbench.view.extension.foldersync_container');
	}));

	// Listen for file save events
	const saveListener = vscode.workspace.onDidSaveTextDocument((document) => handleOnDidSaveTextDocument(document, allFilesToSync));
	context.subscriptions.push(saveListener);

	// Listen for new file creation events
	const saveNewFileListener = vscode.workspace.onDidCreateFiles(handleDidCreateFiles);
	context.subscriptions.push(saveNewFileListener);

	// Update tree provider after startup tasks resolved
	fsTreeProvider?.setTree(fsTree);
}

// This method is called when the extension is deactivated
export function deactivate() { }


/**
 * Runs the startup tasks to initialize the file synchronization settings.
 * It reads the workspace and configuration files to determine which files
 * and folders need to be synchronized. It updates the global allFilesToSync
 * map and the fsTree structure used by the tree view provider. 
 * If any errors occur during the process, they are logged to the output 
 * channel.
 * @returns {Promise<void>}
 */
export async function runStartupTasks() {

	output.appendLine('Running startup tasks...');
	const { filesMap: filesFromWorkspace, fsTree: workspaceFsTree } = await getFilesToSyncFromWorkspace();

	fsTree = [];

	if (workspaceFsTree) {
		fsTree.push(workspaceFsTree);
	}

	const { filesMap: filesFromConfig, fsTree: configFsTree } = await getFilesToSyncFromConfigFiles();

	if (configFsTree) {
		fsTree.push(configFsTree);
	}

	allFilesToSync = new Map<string, string>([...filesFromWorkspace, ...filesFromConfig]);
	output.appendLine(`Total files to sync: ${allFilesToSync.size}`);
	fsTreeProvider?.setTree(fsTree);
}

