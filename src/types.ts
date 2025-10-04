
export const APP_NAME = 'foldersync' as const;

export const SETTINGS_NAMES = {
  globalEnabled: 'globalEnabled',
  filesToSync: 'filePairs',
  folderPairs: 'folderPairs',
} as const;

export const DEFAULT_CONFIG_FILE_NAME = 'foldersync.config.json' as const;

export type FilePairsArray = [string, string][];
export type FolderPairsArray = [string, string][];

export type Settings = {
  [SETTINGS_NAMES.globalEnabled]: boolean;
  [SETTINGS_NAMES.filesToSync]: FilePairsArray;
  [SETTINGS_NAMES.folderPairs]: FolderPairsArray;
};

export type FsTreeElement = {
  name: string;
  type: 'pair' | 'container' | "folder" | 'folder-error';
  children?: FsTreeElement[];
};