// The module 'vscode' contains the VS Code extensibility API
// Import the module and reference it with the alias vscode in your code below
import { createHash } from 'node:crypto';
import * as fs from 'node:fs';
import * as vscode from 'vscode';
// This method is called when your extension is activated
// Your extension is activated the very first time the command is executed

const APP_NAME = 'filesync' as const;

const SETTINGS_NAMES = {
	globalEnabled: 'globalEnabled',
	filesToSync: 'filesToSync'
} as const;

const DEFAULT_CONFIG_FILE_NAME = 'filesync.config.json' as const;

type SettingsFilesToSync = [string, string][];
type Settings = {
	[SETTINGS_NAMES.globalEnabled]: boolean;
	[SETTINGS_NAMES.filesToSync]: SettingsFilesToSync;
}

let allFilesToSync: SettingsFilesToSync = [];

function resolveConfiguredPath(configPath: string, workspaceFolders: readonly vscode.WorkspaceFolder[] | undefined): string | null {
	// If path is absolute, return as-is
	if (configPath && (configPath.startsWith('/') || configPath.match(/^[A-Za-z]:\\/))) {
		return configPath;
	}

	// Try resolving relative to any workspace folder (prefer first match)
	if (workspaceFolders && workspaceFolders.length > 0) {
		for (const folder of workspaceFolders) {
			const resolved = vscode.Uri.joinPath(folder.uri, configPath).fsPath;
			// Ensure the file exists before returning
			try {
				if (fs.existsSync(resolved)) {
					return resolved;
				}
			} catch (err) {
				// ignore and continue
			}
		}
		// If none exist, still return a path resolved against the first workspace folder
		return vscode.Uri.joinPath(workspaceFolders[0].uri, configPath).fsPath;
	}

	// No workspace to resolve against
	return null;
}

function normalizeFilesToSync(files: SettingsFilesToSync, workspaceFolders: readonly vscode.WorkspaceFolder[] | undefined): SettingsFilesToSync {
	const normalized: SettingsFilesToSync = [];
	for (const [a, b] of files) {
		const ra = resolveConfiguredPath(a, workspaceFolders) || a;
		const rb = resolveConfiguredPath(b, workspaceFolders) || b;
		normalized.push([ra, rb]);
	}
	return normalized;
}

export async function activate(context: vscode.ExtensionContext) {
	// Use an OutputChannel for non-intrusive logging
	const output = vscode.window.createOutputChannel(APP_NAME);
	output.appendLine('filesync extension activated');
	context.subscriptions.push(output);

	// Run startup tasks immediately when extension activates
	await runStartupTasks(output);

	// Sincronización al guardar archivos
	const syncing = new Set<string>();


	const saveListener = vscode.workspace.onDidSaveTextDocument(async (document) => {
		const documentPath = document.uri.fsPath;
		output.appendLine(`Document saved: ${documentPath}`);
		for (const [fileA, fileB] of allFilesToSync) {
			output.appendLine(`Checking pair: ${fileA} <-> ${fileB}`);
			// Solo sincroniza si el archivo guardado es uno de los origen (comparación absoluta)
			if (documentPath !== fileA && documentPath !== fileB) {
				continue;
			}
			const equal = await filesEqualByHash(fileA, fileB);
			output.appendLine(`Files equal by hash? ${equal}`);
			if (!equal) {
				// escribir
				const fileSrc = documentPath === fileA ? fileA : fileB;
				const fileDest = documentPath === fileA ? fileB : fileA;

				try {
					await vscode.workspace.fs.copy(vscode.Uri.file(fileSrc), vscode.Uri.file(fileDest), { overwrite: true });
					output.appendLine(`Archivo sincronizado: ${fileA} -> ${fileB}`);
				} catch (err) {
					output.appendLine(`Error al sincronizar ${fileA} -> ${fileB}: ${err}`);
				}
			}


		}
	});
	context.subscriptions.push(saveListener);

	// Register the command as before
	const disposable = vscode.commands.registerCommand('filesync.helloWorld', async () => {
		vscode.window.showInformationMessage('Hello World from filesync!');
		//runStartupTasks(output);
	});

	context.subscriptions.push(disposable);
}

// This method is called when your extension is deactivated
export function deactivate() { }

async function runStartupTasks(output: vscode.OutputChannel) {
	const workspaceFolders = vscode.workspace.workspaceFolders;

	const filesToSyncFromWorkspace: SettingsFilesToSync = vscode.workspace.getConfiguration(APP_NAME).get(SETTINGS_NAMES.filesToSync) || [];

	output.appendLine(`Workspace Configuration filesToSync: ${JSON.stringify(filesToSyncFromWorkspace)}`);

	filesToSyncFromWorkspace?.forEach((file) => {
		output.appendLine(`Syncing file: ${file[0]} with ${file[1]}`);
	});

	const configFileName = DEFAULT_CONFIG_FILE_NAME;

	if (workspaceFolders && workspaceFolders.length > 0) {
		output.appendLine(`Workspace folders: ${JSON.stringify(workspaceFolders)}`);

		let filesToSyncFromConfigFiles: SettingsFilesToSync = [];


		for (const folder of workspaceFolders) {
			const folderUri = folder.uri;
			const fileUri = vscode.Uri.joinPath(folderUri, configFileName);

			try {
				const data = await vscode.workspace.fs.readFile(fileUri);

				const json = JSON.parse(data.toString());
				output.appendLine(`Read from ${configFileName} in folder ${folder.name}: ${JSON.stringify(json)}`);
				if (Array.isArray(json.filesToSync)) {
					filesToSyncFromConfigFiles.push(...json.filesToSync);
				}
			} catch (err) {
				output.appendLine(`Error reading ${configFileName} in folder ${folder.name}: ${err}`);
			}
		};

		output.appendLine(`Final accumulated filesToSync from config files: ${JSON.stringify(filesToSyncFromConfigFiles)}`);

		// Normalize configured paths (user may have provided workspace-relative paths)
		allFilesToSync = normalizeFilesToSync([...filesToSyncFromWorkspace, ...filesToSyncFromConfigFiles], workspaceFolders);
		output.appendLine(`All files to sync: ${JSON.stringify(allFilesToSync)}`);
		// Additionally, read from the

		/* 	const folderUri = workspaceFolders[0].uri;
			const fileUri = vscode.Uri.joinPath(folderUri, configFileName);
			vscode.workspace.fs.readFile(fileUri).then((data) => {
				const json = JSON.parse(data.toString());
				output.appendLine(`Read from ${configFileName}: ${JSON.stringify(json)}`);
			}, (err) => {
				output.appendLine(`Error reading ${configFileName}: ${err}`);
			}); */
	} else {
		output.appendLine('No workspace folder open');
	}
}

export function hashFile(filePath: string): Promise<string> {
	return new Promise((resolve, reject) => {
		const hash = createHash('sha256');
		const stream = fs.createReadStream(filePath);
		stream.on('error', (err) => reject(err));
		stream.on('data', (chunk) => hash.update(chunk));
		stream.on('end', () => resolve(hash.digest('hex')));
	});
}

export async function filesEqualByHash(aPath: string, bPath: string): Promise<boolean> {
	try {
		const [sa, sb] = await Promise.all([fs.promises.stat(aPath), fs.promises.stat(bPath)]);
		if (sa.size !== sb.size) { return false; }; // rápido rechazo

		// Si quieres, puedes también comparar mtime para un shortcut, pero ojo con falsos positivos.
		// const mtimeDiff = Math.abs(sa.mtimeMs - sb.mtimeMs);
		// if (mtimeDiff === 0) return true;

		const [ha, hb] = await Promise.all([hashFile(aPath), hashFile(bPath)]);
		return ha === hb;
	} catch (err) {
		// si alguno no existe o hay error -> no son iguales (o maneja según necesites)
		return false;
	}
}