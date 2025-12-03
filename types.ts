export enum SplitOrientation {
  Vertical = 'vertical',
  Horizontal = 'horizontal',
}

export interface SplitConfig {
  file: File | null;
  orientation: SplitOrientation;
  percentage: number; // 0 to 100
}

export interface ProcessingStatus {
  isProcessing: boolean;
  error: string | null;
  successMessage: string | null;
}