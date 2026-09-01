
export enum MediaType {
  IMAGE = 'image',
  VIDEO = 'video',
  AUDIO = 'audio'
}

export interface Artifact {
  label: string;
  description: string;
  location?: string;
  severity: 'low' | 'medium' | 'high';
}

export interface GroundingSource {
  title: string;
  uri: string;
}

export interface ForensicReport {
  isAIGenerated: boolean;
  authenticityScore: number; // 0 to 100
  reasoning: string;
  justification: string; // Brief user-facing explanation
  detectedArtifacts: Artifact[];
  metadataInconsistencies: string[];
  verdict: string;
  generatorTool?: string; // e.g., "Midjourney", "DALL-E 3", "ElevenLabs"
  attributionConfidence?: number; // 0 to 100
}

export interface AnalysisState {
  isLoading: boolean;
  error: string | null;
  report: ForensicReport | null;
  previewUrl: string | null;
  currentFile: File | null;
}
