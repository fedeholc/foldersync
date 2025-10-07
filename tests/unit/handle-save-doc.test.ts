import * as assert from 'assert';
import * as path from 'path';
import * as fs from 'fs';
import * as os from 'os';
import * as vscode from 'vscode';
import { handleOnDidSaveTextDocument } from '../../src/event-handlers/handle-save-doc';

suite('Handle Save Document Test Suite', () => {

  let tempDir: string;
  let testWorkspaceFolder: vscode.WorkspaceFolder;

  setup(async () => {
    // Create a temporary directory for testing
    tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'foldersync-save-test-'));

    // Mock workspace folder
    testWorkspaceFolder = {
      uri: vscode.Uri.file(tempDir),
      name: 'test-workspace',
      index: 0
    };
  });

  teardown(async () => {
    // Clean up temporary directory
    if (tempDir && fs.existsSync(tempDir)) {
      fs.rmSync(tempDir, { recursive: true, force: true });
    }
  });

  test('should skip when no files to sync', async () => {
    const filePath = path.join(tempDir, 'test.txt');
    fs.writeFileSync(filePath, 'content');

    const doc = await vscode.workspace.openTextDocument(filePath);
    const emptyMap = new Map<string, string>();

    // Should not throw
    await handleOnDidSaveTextDocument(doc, emptyMap);
    assert.ok(true, 'Function completed without error');
  });

  test('should skip when document is not in sync list', async () => {
    const filePath = path.join(tempDir, 'test.txt');
    const otherFilePath = path.join(tempDir, 'other.txt');
    fs.writeFileSync(filePath, 'content');
    fs.writeFileSync(otherFilePath, 'other content');

    const doc = await vscode.workspace.openTextDocument(filePath);
    const syncMap = new Map<string, string>();
    syncMap.set(otherFilePath, path.join(tempDir, 'destination.txt'));

    // Should not throw and should not sync
    await handleOnDidSaveTextDocument(doc, syncMap);
    assert.ok(true, 'Function completed without error');
  });

  test('should copy file when in sync list and different', async () => {
    const srcPath = path.join(tempDir, 'source.txt');
    const destPath = path.join(tempDir, 'destination.txt');

    fs.writeFileSync(srcPath, 'source content');
    fs.writeFileSync(destPath, 'different content');

    const doc = await vscode.workspace.openTextDocument(srcPath);
    const syncMap = new Map<string, string>();
    syncMap.set(srcPath, destPath);

    await handleOnDidSaveTextDocument(doc, syncMap);

    // Verify destination was updated
    const destContent = fs.readFileSync(destPath, 'utf-8');
    assert.strictEqual(destContent, 'source content');
  });

  test('should skip copy when files are identical', async () => {
    const srcPath = path.join(tempDir, 'source.txt');
    const destPath = path.join(tempDir, 'destination.txt');
    const content = 'identical content';

    fs.writeFileSync(srcPath, content);
    fs.writeFileSync(destPath, content);

    const initialMtime = fs.statSync(destPath).mtime;

    const doc = await vscode.workspace.openTextDocument(srcPath);
    const syncMap = new Map<string, string>();
    syncMap.set(srcPath, destPath);

    // Wait a bit to ensure mtime would change if file was modified
    await new Promise(resolve => setTimeout(resolve, 10));

    await handleOnDidSaveTextDocument(doc, syncMap);

    const finalMtime = fs.statSync(destPath).mtime;

    // Destination should not have been modified
    assert.strictEqual(initialMtime.getTime(), finalMtime.getTime());
  });

  test('should NOT create destination directory if it does not exist', async () => {
    const srcPath = path.join(tempDir, 'source.txt');
    const destDir = path.join(tempDir, 'new', 'nested', 'dir'); // do NOT create
    const destPath = path.join(destDir, 'destination.txt');

    fs.writeFileSync(srcPath, 'source content');

    const doc = await vscode.workspace.openTextDocument(srcPath);
    const syncMap = new Map<string, string>();
    syncMap.set(srcPath, destPath);

    await handleOnDidSaveTextDocument(doc, syncMap);

    // Destination directory should NOT be created anymore
    assert.ok(!fs.existsSync(destDir), 'Destination dir should not be auto-created');
    assert.ok(!fs.existsSync(destPath), 'Destination file should not be created when directory missing');
  });

  test('should skip sync when destination directory missing', async () => {
    const srcPath = path.join(tempDir, 'src2.txt');
    const destDir = path.join(tempDir, 'missingDir');
    const destPath = path.join(destDir, 'dest2.txt');

    fs.writeFileSync(srcPath, 'abc');
    const doc = await vscode.workspace.openTextDocument(srcPath);
    const syncMap = new Map<string, string>();
    syncMap.set(srcPath, destPath);
    await handleOnDidSaveTextDocument(doc, syncMap);
    assert.ok(!fs.existsSync(destDir));
    assert.ok(!fs.existsSync(destPath));
  });
});
