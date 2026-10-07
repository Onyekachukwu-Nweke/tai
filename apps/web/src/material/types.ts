export interface MaterialSection {
  location: number;
  text: string;
}

export interface MaterialChunk extends MaterialSection {
  id: string;
  documentId: string;
  start: number;
  end: number;
}

export interface MaterialPreview {
  schemaVersion: 1;
  documentId: string;
  filename: string;
  format: "pdf" | "txt";
  sections: MaterialSection[];
  chunks: MaterialChunk[];
  warnings: string[];
}

export interface ExtractionOptions {
  documentId: string;
  signal?: AbortSignal;
  onProgress?: (progress: { completed: number; total: number }) => void;
}

export class MaterialError extends Error {
  constructor(
    public readonly code: string,
    message: string,
  ) {
    super(message);
    this.name = "MaterialError";
  }
}

export const MATERIAL_LIMITS = {
  bytes: 10_000_000,
  pages: 50,
  characters: 500_000,
  chunks: 500,
  chunkCharacters: 2000,
} as const;

export function checkCancelled(signal?: AbortSignal): void {
  if (signal?.aborted)
    throw new MaterialError(
      "cancelled",
      "Material preview cancelled. Choose a file to try again.",
    );
}
