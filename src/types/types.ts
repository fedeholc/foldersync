
export const APP_NAME = 'foldersync' as const;

export const CONFIG_NAMES = {
  folderPairs: 'folders',
} as const;

export const DEFAULT_CONFIG_FILE_NAME = 'foldersync.config.json' as const;

export type FilePairArray = [string, string][];
export type FolderPairArray = [string, string][];

/* export type Settings = {
  [SETTINGS_NAMES.globalEnabled]: boolean;
  [SETTINGS_NAMES.filesToSync]: FilePairArray;
  [SETTINGS_NAMES.folderPairs]: FolderPairArray;
}; */

export type FsTreeElement = {
  name: string;
  type: 'pair' | 'container' | "folder" | 'folder-error';
  /** Optional stable id for the element to ensure uniqueness across the tree */
  id?: string;
  children?: FsTreeElement[];
};

export type ConfigFile = {
  folders: FolderPairArray;
}


export type FilePairMap = Map<string, string>;
