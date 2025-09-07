
export const APP_NAME = 'filesync' as const;

export const SETTINGS_NAMES = {
  globalEnabled: 'globalEnabled',
  filesToSync: 'filesToSync'
} as const;

export const DEFAULT_CONFIG_FILE_NAME = 'filesync.config.json' as const;

export type SettingsFilesToSync = [string, string][];
export type Settings = {
  [SETTINGS_NAMES.globalEnabled]: boolean;
  [SETTINGS_NAMES.filesToSync]: SettingsFilesToSync;
}