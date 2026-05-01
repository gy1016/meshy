export type ModelConversionStatus =
  | "idle"
  | "preparing"
  | "queued"
  | "running"
  | "success"
  | "error";

export interface ModelConversionState {
  isConverting: boolean;
  status: ModelConversionStatus;
  statusText: string;
  latestGlbUrl: string;
}
