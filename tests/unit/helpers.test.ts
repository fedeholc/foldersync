import * as assert from 'assert';
import * as path from 'path';
import * as fs from 'fs';
import * as os from 'os';
import * as vscode from 'vscode';
import {
  hashFile,
  filesEqualByHash,
  normalizeFilesToSync,
  normalizeFolders
} from '../../src/helpers/helpers';

suite('Helpers Test Suite', () => {

  let tempDir: string;

  setup(async () => {
    // Create a temporary directory for testing
    tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'foldersync-test-'));
  });

  teardown(async () => {
    // Clean up temporary directory
    if (tempDir && fs.existsSync(tempDir)) {
      fs.rmSync(tempDir, { recursive: true, force: true });
    }
  });

  suite('hashFile', () => {
    test('should hash a file correctly', async () => {
      const filePath = path.join(tempDir, 'test.txt');
      fs.writeFileSync(filePath, 'Hello, World!');

      const hash = await hashFile(filePath);
      assert.ok(hash);
      assert.strictEqual(typeof hash, 'string');
      assert.strictEqual(hash.length, 64); // SHA-256 produces 64 hex chars
    });

    test('should produce same hash for identical content', async () => {
      const file1 = path.join(tempDir, 'test1.txt');
      const file2 = path.join(tempDir, 'test2.txt');
      const content = 'Identical content';

      fs.writeFileSync(file1, content);
      fs.writeFileSync(file2, content);

      const hash1 = await hashFile(file1);
      const hash2 = await hashFile(file2);

      assert.strictEqual(hash1, hash2);
    });

    test('should produce different hash for different content', async () => {
      const file1 = path.join(tempDir, 'test1.txt');
      const file2 = path.join(tempDir, 'test2.txt');

      fs.writeFileSync(file1, 'Content A');
      fs.writeFileSync(file2, 'Content B');

      const hash1 = await hashFile(file1);
      const hash2 = await hashFile(file2);

      assert.notStrictEqual(hash1, hash2);
    });

    test('should reject for non-existent file', async () => {
      const filePath = path.join(tempDir, 'nonexistent.txt');
      await assert.rejects(async () => await hashFile(filePath));
    });
  });

  suite('filesEqualByHash', () => {
    test('should return true for identical files', async () => {
      const file1 = path.join(tempDir, 'test1.txt');
      const file2 = path.join(tempDir, 'test2.txt');
      const content = 'Same content for both files';

      fs.writeFileSync(file1, content);
      fs.writeFileSync(file2, content);

      const result = await filesEqualByHash(file1, file2);
      assert.strictEqual(result, true);
    });

    test('should return false for different files', async () => {
      const file1 = path.join(tempDir, 'test1.txt');
      const file2 = path.join(tempDir, 'test2.txt');

      fs.writeFileSync(file1, 'Content A');
      fs.writeFileSync(file2, 'Content B');

      const result = await filesEqualByHash(file1, file2);
      assert.strictEqual(result, false);
    });

    test('should return false when file sizes differ', async () => {
      const file1 = path.join(tempDir, 'test1.txt');
      const file2 = path.join(tempDir, 'test2.txt');

      fs.writeFileSync(file1, 'Short');
      fs.writeFileSync(file2, 'Much longer content here');

      const result = await filesEqualByHash(file1, file2);
      assert.strictEqual(result, false);
    });

    test('should return false when one file does not exist', async () => {
      const file1 = path.join(tempDir, 'test1.txt');
      const file2 = path.join(tempDir, 'nonexistent.txt');

      fs.writeFileSync(file1, 'Content');

      const result = await filesEqualByHash(file1, file2);
      assert.strictEqual(result, false);
    });

    test('should return false when both files do not exist', async () => {
      const file1 = path.join(tempDir, 'nonexistent1.txt');
      const file2 = path.join(tempDir, 'nonexistent2.txt');

      const result = await filesEqualByHash(file1, file2);
      assert.strictEqual(result, false);
    });
  });

  suite('normalizeFilesToSync', () => {
    test('should normalize relative paths', () => {
      const configPath = path.join(tempDir, 'config.json');
      const configUri = vscode.Uri.file(configPath);

      const files: [string, string][] = [
        ['./file1.txt', './file2.txt'],
        ['folder/file3.txt', 'folder/file4.txt']
      ];

      const normalized = normalizeFilesToSync(files, configUri);

      assert.strictEqual(normalized.length, 2);
      assert.ok(path.isAbsolute(normalized[0][0]));
      assert.ok(path.isAbsolute(normalized[0][1]));
      assert.ok(normalized[0][0].includes('file1.txt'));
      assert.ok(normalized[0][1].includes('file2.txt'));
    });

    test('should keep absolute paths unchanged', () => {
      const configPath = path.join(tempDir, 'config.json');
      const configUri = vscode.Uri.file(configPath);

      const absolutePath1 = path.join(tempDir, 'abs1.txt');
      const absolutePath2 = path.join(tempDir, 'abs2.txt');

      const files: [string, string][] = [
        [absolutePath1, absolutePath2]
      ];

      const normalized = normalizeFilesToSync(files, configUri);

      assert.strictEqual(normalized.length, 1);
      assert.strictEqual(normalized[0][0], absolutePath1);
      assert.strictEqual(normalized[0][1], absolutePath2);
    });

    test('should skip invalid entries', () => {
      const configPath = path.join(tempDir, 'config.json');
      const configUri = vscode.Uri.file(configPath);

      const files: [string, string][] = [
        ['', './file2.txt'],
        ['./file3.txt', '']
      ];

      const normalized = normalizeFilesToSync(files, configUri);

      assert.strictEqual(normalized.length, 0);
    });

    test('should handle mixed absolute and relative paths', () => {
      const configPath = path.join(tempDir, 'config.json');
      const configUri = vscode.Uri.file(configPath);

      const absolutePath = path.join(tempDir, 'absolute.txt');

      const files: [string, string][] = [
        [absolutePath, './relative.txt']
      ];

      const normalized = normalizeFilesToSync(files, configUri);

      assert.strictEqual(normalized.length, 1);
      assert.strictEqual(normalized[0][0], absolutePath);
      assert.ok(path.isAbsolute(normalized[0][1]));
      assert.ok(normalized[0][1].includes('relative.txt'));
    });
  });

  suite('normalizeFolders', () => {
    test('should normalize relative folder paths', () => {
      const configPath = path.join(tempDir, 'config.json');
      const configUri = vscode.Uri.file(configPath);

      const folders: [string, string][] = [
        ['./folder1', './folder2'],
        ['src/subfolder', 'dest/subfolder']
      ];

      const normalized = normalizeFolders(folders, configUri);

      assert.strictEqual(normalized.length, 2);
      assert.ok(path.isAbsolute(normalized[0][0]));
      assert.ok(path.isAbsolute(normalized[0][1]));
      assert.ok(normalized[0][0].includes('folder1'));
      assert.ok(normalized[0][1].includes('folder2'));
    });

    test('should keep absolute folder paths unchanged', () => {
      const configPath = path.join(tempDir, 'config.json');
      const configUri = vscode.Uri.file(configPath);

      const absoluteFolder1 = path.join(tempDir, 'abs-folder1');
      const absoluteFolder2 = path.join(tempDir, 'abs-folder2');

      const folders: [string, string][] = [
        [absoluteFolder1, absoluteFolder2]
      ];

      const normalized = normalizeFolders(folders, configUri);

      assert.strictEqual(normalized.length, 1);
      assert.strictEqual(normalized[0][0], absoluteFolder1);
      assert.strictEqual(normalized[0][1], absoluteFolder2);
    });

    test('should skip invalid folder entries', () => {
      const configPath = path.join(tempDir, 'config.json');
      const configUri = vscode.Uri.file(configPath);

      const folders: [string, string][] = [
        ['', './folder2'],
        ['./folder3', '']
      ];

      const normalized = normalizeFolders(folders, configUri);

      assert.strictEqual(normalized.length, 0);
    });
  });
});
