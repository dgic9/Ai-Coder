
export interface GeneratedFile {
  path: string;
  content: string;
  language: string;
}

export interface ProjectBlueprint {
  projectName: string;
  description: string;
  files: GeneratedFile[];
  structure: string; // Tree representation
}

export enum AppView {
  HOME = 'HOME',
  HISTORY = 'HISTORY',
  SETTINGS = 'SETTINGS'
}

export interface HistoryItem {
  id: string;
  timestamp: number;
  projectName: string;
  blueprint: ProjectBlueprint;
}

export interface AppSettings {
  editorFontSize: number;
  wordWrap: boolean;
  syntaxHighlight: boolean;
  autoSave: boolean;
  showHidden: boolean;
  // Custom API Config
  useCustomApi: boolean;
  openRouterApiKey: string;
  customModelId: string;
}
