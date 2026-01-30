export interface RepoInfo {
  path: string;
  oldUrl: string;
  newUrl: string;
  matched: boolean;
}

export interface ScanResult {
  totalDirs: number;
  repoCount: number;
  repos: RepoInfo[];
}

export interface ReplaceResult {
  success: boolean;
  path: string;
  oldUrl: string;
  newUrl: string;
  error?: string;
}

export interface ReplaceProgress {
  current: number;
  total: number;
  currentRepo: string;
  message: string;
}

export interface AppState {
  workDir: string;
  oldDomain: string;
  newDomain: string;
  scanResult: ScanResult | null;
  isScanning: boolean;
  isReplacing: boolean;
  replaceProgress: ReplaceProgress | null;
  logs: string[];
}
