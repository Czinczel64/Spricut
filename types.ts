export interface Dimensions {
  width: number;
  height: number;
}

export interface Rect {
  x: number;
  y: number;
  width: number;
  height: number;
  path?: { x: number; y: number }[]; // Coordinates for the lasso polygon
}

export interface Color {
  r: number;
  g: number;
  b: number;
}

export interface SpriteConfig {
  mode: 'grid' | 'smart' | 'manual';
  rows: number;
  cols: number;
  // For grid mode fine-tuning (optional future expansion, keeping simple for now)
  padding: number;
  removeBackground: boolean;
  backgroundColor: Color | null; // The specific color to remove
  useCustomSize: boolean;
  customWidth: number;
  customHeight: number;
}

export interface ProcessedFrame {
  id: number;
  dataUrl: string;
  width: number;
  height: number;
  sourceRect: Rect;
}

export interface UploadedImage {
  src: string;
  file: File;
  originalWidth: number;
  originalHeight: number;
}