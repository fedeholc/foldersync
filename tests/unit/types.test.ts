import * as assert from 'assert';
import { APP_NAME, CONFIG_NAMES, DEFAULT_CONFIG_FILE_NAME } from '../../src/types/types';

suite('Types Test Suite', () => {

  test('APP_NAME should be defined', () => {
    assert.strictEqual(APP_NAME, 'foldersync');
  });

  test('CONFIG_NAMES should have folderPairs property', () => {
    assert.ok(CONFIG_NAMES.folderPairs);
    assert.strictEqual(CONFIG_NAMES.folderPairs, 'folders');
  });

  test('DEFAULT_CONFIG_FILE_NAME should be defined', () => {
    assert.strictEqual(DEFAULT_CONFIG_FILE_NAME, 'foldersync.config.json');
  });

  test('FilePairArray type should accept valid tuples', () => {
    // TypeScript compile-time check
    const validPairs: [string, string][] = [
      ['path1', 'path2'],
      ['path3', 'path4']
    ];
    assert.strictEqual(validPairs.length, 2);
  });

  test('FolderPairArray type should accept valid tuples', () => {
    // TypeScript compile-time check
    const validFolders: [string, string][] = [
      ['folder1', 'folder2'],
      ['folder3', 'folder4']
    ];
    assert.strictEqual(validFolders.length, 2);
  });
});
