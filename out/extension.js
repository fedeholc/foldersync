"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.activate = activate;
exports.deactivate = deactivate;
exports.hashFile = hashFile;
exports.filesEqualByHash = filesEqualByHash;
// The module 'vscode' contains the VS Code extensibility API
// Import the module and reference it with the alias vscode in your code below
const node_crypto_1 = require("node:crypto");
const fs = __importStar(require("node:fs"));
const vscode = __importStar(require("vscode"));
// This method is called when your extension is activated
// Your extension is activated the very first time the command is executed
const APP_NAME = 'filesync';
const SETTINGS_NAMES = {
    globalEnabled: 'globalEnabled',
    filesToSync: 'filesToSync'
};
const DEFAULT_CONFIG_FILE_NAME = 'filesync.config.json';
let allFilesToSync = [];
function resolveConfiguredPath(configPath, workspaceFolders) {
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
            }
            catch (err) {
                // ignore and continue
            }
        }
        // If none exist, still return a path resolved against the first workspace folder
        return vscode.Uri.joinPath(workspaceFolders[0].uri, configPath).fsPath;
    }
    // No workspace to resolve against
    return null;
}
function normalizeFilesToSync(files, workspaceFolders) {
    const normalized = [];
    for (const [a, b] of files) {
        const ra = resolveConfiguredPath(a, workspaceFolders) || a;
        const rb = resolveConfiguredPath(b, workspaceFolders) || b;
        normalized.push([ra, rb]);
    }
    return normalized;
}
async function activate(context) {
    // Use an OutputChannel for non-intrusive logging
    const output = vscode.window.createOutputChannel(APP_NAME);
    output.appendLine('filesync extension activated');
    context.subscriptions.push(output);
    // Run startup tasks immediately when extension activates
    await runStartupTasks(output);
    // Sincronización al guardar archivos
    const syncing = new Set();
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
                }
                catch (err) {
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
function deactivate() { }
async function runStartupTasks(output) {
    const workspaceFolders = vscode.workspace.workspaceFolders;
    const filesToSyncFromWorkspace = vscode.workspace.getConfiguration(APP_NAME).get(SETTINGS_NAMES.filesToSync) || [];
    output.appendLine(`Workspace Configuration filesToSync: ${JSON.stringify(filesToSyncFromWorkspace)}`);
    filesToSyncFromWorkspace?.forEach((file) => {
        output.appendLine(`Syncing file: ${file[0]} with ${file[1]}`);
    });
    const configFileName = DEFAULT_CONFIG_FILE_NAME;
    if (workspaceFolders && workspaceFolders.length > 0) {
        output.appendLine(`Workspace folders: ${JSON.stringify(workspaceFolders)}`);
        let filesToSyncFromConfigFiles = [];
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
            }
            catch (err) {
                output.appendLine(`Error reading ${configFileName} in folder ${folder.name}: ${err}`);
            }
        }
        ;
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
    }
    else {
        output.appendLine('No workspace folder open');
    }
}
function hashFile(filePath) {
    return new Promise((resolve, reject) => {
        const hash = (0, node_crypto_1.createHash)('sha256');
        const stream = fs.createReadStream(filePath);
        stream.on('error', (err) => reject(err));
        stream.on('data', (chunk) => hash.update(chunk));
        stream.on('end', () => resolve(hash.digest('hex')));
    });
}
async function filesEqualByHash(aPath, bPath) {
    try {
        const [sa, sb] = await Promise.all([fs.promises.stat(aPath), fs.promises.stat(bPath)]);
        if (sa.size !== sb.size) {
            return false;
        }
        ; // rápido rechazo
        // Si quieres, puedes también comparar mtime para un shortcut, pero ojo con falsos positivos.
        // const mtimeDiff = Math.abs(sa.mtimeMs - sb.mtimeMs);
        // if (mtimeDiff === 0) return true;
        const [ha, hb] = await Promise.all([hashFile(aPath), hashFile(bPath)]);
        return ha === hb;
    }
    catch (err) {
        // si alguno no existe o hay error -> no son iguales (o maneja según necesites)
        return false;
    }
}
//# sourceMappingURL=extension.js.map